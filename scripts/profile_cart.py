import sys, os, time
sys.path.insert(0, os.path.abspath("."))
from backend.app.database import SessionLocal
from backend.app.models import Cart, CartItem, Product, ProductVariant, DeliverySetting, User
from backend.app.routers.cart import get_or_create_cart, compute_cart_details
from sqlalchemy.orm import selectinload

db = SessionLocal()
try:
    session_id = "bench_test_session_123"
    
    # 1. get_or_create_cart
    t0 = time.time()
    cart = db.query(Cart).filter(Cart.session_id == session_id).first()
    t1 = time.time()
    print(f"1. Query cart by session_id: {(t1 - t0)*1000:.2f}ms")

    # 2. Query settings
    t0 = time.time()
    settings_rec = db.query(DeliverySetting).first()
    t1 = time.time()
    print(f"2. Query DeliverySetting: {(t1 - t0)*1000:.2f}ms")

    # 3. Query CartItem with options
    t0 = time.time()
    items = db.query(CartItem).options(
        selectinload(CartItem.product).selectinload(Product.images),
        selectinload(CartItem.product).selectinload(Product.variants),
        selectinload(CartItem.product).selectinload(Product.category),
        selectinload(CartItem.variant)
    ).filter(CartItem.cart_id == (cart.id if cart else 1)).all()
    t1 = time.time()
    print(f"3. Query CartItem with 4 nested selectinload: {(t1 - t0)*1000:.2f}ms")

    # 4. Total compute_cart_details
    if cart:
        t0 = time.time()
        res = compute_cart_details(cart, db)
        t1 = time.time()
        print(f"4. Total compute_cart_details: {(t1 - t0)*1000:.2f}ms")

finally:
    db.close()
