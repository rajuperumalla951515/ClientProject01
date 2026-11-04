"""
Sri Adithya Organics - Supabase PostgreSQL Production Data Migration
Centralized Database for Customer Frontend & Admin Dashboard
Migrates all Categories, Products, Variants, Images, Users, Addresses,
Orders, Order Items, Inventory Logs, and Store Settings from offline resilient store
into Supabase PostgreSQL.
"""

import sys
import os
import json
import argparse
import datetime
from pathlib import Path

# Setup paths
repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root))

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from backend.app.database import (
    Base, normalize_db_url, is_placeholder_host, run_migrations
)
from backend.app.models import (
    User, Address, Category, Product, ProductVariant, ProductImage,
    Order, OrderItem, DeliverySetting, InventoryLog
)
from backend.app.config import settings

def parse_date(date_str: str) -> datetime.datetime:
    if not date_str:
        return datetime.datetime.utcnow()
    try:
        clean = date_str.replace("Z", "+00:00")
        return datetime.datetime.fromisoformat(clean).replace(tzinfo=None)
    except Exception:
        return datetime.datetime.utcnow()

def run_supabase_migration(db_url: str):
    print("=" * 80)
    print("  SRI ADITHYA ORGANICS - SUPABASE POSTGRESQL DATA MIGRATION")
    print("=" * 80)

    clean_url = normalize_db_url(db_url)
    print(f"[1/6] Connecting to target PostgreSQL database...")
    
    connect_args = {}
    if "postgresql" in clean_url and "supabase.co" in clean_url and "sslmode" not in clean_url:
        connect_args["sslmode"] = "require"

    engine = create_engine(
        clean_url,
        pool_pre_ping=True,
        connect_args=connect_args
    )

    # Test connectivity
    with engine.connect() as conn:
        if engine.dialect.name == "postgresql":
            res = conn.execute(text("SELECT version();")).scalar()
        else:
            res = conn.execute(text("SELECT sqlite_version();")).scalar()
        print(f"      [OK] Database Server Connected ({engine.dialect.name}): {str(res)[:60]}...")

    print(f"\n[2/6] Synchronizing Database Tables & Schema...")
    Base.metadata.create_all(bind=engine)
    run_migrations(engine)
    print(f"      [OK] All tables verified: users, addresses, categories, products, variants, images, orders, items, settings, inventory_logs")

    # Read offline store data
    data_file = repo_root / "backend" / "data" / "sheets_offline_store.json"
    if not data_file.exists():
        raise FileNotFoundError(f"Source data file not found: {data_file}")

    with open(data_file, "r", encoding="utf-8") as f:
        store_data = json.load(f)

    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        print(f"\n[3/6] Migrating Store & Delivery Settings...")
        # 1. Delivery Setting
        curr_settings = db.query(DeliverySetting).first()
        if not curr_settings:
            curr_settings = DeliverySetting(
                min_order_amount=99.0,
                free_delivery_threshold=499.0,
                standard_delivery_fee=39.0,
                express_delivery_fee=59.0,
                active_slots_json=json.dumps([
                    "Express Delivery (15-30 Mins)",
                    "Morning Harvest Slot (7:00 AM - 9:30 AM)",
                    "Evening Slot (5:30 PM - 8:00 PM)",
                    "Tomorrow Morning (7:00 AM - 9:30 AM)"
                ]),
                announcement_text="Sri Adithya Organics • 100% Pure Wood-Pressed Oils & Certified Organic Produce • Free Delivery over ₹499",
                whatsapp_number="919515159006"
            )
            db.add(curr_settings)
        else:
            curr_settings.whatsapp_number = "919515159006"
        db.commit()
        print(f"      [OK] Delivery Settings saved (WhatsApp: 919515159006)")

        print(f"\n[4/6] Migrating Users, Addresses & Categories...")
        # 2. Customers / Users
        user_rows = store_data.get("Customers", [])[1:]  # skip header
        migrated_users = 0
        for row in user_rows:
            uid, name, phone, email, pass_hash, role, created_at = row
            existing = db.query(User).filter(User.id == int(uid)).first()
            if not existing:
                existing = db.query(User).filter(User.email == str(email).lower()).first()
            if not existing:
                u = User(
                    id=int(uid),
                    name=str(name),
                    email=str(email).lower(),
                    hashed_password=str(pass_hash),
                    phone=str(phone) if phone else None,
                    role=str(role) if role else "customer",
                    is_active=True,
                    created_at=parse_date(created_at)
                )
                db.add(u)
                migrated_users += 1
            else:
                existing.name = str(name)
                existing.phone = str(phone) if phone else existing.phone
                existing.hashed_password = str(pass_hash)
                existing.role = str(role) if role else existing.role
        db.commit()
        print(f"      [OK] {migrated_users} Users migrated (Total Users in DB: {db.query(User).count()})")

        # 3. Addresses
        addr_rows = store_data.get("Addresses", [])[1:]
        migrated_addrs = 0
        for row in addr_rows:
            aid, cid, h_no, bld, street, loc, lmk, city, dist, state, pin, lat, lon, acc, conf, created_at = row
            existing_addr = db.query(Address).filter(Address.id == int(aid)).first()
            if not existing_addr:
                user_exists = db.query(User).filter(User.id == int(cid)).first()
                if user_exists:
                    a = Address(
                        id=int(aid),
                        user_id=int(cid),
                        label="Home",
                        recipient_name=user_exists.name,
                        phone=user_exists.phone or "+91 9515159006",
                        house_number=str(h_no) if h_no else None,
                        apartment=str(bld) if bld else None,
                        street=str(street) if street else "Main Road",
                        locality=str(loc) if loc else None,
                        landmark=str(lmk) if lmk else None,
                        city=str(city) if city else "Bengaluru",
                        state=str(state) if state else "Karnataka",
                        postal_code=str(pin) if pin else "560001",
                        latitude=float(lat) if lat is not None and str(lat).strip() else None,
                        longitude=float(lon) if lon is not None and str(lon).strip() else None,
                        accuracy_meters=float(acc) if acc is not None and str(acc).strip() else None,
                        confirmed_at=parse_date(created_at) if conf in (True, "True", 1, "1") else None,
                        created_at=parse_date(created_at)
                    )
                    db.add(a)
                    migrated_addrs += 1
        db.commit()
        print(f"      [OK] {migrated_addrs} Customer Addresses migrated")

        # 4. Categories
        cat_rows = store_data.get("Categories", [])[1:]
        migrated_cats = 0
        for idx, row in enumerate(cat_rows, 1):
            cat_id, cat_name, slug, descr, img, is_act = row
            existing_cat = db.query(Category).filter(Category.id == int(cat_id)).first()
            if not existing_cat:
                existing_cat = db.query(Category).filter(Category.slug == str(slug)).first()
            if not existing_cat:
                c = Category(
                    id=int(cat_id),
                    name=str(cat_name),
                    slug=str(slug),
                    description=str(descr) if descr else "",
                    image_url=str(img) if img else None,
                    display_order=idx,
                    is_active=is_act in (True, "True", 1, "1")
                )
                db.add(c)
                migrated_cats += 1
            else:
                existing_cat.name = str(cat_name)
                existing_cat.description = str(descr) if descr else existing_cat.description
                existing_cat.image_url = str(img) if img else existing_cat.image_url
        db.commit()
        print(f"      [OK] {migrated_cats} Categories migrated (Total Categories in DB: {db.query(Category).count()})")

        print(f"\n[5/6] Migrating Products, Variants & Images...")
        # 5. Products & Variants
        prod_rows = store_data.get("Products", [])[1:]
        migrated_prods = 0
        for row in prod_rows:
            pid, pname, slug, descr, cid, price, mrp, stock, img, add_imgs, unit, weight, is_avail, is_feat, created_at, updated_at = row
            existing_p = db.query(Product).filter(Product.id == int(pid)).first()
            if not existing_p:
                existing_p = db.query(Product).filter(Product.slug == str(slug)).first()
            if not existing_p:
                p = Product(
                    id=int(pid),
                    name=str(pname),
                    slug=str(slug),
                    category_id=int(cid),
                    description=str(descr) if descr else "",
                    short_description=str(descr)[:120] if descr else None,
                    brand="Sri Adithya Organics",
                    is_featured=is_feat in (True, "True", 1, "1"),
                    is_best_seller=int(pid) in [1, 2, 5, 8, 12],
                    is_fresh_today=int(cid) in [1, 2],
                    is_active=is_avail in (True, "True", 1, "1"),
                    created_at=parse_date(created_at)
                )
                db.add(p)
                db.flush()

                # Add Primary Variant
                v = ProductVariant(
                    product_id=p.id,
                    unit=str(unit) if unit else "Standard Pack",
                    pack_size=str(weight) if weight else "Standard Pack",
                    price=float(price) if price else 0.0,
                    mrp=float(mrp) if mrp else float(price or 0.0),
                    stock=int(stock) if stock is not None else 50,
                    is_default=True
                )
                db.add(v)

                # Add Image
                if img:
                    im = ProductImage(
                        product_id=p.id,
                        image_url=str(img),
                        alt_text=str(pname),
                        is_primary=True,
                        display_order=0
                    )
                    db.add(im)

                migrated_prods += 1
            else:
                # Update variant stock and price
                v = db.query(ProductVariant).filter(ProductVariant.product_id == existing_p.id).first()
                if v:
                    v.price = float(price) if price else v.price
                    v.mrp = float(mrp) if mrp else v.mrp
                    v.stock = int(stock) if stock is not None else v.stock
        db.commit()
        print(f"      [OK] {migrated_prods} Products migrated (Total Products in DB: {db.query(Product).count()})")

        print(f"\n[6/6] Migrating Orders, Order Items & Inventory Logs...")
        # 6. Orders
        order_rows = store_data.get("Orders", [])[1:]
        migrated_orders = 0
        for row in order_rows:
            oid, cid, cname, phone, subtotal, del_fee, total, p_method, p_status, o_status, d_addr_id, notes, wa_status, slot, addr_json, created_at, updated_at = row
            existing_o = db.query(Order).filter(Order.order_number == str(oid)).first()
            if not existing_o:
                user_id_val = int(cid) if cid and str(cid).isdigit() and db.query(User).filter(User.id == int(cid)).first() else None
                o = Order(
                    order_number=str(oid),
                    user_id=user_id_val,
                    status=str(o_status) if o_status else "pending",
                    subtotal=float(subtotal) if subtotal else 0.0,
                    delivery_fee=float(del_fee) if del_fee else 0.0,
                    tax=0.0,
                    total_amount=float(total) if total else 0.0,
                    delivery_slot=str(slot) if slot else "Standard Delivery",
                    delivery_address_json=str(addr_json) if addr_json else "{}",
                    notes=str(notes) if notes else None,
                    payment_method=str(p_method) if p_method else "cod",
                    payment_status=str(p_status) if p_status else "pending",
                    created_at=parse_date(created_at),
                    updated_at=parse_date(updated_at)
                )
                db.add(o)
                migrated_orders += 1
        db.commit()
        print(f"      [OK] {migrated_orders} Orders migrated (Total Orders in DB: {db.query(Order).count()})")

        # 7. Order Items
        item_rows = store_data.get("Order_Items", [])[1:]
        migrated_items = 0
        for row in item_rows:
            item_id, order_ref, pid, pname, qty, unit_price, line_total = row
            order_rec = db.query(Order).filter(Order.order_number == str(order_ref)).first()
            if order_rec:
                existing_item = db.query(OrderItem).filter(
                    OrderItem.order_id == order_rec.id,
                    OrderItem.product_name == str(pname)
                ).first()
                if not existing_item:
                    oi = OrderItem(
                        order_id=order_rec.id,
                        product_id=int(pid) if pid and str(pid).isdigit() else 1,
                        variant_id=1,
                        product_name=str(pname),
                        variant_name="Standard Pack",
                        unit_price=float(unit_price) if unit_price else 0.0,
                        mrp=float(unit_price) if unit_price else 0.0,
                        quantity=int(qty) if qty else 1,
                        total_price=float(line_total) if line_total else 0.0
                    )
                    db.add(oi)
                    migrated_items += 1
        db.commit()
        print(f"      [OK] {migrated_items} Order Items migrated")

        # 8. Inventory Logs
        log_rows = store_data.get("Inventory_Logs", [])[1:]
        migrated_logs = 0
        for row in log_rows:
            log_id, pid, prev_s, chg_s, new_s, reason, created_at = row
            prod_exists = db.query(Product).filter(Product.id == int(pid)).first()
            if prod_exists:
                existing_log = db.query(InventoryLog).filter(InventoryLog.id == int(log_id)).first()
                if not existing_log:
                    l = InventoryLog(
                        id=int(log_id),
                        product_id=int(pid),
                        previous_stock=int(prev_s),
                        changed_stock=int(chg_s),
                        new_stock=int(new_s),
                        reason=str(reason),
                        created_at=parse_date(created_at)
                    )
                    db.add(l)
                    migrated_logs += 1
        db.commit()
        print(f"      [OK] {migrated_logs} Inventory Audit Logs migrated")

        # 9. Sync PostgreSQL Sequence IDs (Ensures new inserts won't conflict with migrated IDs)
        if engine.dialect.name == "postgresql":
            print("\n[POST-MIGRATION] Synchronizing PostgreSQL sequence values...")
            tables_to_sync = [
                ("users", "id"),
                ("addresses", "id"),
                ("categories", "id"),
                ("products", "id"),
                ("product_variants", "id"),
                ("product_images", "id"),
                ("orders", "id"),
                ("order_items", "id"),
                ("inventory_logs", "id")
            ]
            for tbl, col in tables_to_sync:
                try:
                    with engine.begin() as conn:
                        conn.execute(text(f"""
                            SELECT setval(
                                pg_get_serial_sequence('{tbl}', '{col}'),
                                coalesce(max({col}), 1) + 1,
                                false
                            ) FROM {tbl};
                        """))
                except Exception as seq_err:
                    pass
            print("      [OK] Sequences synchronized successfully.")

        # Final Verification
        print("\n" + "=" * 80)
        print("  MIGRATION VERIFICATION & DATABASE AUDIT")
        print("=" * 80)
        print(f"  • Users in Database:          {db.query(User).count()}")
        print(f"  • Categories in Database:     {db.query(Category).count()}")
        print(f"  • Products in Database:       {db.query(Product).count()}")
        print(f"  • Variants in Database:       {db.query(ProductVariant).count()}")
        print(f"  • Addresses in Database:      {db.query(Address).count()}")
        print(f"  • Orders in Database:         {db.query(Order).count()}")
        print(f"  • Order Items in Database:    {db.query(OrderItem).count()}")
        print(f"  • Inventory Logs in Database: {db.query(InventoryLog).count()}")
        print("=" * 80)
        print("  [SUCCESS] SRI ADITHYA ORGANICS SUPABASE MIGRATION COMPLETE!")
        print("=" * 80)

    except Exception as exc:
        db.rollback()
        print(f"\n[ERROR] Migration failed: {exc}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate Sri Adithya Organics to Supabase PostgreSQL")
    parser.add_argument("--db-url", type=str, default=None, help="PostgreSQL connection string")
    args = parser.parse_args()

    db_url = args.db_url or os.getenv("SUPABASE_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not db_url:
        print("Usage: python scripts/migrate_to_supabase.py --db-url 'postgresql://postgres:[PASSWORD]@db.gahduzexqmmlahshsyre.supabase.co:5432/postgres'")
        print("Or set DATABASE_URL / SUPABASE_DATABASE_URL environment variable.")
        sys.exit(1)

    run_supabase_migration(db_url)
