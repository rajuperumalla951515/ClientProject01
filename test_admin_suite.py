"""
Comprehensive Automated Test Suite: Admin Dashboard Backend Integration
Sri Adithya Organics Platform
Verifies admin auth, dashboard analytics, inventory management, customer metrics,
product and category administration, and order cancellation with inventory restock.
"""

import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ["STORAGE_BACKEND"] = "sheets"

from backend.app.config import settings
settings.STORAGE_BACKEND = "sheets"

from backend.app.sheets.client import sheets_client
from backend.app.sheets.service import sheets_service
from backend.app.routers import admin, products, categories, orders, auth
from backend.app.schemas import (
    UserLogin, InventoryAdjustRequest, OrderCancelRequest,
    ProductUpdate, CategoryUpdate
)
from backend.app.deps import SheetsUser
from fastapi import HTTPException

def run_admin_tests():
    print("=" * 80)
    print("  SRI ADITHYA ORGANICS - ADMIN DASHBOARD BACKEND VERIFICATION SUITE")
    print("=" * 80)

    # 1. ADMIN AUTHENTICATION
    print("\n[TEST 1] Admin Authentication Verification...")
    admin_auth = sheets_service.authenticate_customer("admin@sriadithyaorganics.com", "admin123")
    assert admin_auth is not None, "Admin user must authenticate successfully!"
    assert admin_auth["role"] == "admin"
    admin_user = SheetsUser(admin_auth)
    print(f"   [PASS] Authenticated admin: {admin_user.name} ({admin_user.email}), Role: {admin_user.role}")

    # Non-admin verification
    customer_auth = sheets_service.get_customer_by_email("admin@sriadithyaorganics.com")
    customer_fake = SheetsUser({"id": 99, "name": "Fake Customer", "email": "fake@gmail.com", "role": "customer"})
    try:
        from backend.app.deps import get_current_admin
        get_current_admin(customer_fake)
        assert False, "Non-admin must be rejected with HTTP 403!"
    except HTTPException as e:
        assert e.status_code == 403
        print("   [PASS] Non-admin properly rejected with HTTP 403 Forbidden.")

    # 2. ENHANCED DASHBOARD STATS
    print("\n[TEST 2] Enhanced Dashboard Stats...")
    stats = admin.get_dashboard_stats(db=None, admin=admin_user)
    assert stats.total_revenue > 0
    assert stats.total_orders > 0
    assert stats.total_products > 0
    assert isinstance(stats.order_status_counts, dict)
    print(f"   [PASS] Total Revenue: Rs. {stats.total_revenue:.2f}")
    print(f"   [PASS] Total Orders: {stats.total_orders}, Today: {stats.today_orders}")
    print(f"   [PASS] Status breakdown: {stats.order_status_counts}")
    print(f"   [PASS] Top products count: {len(stats.top_products)}")

    # 3. INVENTORY MANAGEMENT & AUDIT LOGS
    print("\n[TEST 3] Inventory Management & Stock Adjustment...")
    inv_list = admin.get_inventory_status(db=None, admin=admin_user)
    assert len(inv_list) > 0
    target_prod = inv_list[0]
    p_id = target_prod["id"]
    initial_stock = target_prod["stock"]
    print(f"   [PASS] Loaded {len(inv_list)} products for inventory view. Target: {target_prod['name']} (Stock: {initial_stock})")

    # Stock adjustment (+10)
    adj_res = admin.adjust_inventory_stock(
        req=InventoryAdjustRequest(product_id=p_id, delta=10, reason="Verified Restock Shipment", notes="Batch #8872"),
        db=None,
        admin=admin_user
    )
    assert adj_res["new_stock"] == initial_stock + 10
    print(f"   [PASS] Stock adjusted from {initial_stock} to {adj_res['new_stock']} (Delta: +10)")

    # Audit Logs
    logs = admin.get_inventory_audit_logs(limit=10, offset=0, db=None, admin=admin_user)
    assert len(logs) > 0
    assert "Verified Restock Shipment" in logs[0].reason
    print(f"   [PASS] Audit log verified: #{logs[0].log_id} - {logs[0].product_name} -> {logs[0].reason}")

    # 4. CUSTOMER DIRECTORY & DETAIL DRAWER
    print("\n[TEST 4] Customer Directory & Order Metrics...")
    customers = admin.list_customers(db=None, admin=admin_user)
    assert len(customers) > 0
    first_cust = customers[0]
    print(f"   [PASS] Loaded {len(customers)} customers. Top customer: {first_cust.name} (Orders: {first_cust.total_orders}, Spend: Rs. {first_cust.total_spend:.2f})")

    cust_detail = admin.get_customer_details(customer_id=first_cust.id, db=None, admin=admin_user)
    assert cust_detail.id == first_cust.id
    print(f"   [PASS] Customer Detail Drawer data retrieved for ID {cust_detail.id}: {len(cust_detail.orders)} historical orders.")

    # 5. PRODUCT & CATEGORY ADMINISTRATION
    print("\n[TEST 5] Product and Category Administration via Sheets...")
    # Update product
    prod_upd = products.update_product(
        product_id=p_id,
        product_in=ProductUpdate(name=target_prod["name"], description="Updated via Admin Dashboard verification"),
        db=None,
        admin=admin_user
    )
    assert prod_upd.id == p_id
    print(f"   [PASS] Updated Product ID {p_id} successfully.")

    # Update category
    all_cats = categories.list_categories(db=None)
    cat_id = all_cats[0].id
    cat_upd = categories.update_category(
        category_id=cat_id,
        cat_in=CategoryUpdate(name=all_cats[0].name),
        db=None,
        admin=admin_user
    )
    assert cat_upd.id == cat_id
    print(f"   [PASS] Updated Category ID {cat_id} successfully.")

    # 6. ORDER CANCELLATION & AUTOMATIC RESTOCK
    print("\n[TEST 6] Order Cancellation & Automatic Stock Restoration...")
    # Create an order to cancel
    p_before_order = sheets_service.get_product_by_id_or_slug(str(p_id))
    stock_before_order = p_before_order["variants"][0]["stock"]

    new_order = sheets_service.create_order(
        customer_id=first_cust.id,
        customer_name=first_cust.name,
        customer_phone=first_cust.phone or "9515159006",
        items_requested=[{"product_id": p_id, "quantity": 2}],
        delivery_address={"street": "Admin Test Road", "city": "Bengaluru", "postal_code": "560038"},
        idempotency_key=f"CANCEL-TEST-{int(time.time())}"
    )
    order_ref = new_order["order_number"]

    # Verify stock decremented by 2
    p_after_order = sheets_service.get_product_by_id_or_slug(str(p_id))
    assert p_after_order["variants"][0]["stock"] == stock_before_order - 2
    print(f"   [PASS] Created order {order_ref}: stock decremented from {stock_before_order} to {stock_before_order - 2}")

    # Cancel order via admin
    cancelled = admin.cancel_order_admin(
        order_id=order_ref,
        cancel_in=OrderCancelRequest(reason="Customer requested exchange"),
        db=None,
        admin=admin_user
    )
    assert cancelled.status == "cancelled"

    # Verify stock was automatically restored (+2)
    p_after_cancel = sheets_service.get_product_by_id_or_slug(str(p_id))
    assert p_after_cancel["variants"][0]["stock"] == stock_before_order
    print(f"   [PASS] Order {order_ref} cancelled: stock automatically restored back to {stock_before_order}!")

    # Verify restock entry in Inventory_Logs
    logs_after_cancel = sheets_service.get_inventory_logs(limit=5)
    restock_log = next((l for l in logs_after_cancel if order_ref in l["reason"]), None)
    assert restock_log is not None
    assert restock_log["changed_stock"] == 2
    print(f"   [PASS] Restock recorded in Inventory_Logs: {restock_log['reason']} (+{restock_log['changed_stock']} units)")

    print("\n" + "=" * 80)
    print("  [SUCCESS] ALL ADMIN DASHBOARD BACKEND TESTS PASSED 100%!")
    print("=" * 80)

if __name__ == "__main__":
    run_admin_tests()
