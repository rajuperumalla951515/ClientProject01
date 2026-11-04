"""
Sri Adithya Organics - Safe Production Cleanup Script
Deletes historical customer and order records while strictly preserving:
- Admin account (admin@sriadithyaorganics.com)
- All 25 products, variants, and images
- All 10 categories
- Delivery and store settings
- Inventory audit logs
Requires explicit confirmation flag --confirm before running.
"""

import sys
import os
import argparse
from pathlib import Path

repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from backend.app.database import normalize_db_url, is_placeholder_host
from backend.app.models import User, Address, Category, Product, ProductVariant, Order, OrderItem, Cart, CartItem, Payment, Wishlist

def perform_cleanup(db_url: str, confirmed: bool = False):
    if not confirmed:
        print("[SAFETY LOCK] Deletion aborted. You must supply --confirm to execute cleanup.")
        sys.exit(1)

    clean_url = normalize_db_url(db_url)
    connect_args = {}
    if "postgresql" in clean_url and ("supabase.co" in clean_url or "supabase.com" in clean_url) and "sslmode" not in clean_url:
        connect_args["sslmode"] = "require"

    engine = create_engine(clean_url, connect_args=connect_args)
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        print("=" * 80)
        print("  SRI ADITHYA ORGANICS - HISTORICAL DATA CLEANUP EXECUTION")
        print("=" * 80)

        # 1. Identify records before deletion
        admin_count = db.query(User).filter(User.role == "admin").count()
        cust_count = db.query(User).filter(User.role == "customer").count()
        order_count = db.query(Order).count()
        item_count = db.query(OrderItem).count()
        addr_count = db.query(Address).count()
        cart_count = db.query(Cart).count()
        cart_item_count = db.query(CartItem).count()
        prod_count = db.query(Product).count()
        cat_count = db.query(Category).count()

        print(f"Pre-cleanup inventory check:")
        print(f"  • Admins to preserve:      {admin_count}")
        print(f"  • Categories to preserve:  {cat_count}")
        print(f"  • Products to preserve:    {prod_count}")
        print(f"  • Customers to delete:     {cust_count}")
        print(f"  • Orders to delete:        {order_count}")
        print(f"  • Order items to delete:   {item_count}")
        print(f"  • Addresses to delete:     {addr_count}")
        print(f"  • Carts to delete:         {cart_count}")

        if admin_count == 0:
            raise RuntimeError("CRITICAL ERROR: No admin accounts found! Aborting to prevent lockout.")

        # 2. Delete Cart Items & Carts
        db.query(CartItem).delete()
        db.query(Cart).delete()

        # 3. Delete Order Items & Payments & Orders
        db.query(OrderItem).delete()
        db.query(Payment).delete()
        db.query(Order).delete()

        # 4. Delete Wishlists
        db.query(Wishlist).delete()

        # 5. Delete Addresses
        db.query(Address).delete()

        # 6. Delete Customer Users
        db.query(User).filter(User.role == "customer").delete()

        db.commit()

        # 7. Reset sequences in PostgreSQL
        if engine.dialect.name == "postgresql":
            with engine.begin() as conn:
                seqs = [
                    "orders_id_seq", "order_items_id_seq", "payments_id_seq",
                    "addresses_id_seq", "carts_id_seq", "cart_items_id_seq", "wishlists_id_seq"
                ]
                for s in seqs:
                    try:
                        conn.execute(text(f"ALTER SEQUENCE IF EXISTS {s} RESTART WITH 1;"))
                    except Exception:
                        pass
                try:
                    conn.execute(text("SELECT setval(pg_get_serial_sequence('users', 'id'), coalesce(max(id), 1) + 1, false) FROM users;"))
                except Exception:
                    pass

        # Also clean up sheets_offline_store.json customer/order lists
        offline_path = repo_root / "backend" / "data" / "sheets_offline_store.json"
        if offline_path.exists():
            import json
            with open(offline_path, "r", encoding="utf-8") as f:
                offline_data = json.load(f)
            
            # Keep header and admin row in Customers
            admin_rows = [row for row in offline_data.get("Customers", [])[1:] if row[5] == "admin"]
            offline_data["Customers"] = [offline_data["Customers"][0]] + admin_rows
            offline_data["Orders"] = [offline_data["Orders"][0]]
            offline_data["Order_Items"] = [offline_data["Order_Items"][0]]
            offline_data["Addresses"] = [offline_data["Addresses"][0]]

            with open(offline_path, "w", encoding="utf-8") as f:
                json.dump(offline_data, f, indent=2, ensure_ascii=False)

        print("\n" + "=" * 80)
        print("  CLEANUP COMPLETE: POST-CLEANUP VERIFICATION")
        print("=" * 80)
        print(f"  • Remaining Admins:     {db.query(User).filter(User.role == 'admin').count()}")
        print(f"  • Remaining Customers:  {db.query(User).filter(User.role == 'customer').count()}")
        print(f"  • Remaining Orders:     {db.query(Order).count()}")
        print(f"  • Remaining Items:      {db.query(OrderItem).count()}")
        print(f"  • Remaining Addresses:  {db.query(Address).count()}")
        print(f"  • Preserved Categories: {db.query(Category).count()}")
        print(f"  • Preserved Products:   {db.query(Product).count()}")
        print("=" * 80)

    except Exception as exc:
        db.rollback()
        print(f"[ERROR] Cleanup failed and was rolled back: {exc}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--db-url", type=str, required=True, help="PostgreSQL connection string")
    parser.add_argument("--confirm", action="store_true", help="Explicit confirmation for deletion")
    args = parser.parse_args()
    perform_cleanup(args.db_url, args.confirm)

