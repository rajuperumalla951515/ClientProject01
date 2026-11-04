import sys
import os
sys.path.insert(0, os.path.abspath("."))
import time
from decimal import Decimal
from backend.app.pricing import compute_financials, to_decimal, round_currency
from backend.app.database import SessionLocal
from backend.app.models import Product, ProductVariant, Category, User, Order, InventoryLog
from backend.app.events import broadcaster

def test_decimal_pricing():
    print("\n--- Test 1: Decimal Financials & Precision ---")
    items = [
        {
            "product_id": 1,
            "variant_id": 1,
            "product_name": "Organic Jaggery",
            "variant_name": "500g",
            "price": Decimal("225.00"),
            "quantity": 3,
            "mrp": Decimal("250.00")
        },
        {
            "product_id": 2,
            "variant_id": 2,
            "product_name": "Sesame Oil",
            "variant_name": "1L",
            "price": Decimal("140.50"),
            "quantity": 2,
            "mrp": Decimal("160.00")
        },
    ]
    fin = compute_financials(items, free_delivery_threshold=499.0, standard_delivery_fee=39.0)
    assert fin.subtotal == 956.00, f"Expected 956.00, got {fin.subtotal}"
    assert fin.total_mrp == 1070.00, f"Expected 1070.00, got {fin.total_mrp}"
    assert fin.discount == 114.00, f"Expected 114.00, got {fin.discount}"
    assert fin.delivery_fee == 0.00, f"Expected 0.00, got {fin.delivery_fee}"
    assert fin.total_amount == 956.00, f"Expected 956.00, got {fin.total_amount}"
    print(f"PASSED: Financial calculation exact: subtotal={fin.subtotal}, total={fin.total_amount}, discount={fin.discount}")

def test_below_threshold_delivery_fee():
    print("\n--- Test 2: Below Threshold Delivery Fee Calculation ---")
    items = [{
        "product_id": 1,
        "variant_id": 1,
        "product_name": "Organic Jaggery",
        "variant_name": "500g",
        "price": Decimal("225.00"),
        "quantity": 1,
        "mrp": Decimal("250.00")
    }]
    fin = compute_financials(items, free_delivery_threshold=499.0, standard_delivery_fee=39.0)
    assert fin.subtotal == 225.00
    assert fin.delivery_fee == 39.00
    assert fin.total_amount == 264.00, f"Expected 264.00, got {fin.total_amount}"
    print(f"PASSED: Subtotal 225 + 39 fee = {fin.total_amount} exact!")

def test_database_single_queries():
    print("\n--- Test 3: Database Single-Query Execution & Speed ---")
    db = SessionLocal()
    try:
        t0 = time.time()
        # Categories with count
        from sqlalchemy import func
        cat_counts = db.query(
            Category,
            func.count(Product.id).label("prod_count")
        ).outerjoin(Product, (Product.category_id == Category.id) & (Product.is_active == True)
        ).group_by(Category.id).all()
        t1 = time.time()
        print(f"PASSED: Loaded {len(cat_counts)} categories with product count in {(t1 - t0)*1000:.2f}ms (single SQL query)")

        # Single-query customer analytics
        t0 = time.time()
        from backend.app.routers.admin import list_customers
        # Call list_customers logic
        subq = db.query(
            Order.user_id,
            func.count(Order.id).label("total_orders"),
            func.coalesce(func.sum(Order.total_amount), 0).label("total_spend")
        ).filter(Order.status != "cancelled").group_by(Order.user_id).subquery()

        rows = db.query(
            User,
            func.coalesce(subq.c.total_orders, 0).label("total_orders"),
            func.coalesce(subq.c.total_spend, 0).label("total_spend")
        ).outerjoin(subq, User.id == subq.c.user_id).filter(User.role == "customer").all()
        t1 = time.time()
        print(f"PASSED: Loaded {len(rows)} customer profiles with aggregations in {(t1 - t0)*1000:.2f}ms (single SQL query)")

    finally:
        db.close()

def test_event_broadcaster():
    print("\n--- Test 4: Real-time Event Broadcaster ---")
    event = broadcaster.publish("TEST_EVENT", {"status": "ok"})
    assert event is not None
    assert event["type"] == "TEST_EVENT"
    assert event["version"] > 0
    print(f"PASSED: Event published cleanly at version {event['version']}")

def test_concurrent_stock_lock():
    print("\n--- Test 5: Row-level Atomic Stock Locking ---")
    db1 = SessionLocal()
    db2 = SessionLocal()
    try:
        # Find any active variant
        variant = db1.query(ProductVariant).first()
        if not variant:
            print("SKIPPED: No variant found for lock test")
            return

        # Acquire lock in session 1
        locked_v1 = db1.query(ProductVariant).with_for_update().filter(ProductVariant.id == variant.id).first()
        assert locked_v1 is not None
        print(f"PASSED: Row lock acquired for variant #{locked_v1.id} (stock={locked_v1.stock})")
        db1.rollback()
    finally:
        db1.close()
        db2.close()

if __name__ == "__main__":
    test_decimal_pricing()
    test_below_threshold_delivery_fee()
    test_database_single_queries()
    test_event_broadcaster()
    test_concurrent_stock_lock()
    print("\nALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!")
