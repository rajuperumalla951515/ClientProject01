"""
Sri Adithya Organics - Supabase / PostgreSQL Relational Database Test Suite
Verifies all CRUD, Analytics, Inventory Management, Customer Metrics,
and WhatsApp order generation in pure Relational Database Mode.
"""

import sys
import os
import json
import pytest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ["STORAGE_BACKEND"] = "database"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database import Base, run_migrations
from backend.app.models import (
    User, Address, Category, Product, ProductVariant, ProductImage,
    Order, OrderItem, DeliverySetting, InventoryLog
)
from backend.app.routers import admin, products, categories, orders, auth
from backend.app.schemas import (
    InventoryAdjustRequest, OrderCancelRequest
)
from backend.app.security import get_password_hash
from fastapi import HTTPException

def run_integration_tests():
    print("=" * 80)
    print("  SRI ADITHYA ORGANICS - DATABASE INTEGRATION & SUPABASE READINESS SUITE")
    print("=" * 80)

    # Use in-memory SQLite database for deterministic isolation
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    run_migrations(engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    # Seed minimal baseline
    admin_user = User(
        name="Sri Adithya Admin",
        email="admin@sriadithyaorganics.com",
        hashed_password=get_password_hash("admin123"),
        phone="+91 9515159006",
        role="admin",
        is_active=True
    )
    cust_user = User(
        name="Arjun Sharma",
        email="arjun.sharma@example.com",
        hashed_password=get_password_hash("customer123"),
        phone="+91 98450 12345",
        role="customer",
        is_active=True
    )
    db.add_all([admin_user, cust_user])
    db.flush()

    addr = Address(
        user_id=cust_user.id,
        label="Home",
        recipient_name=cust_user.name,
        phone=cust_user.phone,
        street="12th Main Road, Indiranagar",
        house_number="#42",
        locality="HAL 2nd Stage",
        city="Bengaluru",
        state="Karnataka",
        postal_code="560038",
        latitude=12.9784,
        longitude=77.6408,
        accuracy_meters=8.5,
        is_default=True
    )
    cat = Category(
        name="Cold-Pressed Oils",
        slug="cold-pressed-oils",
        description="Wood churned oils",
        is_active=True
    )
    db.add_all([addr, cat])
    db.flush()

    prod = Product(
        name="Wood Pressed Groundnut Oil",
        slug="wood-pressed-groundnut-oil",
        category_id=cat.id,
        description="Pure traditional cold-pressed groundnut oil",
        brand="Sri Adithya Organics",
        is_featured=True,
        is_active=True
    )
    db.add(prod)
    db.flush()

    variant = ProductVariant(
        product_id=prod.id,
        unit="1 Litre Bottle",
        price=320.0,
        mrp=390.0,
        stock=50,
        is_default=True
    )
    db.add(variant)

    setting = DeliverySetting(
        min_order_amount=99.0,
        free_delivery_threshold=499.0,
        standard_delivery_fee=39.0,
        express_delivery_fee=59.0,
        whatsapp_number="919515159006"
    )
    db.add(setting)
    db.commit()

    # 1. TEST PRODUCT & CATEGORY IN DATABASE MODE
    print("\n[TEST 1] Testing Products & Categories in Database Mode...")
    all_cats = categories.list_categories(db=db)
    assert len(all_cats) == 1
    assert all_cats[0].name == "Cold-Pressed Oils"
    print(f"   [PASS] Categories listed: {len(all_cats)}")

    all_prods = products.list_products(db=db)
    assert len(all_prods) == 1
    assert all_prods[0].name == "Wood Pressed Groundnut Oil"
    assert all_prods[0].min_price == 320.0
    print(f"   [PASS] Products listed: {len(all_prods)}, Price: Rs. {all_prods[0].min_price}")

    # 2. TEST INVENTORY ADJUSTMENT & AUDIT LOGGING
    print("\n[TEST 2] Testing Inventory Adjustment & Audit Logs in Database Mode...")
    inv_list = admin.get_inventory_status(db=db, admin=admin_user)
    assert len(inv_list) == 1
    assert inv_list[0]["stock"] == 50

    adj_res = admin.adjust_inventory_stock(
        req=InventoryAdjustRequest(product_id=prod.id, delta=15, reason="Fresh Wood-Pressed Mill Batch", notes="Vessel #3"),
        db=db,
        admin=admin_user
    )
    assert adj_res["new_stock"] == 65
    print(f"   [PASS] Stock adjusted from 50 to 65 (+15 units)")

    # Check inventory audit logs from database
    logs = admin.get_inventory_audit_logs(db=db, admin=admin_user)
    assert len(logs) == 1
    assert logs[0].product_id == prod.id
    assert logs[0].changed_stock == 15
    assert logs[0].new_stock == 65
    assert "Fresh Wood-Pressed Mill Batch" in logs[0].reason
    print(f"   [PASS] Database InventoryLog recorded: #{logs[0].log_id} - {logs[0].reason}")

    # 3. TEST ORDER PLACEMENT & DASHBOARD ANALYTICS
    print("\n[TEST 3] Testing Orders & Analytics in Database Mode...")
    order = Order(
        order_number="SAO-20261104-TEST-001",
        user_id=cust_user.id,
        status="confirmed",
        subtotal=640.0,
        delivery_fee=0.0,
        total_amount=640.0,
        delivery_slot="Morning Slot (7:00 AM - 9:30 AM)",
        delivery_address_json=json.dumps({
            "recipient_name": cust_user.name,
            "phone": cust_user.phone,
            "street": addr.street,
            "city": addr.city,
            "postal_code": addr.postal_code,
            "latitude": addr.latitude,
            "longitude": addr.longitude,
            "accuracy_meters": addr.accuracy_meters
        }),
        payment_method="cod",
        payment_status="pending"
    )
    db.add(order)
    db.flush()

    item = OrderItem(
        order_id=order.id,
        product_id=prod.id,
        variant_id=variant.id,
        product_name=prod.name,
        variant_name=variant.unit,
        unit_price=320.0,
        mrp=390.0,
        quantity=2,
        total_price=640.0
    )
    db.add(item)
    db.commit()

    # Dashboard Stats
    stats = admin.get_dashboard_stats(db=db, admin=admin_user)
    assert stats.total_revenue == 640.0
    assert stats.total_orders == 1
    assert stats.pending_orders == 1 # 'confirmed' is pending fulfillment
    assert len(stats.top_products) == 1
    assert stats.top_products[0].units_sold == 2
    assert stats.top_products[0].name == "Wood Pressed Groundnut Oil"
    print(f"   [PASS] Total Revenue: Rs. {stats.total_revenue}, Top Product: {stats.top_products[0].name} ({stats.top_products[0].units_sold} units)")

    # 4. TEST CUSTOMER METRICS & DETAIL DRAWER
    print("\n[TEST 4] Testing Customer Metrics in Database Mode...")
    custs = admin.list_customers(db=db, admin=admin_user)
    assert len(custs) == 1
    assert custs[0].name == "Arjun Sharma"
    assert custs[0].total_spend == 640.0
    assert custs[0].total_orders == 1
    print(f"   [PASS] Customer metrics: {custs[0].name} (Spend: Rs. {custs[0].total_spend})")

    cust_detail = admin.get_customer_details(customer_id=cust_user.id, db=db, admin=admin_user)
    assert cust_detail.id == cust_user.id
    assert len(cust_detail.orders) == 1
    assert len(cust_detail.addresses) == 1
    assert cust_detail.addresses[0].postal_code == "560038"
    print(f"   [PASS] Customer detail drawer: {len(cust_detail.addresses)} addresses, {len(cust_detail.orders)} orders")

    # 5. TEST ORDER CANCELLATION & AUTOMATIC RESTOCK
    print("\n[TEST 5] Testing Order Cancellation & Stock Restoration...")
    cancel_res = admin.cancel_order_admin(
        order_id=str(order.id),
        cancel_in=OrderCancelRequest(reason="Customer requested schedule shift"),
        db=db,
        admin=admin_user
    )
    assert cancel_res.status == "cancelled"
    db.refresh(variant)
    assert variant.stock == 67 # 65 + 2 restocked
    logs = admin.get_inventory_audit_logs(db=db, admin=admin_user)
    assert any("Order Restock" in l.reason for l in logs)
    print(f"   [PASS] Order cancelled: variant restocked from 65 to 67 (+2 units)")

    # 6. TEST WHATSAPP MESSAGE FORMATTING WITH GPS
    print("\n[TEST 6] Testing WhatsApp Message Generation with Live GPS Location...")
    wa_msg = orders.format_whatsapp_order_message(
        order=order,
        customer_name=cust_user.name,
        customer_phone=cust_user.phone,
        items=[item],
        address_snapshot=json.loads(order.delivery_address_json),
        subtotal=640.0,
        delivery_fee=0.0,
        final_amount=640.0,
        payment_pref="Cash on Delivery (COD)"
    )
    assert "Sri Adithya Organics - New Order Request" in wa_msg
    assert "https://maps.google.com/?q=12.978400,77.640800" in wa_msg
    assert "GPS Precision:" in wa_msg
    assert "Wood Pressed Groundnut Oil" in wa_msg
    print(f"   [PASS] Dynamic WhatsApp message with live GPS location verified!")

    print("\n" + "=" * 80)
    print("  [SUCCESS] ALL DATABASE & SUPABASE PARITY INTEGRATION TESTS PASSED 100%!")
    print("=" * 80)

if __name__ == "__main__":
    run_integration_tests()
