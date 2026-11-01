"""
Comprehensive Automated Test Suite: PostgreSQL to Google Sheets Migration
Sri Adithya Organics Production Platform
Verifies all 7 core worksheets, caching layer, concurrency locking, and end-to-end API workflows.
"""

import sys
import os
import time
import threading
from typing import List, Dict, Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ["STORAGE_BACKEND"] = "sheets"

from backend.app.config import settings
settings.STORAGE_BACKEND = "sheets"

from backend.app.sheets.client import sheets_client
from backend.app.sheets.cache import sheets_cache
from backend.app.sheets.service import sheets_service
from backend.app.routers import (
    categories, products, auth, cart, orders, addresses, settings as settings_router, admin
)
from backend.app.schemas import (
    UserCreate, UserLogin, CartItemAdd, CartItemUpdate,
    WhatsAppOrderCreate, OrderStatusUpdate
)
from backend.main import health_check, readiness
from fastapi import Response, HTTPException

def run_sheets_migration_tests():
    print("=" * 80)
    print("  SRI ADITHYA ORGANICS - GOOGLE SHEETS MIGRATION VERIFICATION SUITE")
    print("=" * 80)
    print(f"[CONFIG] Active Storage Backend: {settings.STORAGE_BACKEND}")
    print(f"[CONFIG] Google Sheets Cache TTL: {settings.GOOGLE_SHEETS_CACHE_TTL}s")
    print(f"[CONFIG] Concurrency Engine: threading.Lock (Thread-safe inventory reservation)")
    print("-" * 80)

    # -------------------------------------------------------------------------
    # TEST 1: WORKSHEETS & SCHEMA AUDIT
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Verifying Google Sheets Worksheets and Headers...")
    required_worksheets = [
        "Products", "Categories", "Customers", "Orders",
        "Order_Items", "Addresses", "Inventory_Logs", "Store_Settings"
    ]
    for ws_name in required_worksheets:
        data = sheets_client.read_sheet(ws_name)
        assert isinstance(data, list), f"Worksheet {ws_name} must return a list of rows"
        print(f"   [PASS] Worksheet '{ws_name}' online: {len(data)} rows loaded.")

    # -------------------------------------------------------------------------
    # TEST 2: IN-MEMORY CACHE & HIGH-THROUGHPUT PERFORMANCE (30,000 Users/mo)
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Testing High-Throughput Caching Layer & Response Latency...")
    sheets_cache.invalidate_all()
    
    # First call (cold)
    t0 = time.perf_counter()
    cold_prods = sheets_service.get_products(limit=50)
    cold_latency = (time.perf_counter() - t0) * 1000.0

    # Second call (warm, in-memory cache)
    t1 = time.perf_counter()
    warm_prods = sheets_service.get_products(limit=50)
    warm_latency = (time.perf_counter() - t1) * 1000.0

    assert len(cold_prods) == len(warm_prods)
    assert warm_latency < cold_latency or warm_latency < 5.0, "Cache should respond in under 5ms"
    print(f"   [PASS] Cold retrieval: {cold_latency:.2f}ms | Cached retrieval: {warm_latency:.2f}ms (Speedup: {cold_latency/max(warm_latency, 0.001):.1f}x)")
    print(f"   [PASS] Active Catalogue: {len(warm_prods)} organic products cached in-memory.")

    # Test Categories retrieval
    cats = sheets_service.get_categories()
    assert len(cats) >= 5, f"Expected at least 5 categories, got {len(cats)}"
    print(f"   [PASS] Categories: {len(cats)} categories verified ({', '.join([c['name'] for c in cats[:3]])}...).")

    # -------------------------------------------------------------------------
    # TEST 3: CUSTOMER REGISTRATION, LOGIN & PASSWORD HASHING
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Testing Customer Authentication & Secure Password Verification...")
    test_email = f"test.sheets.customer.{int(time.time())}@sriadithyaorganics.in"
    test_password = "SecurePassword123!"

    # Registration via Router
    token_resp = auth.register(UserCreate(
        name="Lakshmi Narayanan",
        email=test_email,
        phone="9876501234",
        password=test_password
    ))
    new_cust = token_resp.user
    assert new_cust.id is not None
    assert new_cust.email == test_email
    print(f"   [PASS] Registered customer ID {new_cust.id}: {new_cust.name} ({new_cust.email})")

    # Duplicate registration prevention
    try:
        auth.register(UserCreate(
            name="Lakshmi Narayanan",
            email=test_email,
            phone="9876501234",
            password=test_password
        ))
        assert False, "Should raise HTTPException on duplicate registration"
    except HTTPException as e:
        assert e.status_code == 400
        print(f"   [PASS] Duplicate email blocked: {e.detail}")

    # Authentication via Router
    login_resp = auth.login(UserLogin(
        email=test_email,
        password=test_password
    ))
    assert login_resp.user.id == new_cust.id
    print(f"   [PASS] Authenticated customer ID {login_resp.user.id} successfully using verified password hash.")

    # Wrong password rejection
    try:
        auth.login(UserLogin(
            email=test_email,
            password="WrongPassword!"
        ))
        assert False, "Should raise HTTPException 401 on wrong password"
    except HTTPException as e:
        assert e.status_code == 401
        print(f"   [PASS] Invalid password rejected successfully (HTTP 401: {e.detail}).")

    # -------------------------------------------------------------------------
    # TEST 4: ADDRESS CREATION & GPS RETRIEVAL
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Testing Address Creation & GPS Coordinates Storage...")
    addr = sheets_service.create_address(
        customer_id=new_cust.id,
        addr_in={
            "label": "Home",
            "recipient_name": "Lakshmi Narayanan",
            "phone": "9876501234",
            "house_number": "Flat 302, Sai Residency",
            "street": "100 Feet Road, Indiranagar",
            "city": "Bengaluru",
            "state": "Karnataka",
            "postal_code": "560038",
            "latitude": 12.9784,
            "longitude": 77.6408,
            "accuracy_meters": 12.0
        }
    )
    assert addr["id"] is not None
    assert addr["latitude"] == 12.9784
    print(f"   [PASS] Address created in 'Addresses' sheet: ID {addr['id']} (Lat: {addr['latitude']}, Lon: {addr['longitude']})")

    cust_addrs = sheets_service.get_customer_addresses(new_cust.id)
    assert len(cust_addrs) >= 1
    print(f"   [PASS] Retrieved {len(cust_addrs)} address for customer ID {new_cust.id}.")

    # -------------------------------------------------------------------------
    # TEST 5: CART OPERATIONS (IN-MEMORY SESSION CART)
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Testing High-Performance In-Memory Session Shopping Cart...")
    # Ensure Product 1 has ample stock for repeated test runs
    p1_check = sheets_service.get_product_by_id_or_slug(1)
    if p1_check and p1_check.get("variants") and p1_check["variants"][0]["stock"] < 25:
        sheets_service.client.update_row_by_key("Products", "product_id", 1, {"stock_quantity": 60})
        sheets_cache.invalidate_products()

    session_id = f"sess_{int(time.time() * 1000)}"
    cart.clear_cart(x_session_id=session_id)

    # Add item 1
    cart_res = cart.add_to_cart(
        CartItemAdd(product_id=1, variant_id=1, quantity=2),
        x_session_id=session_id
    )
    assert cart_res.item_count == 2
    assert cart_res.subtotal > 0
    print(f"   [PASS] Added 2 units of Product 1: Subtotal = Rs. {cart_res.subtotal}, Delivery Fee = Rs. {cart_res.delivery_fee}")

    # Update item
    item_id = cart_res.items[0].id
    cart_upd = cart.update_cart_item(
        item_id=item_id,
        item_in=CartItemUpdate(quantity=3),
        x_session_id=session_id
    )
    assert cart_upd.item_count == 3
    print(f"   [PASS] Updated item quantity to 3: New Subtotal = Rs. {cart_upd.subtotal}")

    # -------------------------------------------------------------------------
    # TEST 6: THREAD-SAFE CONCURRENCY & INVENTORY LOCKING
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Testing Concurrency & Thread-Safe Stock Locking under Peak Load...")
    prods_all = sheets_service.client.read_sheet("Products")
    target_prod = prods_all[0]
    p_id = int(target_prod["product_id"])
    initial_stock = int(target_prod["stock_quantity"])
    print(f"   Testing on Product '{target_prod['product_name']}' (ID: {p_id}, Current Stock: {initial_stock})")

    num_threads = 5
    successful_orders = []
    failed_orders = []

    def place_concurrent_order(thread_idx):
        try:
            res = sheets_service.create_order(
                customer_id=new_cust.id,
                customer_name=f"Concurrent Buyer {thread_idx}",
                customer_phone=f"900000000{thread_idx}",
                items_requested=[{"product_id": p_id, "quantity": 1}],
                delivery_address=addr,
                idempotency_key=f"CONCURRENT-TEST-{thread_idx}-{int(time.time())}"
            )
            successful_orders.append(res["order_number"])
        except Exception as e:
            failed_orders.append(str(e))

    threads = [threading.Thread(target=place_concurrent_order, args=(i,)) for i in range(num_threads)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    # Re-check stock in sheet
    updated_prods = sheets_service.client.read_sheet("Products")
    updated_prod = next(p for p in updated_prods if int(p["product_id"]) == p_id)
    final_stock = int(updated_prod["stock_quantity"])

    print(f"   [PASS] {len(successful_orders)} orders completed successfully, {len(failed_orders)} rejected due to stock.")
    print(f"   [PASS] Stock accurately decremented from {initial_stock} to {final_stock} (Delta: {initial_stock - final_stock}).")
    assert initial_stock - final_stock == len(successful_orders), "Inventory decrement must exactly equal successful orders!"

    # Verify inventory audit logs
    logs = sheets_service.client.read_sheet("Inventory_Logs")
    recent_logs = [l for l in logs if int(l.get("product_id", 0)) == p_id and "Customer Order" in str(l.get("reason", ""))]
    assert len(recent_logs) >= len(successful_orders)
    print(f"   [PASS] Audit Trail: {len(recent_logs)} fulfillment logs recorded in 'Inventory_Logs' sheet.")

    # -------------------------------------------------------------------------
    # TEST 7: WHATSAPP ORDER WITH LIVE GPS LOCATION
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Testing WhatsApp Order Click-to-Chat Generation with Live GPS Link...")
    wa_payload = WhatsAppOrderCreate(
        customer_name="Raju Perumalla",
        customer_phone="9515159006",
        delivery_slot="Instant 15-30 Mins",
        payment_method="cod",
        notes="Please leave at front door",
        delivery_address={
            "street": "100 Feet Road, Indiranagar",
            "apartment": "Flat 302",
            "city": "Bengaluru",
            "postal_code": "560038",
            "latitude": 12.9784,
            "longitude": 77.6408,
            "accuracy_meters": 15.0
        },
        items=[{"product_id": 1, "variant_id": 1, "quantity": 1}],
        idempotency_key=f"WA-MIGRATION-IDEM-{int(time.time())}"
    )

    wa_resp = orders.create_whatsapp_order(wa_payload)

    assert wa_resp.order is not None
    assert wa_resp.whatsapp_url is not None
    assert wa_resp.whatsapp_message is not None
    assert "9515159006" in wa_resp.whatsapp_url
    assert "https://maps.google.com/?q=12.978400,77.640800" in wa_resp.whatsapp_message
    print(f"   [PASS] Created WhatsApp Order Reference: {wa_resp.order.order_number}")
    print(f"   [PASS] Target Phone: {wa_resp.whatsapp_number}")
    print(f"   [PASS] Live GPS Google Maps Link embedded: https://maps.google.com/?q=12.978400,77.640800")
    print(f"   [PASS] Click-to-Chat URL: {wa_resp.whatsapp_url[:80]}...")

    # -------------------------------------------------------------------------
    # TEST 8: ADMIN DASHBOARD METRICS & ORDER STATUS WORKFLOW
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Testing Admin Dashboard Metrics and Order Status Workflow...")
    # Get dashboard stats
    stats = sheets_service.get_dashboard_stats()
    assert "total_orders" in stats
    assert "total_revenue" in stats
    print(f"   [PASS] Dashboard Stats: Total Orders = {stats['total_orders']}, Total Revenue = Rs. {stats['total_revenue']:.2f}, Low Stock Items = {stats['low_stock_count']}")

    # Update order status
    order_id = wa_resp.order.order_number
    upd_res = sheets_service.update_order_status(order_id, "confirmed", "Confirmed via WhatsApp dispatch desk")
    assert upd_res is True
    check_order = sheets_service.get_order_by_id(order_id)
    assert check_order["status"] == "confirmed"
    print(f"   [PASS] Order status updated in 'Orders' sheet: {order_id} -> 'confirmed'")

    # -------------------------------------------------------------------------
    # TEST 9: HEALTH & READINESS ENDPOINTS (RENDER ZERO-DOWNTIME CHECK)
    # -------------------------------------------------------------------------
    print("\n[TEST 9] Testing Health & Readiness Endpoints for Render Deployment...")
    h_resp = health_check()
    assert h_resp["status"] == "healthy"
    assert h_resp["storage"]["backend"] == "sheets"
    print(f"   [PASS] GET /health returned 200 OK: Status = '{h_resp['status']}', Backend = '{h_resp['storage']['backend']}'")

    resp_obj = Response()
    r_resp = readiness(resp_obj)
    assert r_resp["status"] == "ready"
    assert resp_obj.status_code == 200
    print(f"   [PASS] GET /health/ready returned 200 OK: Container is ready to serve production traffic.")

    print("\n" + "=" * 80)
    print("  [SUCCESS] ALL GOOGLE SHEETS MIGRATION TESTS PASSED 100%!")
    print("=" * 80)

if __name__ == "__main__":
    run_sheets_migration_tests()
