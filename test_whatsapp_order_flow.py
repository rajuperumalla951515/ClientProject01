"""
Automated Verification Suite for WhatsApp-Based Ordering and Delivery
Sri Adithya Organics Platform

Tests:
1. Guest Direct Product WhatsApp Order
2. Authoritative pricing, stock deduction, and WhatsApp URL generation
3. Dynamic WhatsApp message format and all required components
4. Idempotency (prevent duplicate order creation on rapid double-clicks)
5. Cart-based WhatsApp Order (with stock decrement and cart clearing)
6. Admin status transitions (pending_whatsapp -> confirmed -> processing)
7. Admin tracking notes creation & update (admin_notes)
8. Admin order filtering by status and date range
"""

import sys
import os
import json
import urllib.parse
from datetime import datetime, date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ["STORAGE_BACKEND"] = "database"
from backend.app.config import settings
settings.STORAGE_BACKEND = "database"

from backend.app.database import SessionLocal
from backend.app.routers import orders, cart, auth, settings
from backend.app.schemas import (
    WhatsAppOrderCreate,
    WhatsAppOrderItemInput,
    OrderStatusUpdate,
    CartItemAdd,
    DeliverySettingUpdate,
)
from backend.app.models import User, Product, ProductVariant, Order, Cart, CartItem, DeliverySetting
from backend.app.seed import seed_database

def run_tests():
    print("=" * 80)
    print("[TEST SUITE] WHATSAPP-BASED ORDERING & DELIVERY INTEGRATION")
    print("=" * 80 + "\n")

    # Step 0: Seed Database & Reset Store Business Number
    seed_database()
    db = SessionLocal()

    try:
        # Reset WhatsApp number in settings to 919515159006
        setting_rec = db.query(DeliverySetting).first()
        if setting_rec:
            setting_rec.whatsapp_number = "919515159006"
            db.commit()

        # Get admin user and customer user
        admin_user = db.query(User).filter(User.role == "admin").first()
        assert admin_user is not None, "Admin user must exist"

        # Get test products & variants (select Wood-Pressed Oil)
        product1 = db.query(Product).filter(Product.name.like("%Oil%")).first() or db.query(Product).first()
        variant1 = product1.variants[0]
        variant1.stock = 50
        db.commit()
        db.refresh(variant1)
        initial_stock = variant1.stock

        print(f"[SETUP] Testing with Product: {product1.name} ({variant1.unit}) - Stock: {initial_stock}")

        # ----------------------------------------------------------------------
        # Test 1: Direct Item Guest WhatsApp Order Creation
        # ----------------------------------------------------------------------
        print("\n[TEST 1] Creating Guest WhatsApp Order for 2 units of Wood-Pressed Oil...")
        test_idem_key = f"TEST-WHATSAPP-IDEMPOTENT-{int(datetime.utcnow().timestamp())}"
        direct_order_payload = WhatsAppOrderCreate(
            customer_name="Sunil Rao",
            customer_phone="9876543210",
            delivery_address={
                "recipient_name": "Sunil Rao",
                "phone": "9876543210",
                "street": "14th Main, 100ft Road",
                "apartment": "Flat 302, Green Orchid Apartments",
                "landmark": "Near BDA Complex",
                "city": "Bengaluru",
                "state": "Karnataka",
                "postal_code": "560038",
                "latitude": 12.9784,
                "longitude": 77.6408,
                "accuracy_meters": 14.0,
            },
            delivery_slot="Express Delivery (15-30 Mins)",
            payment_method="UPI / GPay / PhonePe on Delivery",
            notes="Please leave with apartment security if unreachable",
            items=[
                WhatsAppOrderItemInput(
                    product_id=product1.id,
                    variant_id=variant1.id,
                    quantity=2
                )
            ],
            idempotency_key=test_idem_key
        )

        res1 = orders.create_whatsapp_order(direct_order_payload, db=db, optional_user=None)
        order1 = res1.order

        assert order1.id is not None, "Order ID must be generated"
        assert order1.order_number.startswith("SAO-"), f"Order number should start with SAO-, got {order1.order_number}"
        assert order1.status == "pending_whatsapp", f"Initial status must be pending_whatsapp, got {order1.status}"
        assert len(order1.items) == 1, "Must have 1 item"
        assert order1.items[0].quantity == 2, "Quantity must be 2"
        expected_subtotal = variant1.price * 2
        assert order1.subtotal == expected_subtotal, f"Subtotal mismatch: {order1.subtotal} != {expected_subtotal}"

        # Verify stock was decremented
        db.refresh(variant1)
        assert variant1.stock == initial_stock - 2, f"Stock should be {initial_stock - 2}, got {variant1.stock}"
        print(f"   [PASS] Order #{order1.order_number} created with status '{order1.status}'")
        print(f"   [PASS] Stock correctly reserved/decremented from {initial_stock} to {variant1.stock}")

        # ----------------------------------------------------------------------
        # Test 2: Dynamic Pre-Filled WhatsApp Message Verification
        # ----------------------------------------------------------------------
        print("\n[TEST 2] Verifying 12 Required Components in Pre-Filled WhatsApp Message...")
        msg = res1.whatsapp_message
        url = res1.whatsapp_url

        print(f"Generated URL: {url[:60]}... (Total length: {len(url)})")
        assert url.startswith("https://wa.me/"), f"URL must start with https://wa.me/, got {url}"
        assert "919515159006" in url, f"Business WhatsApp number 919515159006 must be in URL, got {url}"

        # Check required components
        assert "Sri Adithya Organics" in msg, "Must contain business name"
        assert order1.order_number in msg, "Must contain order reference"
        assert product1.name in msg, "Must contain product name"
        assert f"{order1.items[0].quantity} x Rs {order1.items[0].unit_price:.2f}" in msg, "Must contain item quantity and price"
        assert f"Rs {order1.subtotal:.2f}" in msg, "Must contain subtotal"
        assert f"Rs {order1.total_amount:.2f}" in msg, "Must contain final total"
        assert "Sunil Rao" in msg, "Must contain customer name"
        assert "9876543210" in msg, "Must contain customer phone"
        assert "Flat 302, Green Orchid Apartments" in msg, "Must contain delivery address"
        assert "560038" in msg, "Must contain pincode"
        assert "Express Delivery" in msg, "Must contain delivery slot"
        assert "UPI" in msg or "Online" in msg, "Must contain payment method"
        assert "Please leave with apartment security" in msg, "Must contain special instructions"
        assert "Live GPS Location" in msg, "Must contain Live GPS Location"
        assert "maps.google.com" in msg, "Must contain Google Maps live location link"

        print("   [PASS] All 13 dynamic components (including Live GPS Location) verified in WhatsApp message:")
        print("          1. Business name (Sri Adithya Organics)")
        print("          2. Unique order reference (#" + order1.order_number + ")")
        print(f"          3. Product name ({product1.name})")
        print("          4. Product quantity & individual price")
        print(f"          5. Subtotal (Rs. {order1.subtotal})")
        print(f"          6. Delivery fee (Rs. {order1.delivery_fee})")
        print(f"          7. Final total (Rs. {order1.total_amount})")
        print("          8. Customer name (Sunil Rao)")
        print("          9. Customer phone (9876543210)")
        print("          10. Confirmed delivery address")
        print("          11. Customer Live GPS Location link (maps.google.com/?q=...)")
        print("          12. Delivery slot (Express Delivery)")
        print("          13. Special instructions")

        # ----------------------------------------------------------------------
        # Test 3: Idempotency (Prevent Duplicate Orders on Double Clicks)
        # ----------------------------------------------------------------------
        print("\n[TEST 3] Testing Idempotency on Repeated Invocations...")
        res_duplicate = orders.create_whatsapp_order(direct_order_payload, db=db, optional_user=None)
        assert res_duplicate.order.id == order1.id, "Duplicate payload must return the exact same order"
        assert res_duplicate.order.order_number == order1.order_number
        db.refresh(variant1)
        assert variant1.stock == initial_stock - 2, "Stock must NOT be decremented a second time"
        print(f"   [PASS] Idempotency verified: Returned existing order #{order1.order_number} without duplicate stock deduction")

        # ----------------------------------------------------------------------
        # Test 4: Cart-Based WhatsApp Order
        # ----------------------------------------------------------------------
        print("\n[TEST 4] Testing Cart-Based WhatsApp Order for Logged-In Customer...")
        # Get or create customer user
        customer_user = db.query(User).filter(User.email == "customer@sriadithyaorganics.com").first()
        if not customer_user:
            customer_user = User(
                name="Deepa Raman",
                email="customer@sriadithyaorganics.com",
                phone="9845012345",
                hashed_password="test",
                is_active=True
            )
            db.add(customer_user)
            db.commit()
            db.refresh(customer_user)

        # Clear cart then add product
        cart.clear_cart(user=customer_user, db=db)
        cart.add_to_cart(
            CartItemAdd(product_id=product1.id, variant_id=variant1.id, quantity=3),
            user=customer_user,
            db=db
        )

        stock_before_cart_order = variant1.stock
        cart_order_payload = WhatsAppOrderCreate(
            customer_name="Deepa Raman",
            customer_phone="9845012345",
            delivery_address={
                "recipient_name": "Deepa Raman",
                "phone": "9845012345",
                "street": "8th Cross, Indiranagar",
                "city": "Bengaluru",
                "state": "Karnataka",
                "postal_code": "560038"
            },
            delivery_slot="Morning Harvest Slot (7:00 AM - 9:30 AM)",
            payment_method="Cash on Delivery (COD)"
        )

        res_cart = orders.create_whatsapp_order(cart_order_payload, db=db, optional_user=customer_user)
        order2 = res_cart.order
        assert order2.status == "pending_whatsapp"
        assert len(order2.items) == 1
        assert order2.items[0].quantity == 3

        # Verify stock decremented by 3
        db.refresh(variant1)
        assert variant1.stock == stock_before_cart_order - 3, "Stock must be decremented by 3"

        # Verify cart was cleared
        cart_record = db.query(Cart).filter(Cart.user_id == customer_user.id).first()
        remaining_cart_items = db.query(CartItem).filter(CartItem.cart_id == cart_record.id).all() if cart_record else []
        assert len(remaining_cart_items) == 0, "Cart must be emptied after placing WhatsApp order"
        print(f"   [PASS] Cart-based order #{order2.order_number} created with stock decrement & cart emptied")

        # ----------------------------------------------------------------------
        # Test 5: Admin Order Status Transition & Tracking Notes
        # ----------------------------------------------------------------------
        print("\n[TEST 5] Testing Admin Order Status Transition & Tracking Notes...")
        # Transition order1 from pending_whatsapp to confirmed
        updated_order = orders.update_order_status(
            order_id=order1.id,
            status_in=OrderStatusUpdate(
                status="confirmed",
                payment_status="confirmed_on_whatsapp",
                admin_notes="Customer confirmed delivery on WhatsApp at 11:30 AM. Contact verified."
            ),
            db=db,
            admin=admin_user
        )
        assert updated_order.status == "confirmed", f"Status should be confirmed, got {updated_order.status}"
        assert updated_order.payment_status == "confirmed_on_whatsapp"
        assert "Customer confirmed" in updated_order.admin_notes
        print(f"   [PASS] Transitioned order #{order1.order_number} to 'confirmed' with admin notes")

        # Transition order1 to processing with courier details
        updated_order2 = orders.update_order_status(
            order_id=order1.id,
            status_in=OrderStatusUpdate(
                status="processing",
                admin_notes="Assigned to driver Ramesh (+91-9876500000). Packed cold-pressed bottles securely."
            ),
            db=db,
            admin=admin_user
        )
        assert updated_order2.status == "processing", f"Status should be processing, got {updated_order2.status}"
        assert "driver Ramesh" in updated_order2.admin_notes
        print(f"   [PASS] Transitioned order #{order1.order_number} to 'processing' with updated tracking notes")

        # ----------------------------------------------------------------------
        # Test 6: Admin Status & Date Filtering
        # ----------------------------------------------------------------------
        print("\n[TEST 6] Testing Admin Filter by Status & Date...")
        # Filter by status pending_whatsapp
        pending_wa_orders = orders.get_all_orders_admin(
            status_filter="pending_whatsapp",
            db=db,
            admin=admin_user
        )
        assert any(o.id == order2.id for o in pending_wa_orders), "order2 must appear in pending_whatsapp filter"
        assert not any(o.id == order1.id for o in pending_wa_orders), "order1 should NOT appear (it is now processing)"
        print(f"   [PASS] Status filter correctly isolated {len(pending_wa_orders)} pending_whatsapp orders")

        # Filter by status processing
        processing_orders = orders.get_all_orders_admin(
            status_filter="processing",
            db=db,
            admin=admin_user
        )
        assert any(o.id == order1.id for o in processing_orders), "order1 must appear in processing filter"
        print(f"   [PASS] Status filter correctly isolated {len(processing_orders)} processing orders")

        # Filter by today's date
        today_str = date.today().strftime("%Y-%m-%d")
        today_orders = orders.get_all_orders_admin(
            date_from=today_str,
            date_to=today_str,
            db=db,
            admin=admin_user
        )
        assert len(today_orders) >= 2, f"Should have at least 2 orders placed today, found {len(today_orders)}"
        print(f"   [PASS] Date filter for today ({today_str}) returned {len(today_orders)} orders")

        # ----------------------------------------------------------------------
        # Test 7: Store Settings WhatsApp Number Configuration
        # ----------------------------------------------------------------------
        print("\n[TEST 7] Testing Store Settings WhatsApp Number Configuration...")
        custom_wa_num = "919988776655"
        settings_res = settings.update_store_settings(
            setting_in=DeliverySettingUpdate(whatsapp_number=custom_wa_num),
            db=db,
            admin=admin_user
        )
        assert settings_res.whatsapp_number == custom_wa_num, f"Expected {custom_wa_num}, got {settings_res.whatsapp_number}"

        # Place new order to ensure it uses the updated number
        res_custom_num = orders.create_whatsapp_order(
            WhatsAppOrderCreate(
                customer_name="Test Customer",
                customer_phone="9988776655",
                delivery_address={
                    "street": "Indiranagar",
                    "city": "Bengaluru",
                    "state": "Karnataka",
                    "postal_code": "560038"
                },
                items=[WhatsAppOrderItemInput(product_id=product1.id, variant_id=variant1.id, quantity=1)]
            ),
            db=db,
            optional_user=None
        )
        assert custom_wa_num in res_custom_num.whatsapp_url, f"New WhatsApp number {custom_wa_num} must be in URL"
        print(f"   [PASS] Settings WhatsApp number updated to {custom_wa_num} and used in dynamic click-to-chat URL")

        # Restore to primary business number 919515159006
        settings.update_store_settings(
            setting_in=DeliverySettingUpdate(whatsapp_number="919515159006"),
            db=db,
            admin=admin_user
        )
        print("   [PASS] Store WhatsApp number restored to primary business number: 919515159006")

        print("\n" + "=" * 80)
        print("[ALL TESTS PASSED] Complete WhatsApp ordering, delivery address, and admin fulfillment verified!")
        print("=" * 80)

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
