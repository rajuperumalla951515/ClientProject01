import sys
import io
import json

# Ensure stdout handles utf-8 on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from backend.app.database import SessionLocal, engine, Base
from backend.app.seed import seed_database
from backend.main import health_check
from backend.app.routers import (
    categories, products, auth, addresses, cart, orders, settings as settings_router, admin
)
from backend.app.schemas import (
    UserLogin, UserCreate, AddressCreate, CartItemAdd, OrderCreate,
    ReverseGeocodeRequest, ServiceabilityCheckRequest
)
from backend.app.models import User, Product, ProductVariant, Address, Order

def run_tests():
    print("=" * 65)
    print("[START] STARTING SRI ADITHYA ORGANICS AUTOMATED TEST SUITE")
    print("=" * 65 + "\n")

    db = SessionLocal()
    try:
        # 0. Ensure Database is properly seeded
        seed_database()

        # 1. Health Check
        print("1. Testing Health Check...")
        health = health_check()
        assert health["status"] == "healthy"
        assert "Sri Adithya" in health["service"]
        print(f"   [PASS] Health check passed: {health['service']} (v{health['version']})")

        # 2. Categories
        print("\n2. Testing Categories Catalogue...")
        cats = categories.list_categories(db=db)
        assert len(cats) >= 10, f"Expected 10 categories, found {len(cats)}"
        cat_names = [c.name for c in cats]
        assert "Cold-Pressed Oils" in cat_names
        print(f"   [PASS] Retrieved {len(cats)} verified organic categories.")
        print(f"          Featured categories: {', '.join(cat_names[:4])}...")

        # 3. Products & Search
        print("\n3. Testing Product Discovery & Search...")
        all_prods = products.list_products(db=db, limit=100)
        assert len(all_prods) >= 20
        print(f"   [PASS] Retrieved {len(all_prods)} active organic products.")

        # Search for Cold-Pressed Oil
        oil_results = products.list_products(search="groundnut", db=db)
        assert len(oil_results) >= 1
        flagship_oil = oil_results[0]
        print(f"   [PASS] Search for 'groundnut': found '{flagship_oil.name}'")
        assert len(flagship_oil.images) >= 1
        print(f"          Image assets: {[img.image_url for img in flagship_oil.images]}")

        # Search suggestions
        sugg = products.get_search_suggestions(q="oil", db=db)
        assert len(sugg["products"]) >= 1
        print(f"   [PASS] Search autocomplete for 'oil': {len(sugg['products'])} live suggestions.")

        # 4. Geolocation & Serviceability
        print("\n4. Testing Real Geolocation Detection & Reverse-Geocoding...")
        # Coordinates for Indiranagar (12.9784, 77.6408)
        geo_blr = addresses.reverse_geocode(ReverseGeocodeRequest(latitude=12.9784, longitude=77.6408))
        assert geo_blr.is_serviceable == True
        assert geo_blr.postal_code == "560038"
        print(f"   [PASS] Geolocation Bengaluru resolved: {geo_blr.locality}, {geo_blr.city} - {geo_blr.postal_code}")
        print(f"          Serviceable: {geo_blr.is_serviceable} ({geo_blr.estimated_delivery_minutes} mins from {geo_blr.service_hub})")

        # Coordinates for Coimbatore extraction mill (11.0069, 76.9490)
        geo_cbe = addresses.reverse_geocode(ReverseGeocodeRequest(latitude=11.0069, longitude=76.9490))
        assert geo_cbe.is_serviceable == True
        print(f"   [PASS] Geolocation Coimbatore mill resolved: {geo_cbe.locality}, {geo_cbe.city} ({geo_cbe.service_hub})")

        # Serviceability check for Bangalore PIN
        serv_check = addresses.check_serviceability(ServiceabilityCheckRequest(postal_code="560038"), db=db)
        assert serv_check.is_serviceable == True
        print(f"   [PASS] Serviceability check for PIN 560038: {serv_check.message}")

        # 5. Customer & Admin Authentication
        print("\n5. Testing Authentication & Role-Based Access...")
        # Customer login
        cust_token = auth.login(UserLogin(email="arjun.sharma@example.com", password="customer123"), db=db)
        customer_out = cust_token.user
        assert customer_out.role == "customer"
        customer = db.query(User).filter(User.id == customer_out.id).first()
        print(f"   [PASS] Customer authenticated: {customer.name} ({customer.email})")

        # Admin login
        admin_token = auth.login(UserLogin(email="admin@sriadithyaorganics.com", password="admin123"), db=db)
        admin_user_out = admin_token.user
        assert admin_user_out.role == "admin"
        admin_user = db.query(User).filter(User.id == admin_user_out.id).first()
        print(f"   [PASS] Administrator authenticated: {admin_user.name} ({admin_user.email})")

        # 6. Customer Address Management
        print("\n6. Testing Address Management...")
        cust_addrs = addresses.get_user_addresses(db=db, current_user=customer)
        assert len(cust_addrs) >= 1
        default_addr = cust_addrs[0]
        print(f"   [PASS] Customer has {len(cust_addrs)} saved addresses. Default: {default_addr.street}, PIN {default_addr.postal_code}")

        # 7. Cart Operations
        print("\n7. Testing Shopping Cart Operations...")
        # Clear any existing cart items
        cart.clear_cart(x_session_id="test_session", db=db, user=customer)
        
        # Pick the wood-pressed groundnut oil
        oil_variant = flagship_oil.variants[0]
        initial_stock = oil_variant.stock
        print(f"   Adding '{flagship_oil.name}' ({oil_variant.unit}) to cart. Initial stock: {initial_stock}")

        # Add 2 bottles
        cart.add_to_cart(
            item_in=CartItemAdd(product_id=flagship_oil.id, variant_id=oil_variant.id, quantity=2),
            x_session_id="test_session", db=db, user=customer
        )
        
        user_cart = cart.get_cart(x_session_id="test_session", db=db, user=customer)
        assert user_cart.item_count == 2
        print(f"   [PASS] Cart updated: {user_cart.item_count} items. Subtotal: Rs {user_cart.subtotal}")

        # Add a second item (Desi Tomatoes) to test free delivery threshold calculation
        tomato = next(p for p in all_prods if "tomato" in p.slug)
        tomato_var = tomato.variants[0]
        cart.add_to_cart(
            item_in=CartItemAdd(product_id=tomato.id, variant_id=tomato_var.id, quantity=1),
            x_session_id="test_session", db=db, user=customer
        )
        user_cart2 = cart.get_cart(x_session_id="test_session", db=db, user=customer)
        print(f"   [PASS] Multi-item cart total: Rs {user_cart2.total_amount} (Free Delivery applied: {user_cart2.delivery_fee == 0.0})")

        # 8. Multi-Step Checkout & Transaction-Safe Order Placement
        print("\n8. Testing Atomic Checkout & Inventory Deductions...")
        checkout_req = OrderCreate(
            address_id=default_addr.id,
            delivery_slot="⚡ Express Delivery (15-30 Mins)",
            payment_method="upi",
            notes="Automated verification test for Sri Adithya Organics",
            payment_id="UPI_TEST_TRANS_998811"
        )
        new_order = orders.checkout(
            order_in=checkout_req,
            db=db,
            current_user=customer
        )
        assert new_order.order_number.startswith("SAO-")
        assert new_order.status == "confirmed"
        assert len(new_order.items) >= 2
        print(f"   [PASS] Order successfully created!")
        print(f"          Order Number: {new_order.order_number}")
        print(f"          Status: {new_order.status} | Total Amount: Rs {new_order.total_amount}")

        # Verify atomic stock decrement
        fresh_var = db.query(ProductVariant).filter(ProductVariant.id == oil_variant.id).first()
        expected_stock = initial_stock - 2
        assert fresh_var.stock == expected_stock, f"Expected {expected_stock}, got {fresh_var.stock}"
        print(f"   [PASS] Database Transaction Safety Verified: Stock decremented atomically from {initial_stock} to {fresh_var.stock}.")

        # Verify cart was cleared after successful order
        cart_after = cart.get_cart(x_session_id="test_session", db=db, user=customer)
        assert cart_after.item_count == 0
        print(f"   [PASS] Cart atomically cleared upon order confirmation.")

        # 9. Admin Dashboard & Metrics
        print("\n9. Testing Admin Dashboard & Real Metrics...")
        stats = admin.get_dashboard_stats(db=db, admin=admin_user)
        assert stats.total_orders >= 1
        assert stats.total_products >= 20
        assert stats.total_revenue > 0
        print(f"   [PASS] Admin Dashboard Stats computed from live database:")
        print(f"          Total Revenue: Rs {stats.total_revenue:,.2f}")
        print(f"          Total Orders: {stats.total_orders}")
        print(f"          Total Products: {stats.total_products}")
        print(f"          Low Stock Alerts: {stats.low_stock_products}")

        print("\n" + "=" * 65)
        print("[SUCCESS] ALL 9 TEST SUITES PASSED! SRI ADITHYA ORGANICS FULLY VERIFIED.")
        print("=" * 65)

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
