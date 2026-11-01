"""
PostgreSQL to Google Sheets Migration & Backup Utility
Sri Adithya Organics Platform

Exports all tables from the PostgreSQL/SQLite database, creates timestamped backups,
and migrates every record into the Google Sheets worksheets according to the required schema:
  - Products
  - Categories
  - Customers
  - Orders
  - Order_Items
  - Addresses
  - Inventory_Logs
  - Store_Settings

Usage:
    python scripts/migrate_pg_to_sheets.py
"""

import sys
import os
import json
import csv
import datetime
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.app.database import SessionLocal
from backend.app.models import (
    User, Address, Category, Product, ProductVariant, ProductImage, Order, OrderItem, DeliverySetting
)
from backend.app.sheets.client import sheets_client, WORKSHEET_SCHEMAS
from backend.app.sheets.cache import sheets_cache

def export_and_migrate():
    print("=" * 75)
    print(" SRI ADITHYA ORGANICS — POSTGRESQL TO GOOGLE SHEETS MIGRATION")
    print("=" * 75)

    timestamp = datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_dir = root_dir / "scripts" / "backup" / f"backup_{timestamp}"
    backup_dir.mkdir(parents=True, exist_ok=True)
    csv_dir = backup_dir / "csv"
    csv_dir.mkdir(parents=True, exist_ok=True)

    db = SessionLocal()
    try:
        # -------------------------------------------------------------
        # 1. CATEGORIES MIGRATION
        # -------------------------------------------------------------
        print("\n[1/7] Exporting Categories...")
        categories_db = db.query(Category).order_by(Category.id).all()
        categories_data = []
        for c in categories_db:
            categories_data.append({
                "category_id": c.id,
                "category_name": c.name,
                "slug": c.slug,
                "description": c.description or "",
                "image_url": c.image_url or "",
                "is_active": "True" if c.is_active else "False"
            })
        print(f"      Found {len(categories_data)} categories.")

        # -------------------------------------------------------------
        # 2. PRODUCTS MIGRATION
        # -------------------------------------------------------------
        print("\n[2/7] Exporting Products with Variants and Images...")
        products_db = db.query(Product).order_by(Product.id).all()
        products_data = []
        for p in products_db:
            primary_var = p.variants[0] if p.variants else None
            price = primary_var.price if primary_var else 0.0
            orig_price = primary_var.mrp if primary_var else price
            stock = primary_var.stock if primary_var else 50
            unit = primary_var.unit if primary_var else "1 Unit"
            weight = primary_var.pack_size if primary_var else unit

            primary_img = ""
            addl_imgs = []
            for img in p.images:
                if img.is_primary and not primary_img:
                    primary_img = img.image_url
                else:
                    addl_imgs.append(img.image_url)
            if not primary_img and addl_imgs:
                primary_img = addl_imgs.pop(0)

            products_data.append({
                "product_id": p.id,
                "product_name": p.name,
                "slug": p.slug,
                "description": p.description or "",
                "category_id": p.category_id,
                "price": price,
                "original_price": orig_price,
                "stock_quantity": stock,
                "image_url": primary_img,
                "additional_images": ",".join(addl_imgs),
                "unit": unit,
                "weight": weight,
                "is_available": "True" if p.is_active and stock > 0 else "False",
                "is_featured": "True" if p.is_featured else "False",
                "created_at": p.created_at.isoformat() if p.created_at else datetime.datetime.utcnow().isoformat(),
                "updated_at": datetime.datetime.utcnow().isoformat()
            })
        print(f"      Found {len(products_data)} products.")

        # -------------------------------------------------------------
        # 3. CUSTOMERS MIGRATION
        # -------------------------------------------------------------
        print("\n[3/7] Exporting Customers...")
        users_db = db.query(User).order_by(User.id).all()
        customers_data = []
        for u in users_db:
            customers_data.append({
                "customer_id": u.id,
                "name": u.name,
                "phone": u.phone or "",
                "email": u.email,
                "password_hash": u.hashed_password,
                "role": u.role or "customer",
                "created_at": u.created_at.isoformat() if u.created_at else datetime.datetime.utcnow().isoformat()
            })
        print(f"      Found {len(customers_data)} customers.")

        # -------------------------------------------------------------
        # 4. ADDRESSES MIGRATION
        # -------------------------------------------------------------
        print("\n[4/7] Exporting Addresses...")
        addresses_db = db.query(Address).order_by(Address.id).all()
        addresses_data = []
        for a in addresses_db:
            addresses_data.append({
                "address_id": a.id,
                "customer_id": a.user_id,
                "house_number": getattr(a, "house_number", "") or a.apartment or "",
                "building_name": a.apartment or "",
                "street": a.street,
                "locality": getattr(a, "locality", "") or a.city,
                "landmark": a.landmark or "",
                "city": a.city,
                "district": "",
                "state": a.state,
                "pincode": a.postal_code,
                "latitude": getattr(a, "latitude", "") or "",
                "longitude": getattr(a, "longitude", "") or "",
                "gps_accuracy_meters": getattr(a, "accuracy_meters", "") or "",
                "is_confirmed": "True",
                "created_at": a.created_at.isoformat() if a.created_at else datetime.datetime.utcnow().isoformat()
            })
        print(f"      Found {len(addresses_data)} addresses.")

        # -------------------------------------------------------------
        # 5. ORDERS & ORDER ITEMS MIGRATION
        # -------------------------------------------------------------
        print("\n[5/7] Exporting Orders and Order Items...")
        orders_db = db.query(Order).order_by(Order.id).all()
        orders_data = []
        order_items_data = []

        for o in orders_db:
            addr_snapshot = {}
            try:
                addr_snapshot = json.loads(o.delivery_address_json)
            except Exception:
                addr_snapshot = {}

            c_name = addr_snapshot.get("recipient_name") or (o.user.name if o.user else "Customer")
            c_phone = addr_snapshot.get("phone") or (o.user.phone if o.user else "")

            orders_data.append({
                "order_id": o.order_number,
                "customer_id": o.user_id or "",
                "customer_name": c_name,
                "phone": c_phone,
                "subtotal": o.subtotal,
                "delivery_charge": o.delivery_fee,
                "final_total": o.total_amount,
                "payment_method": o.payment_method,
                "payment_status": o.payment_status,
                "order_status": o.status,
                "delivery_address_id": addr_snapshot.get("id", ""),
                "customer_notes": o.notes or "",
                "whatsapp_status": "confirmed" if o.status not in ("pending_whatsapp", "pending") else "pending_customer_send",
                "delivery_slot": o.delivery_slot or "Instant 15-30 Mins",
                "delivery_address_json": o.delivery_address_json,
                "created_at": o.created_at.isoformat() if o.created_at else datetime.datetime.utcnow().isoformat(),
                "updated_at": o.updated_at.isoformat() if o.updated_at else datetime.datetime.utcnow().isoformat()
            })

            for it in o.items:
                order_items_data.append({
                    "order_item_id": it.id,
                    "order_id": o.order_number,
                    "product_id": it.product_id,
                    "product_name": f"{it.product_name} ({it.variant_name})",
                    "quantity": it.quantity,
                    "unit_price": it.unit_price,
                    "line_total": it.total_price
                })

        print(f"      Found {len(orders_data)} orders and {len(order_items_data)} order items.")

        # -------------------------------------------------------------
        # 6. STORE SETTINGS MIGRATION
        # -------------------------------------------------------------
        print("\n[6/7] Exporting Store Settings...")
        setting = db.query(DeliverySetting).first()
        store_settings_data = [
            {"setting_key": "min_order_amount", "setting_value": setting.min_order_amount if setting else 99.0, "updated_at": datetime.datetime.utcnow().isoformat()},
            {"setting_key": "free_delivery_threshold", "setting_value": setting.free_delivery_threshold if setting else 499.0, "updated_at": datetime.datetime.utcnow().isoformat()},
            {"setting_key": "standard_delivery_fee", "setting_value": setting.standard_delivery_fee if setting else 39.0, "updated_at": datetime.datetime.utcnow().isoformat()},
            {"setting_key": "express_delivery_fee", "setting_value": setting.express_delivery_fee if setting else 59.0, "updated_at": datetime.datetime.utcnow().isoformat()},
            {"setting_key": "whatsapp_number", "setting_value": setting.whatsapp_number if setting and setting.whatsapp_number else "919515159006", "updated_at": datetime.datetime.utcnow().isoformat()},
            {"setting_key": "announcement_text", "setting_value": setting.announcement_text if setting else "Sri Adithya Organics • 100% Pure Wood-Pressed Oils & Certified Organic Produce • Free Delivery over ₹499", "updated_at": datetime.datetime.utcnow().isoformat()}
        ]

        # -------------------------------------------------------------
        # 7. INVENTORY LOGS (INITIAL SNAPSHOT)
        # -------------------------------------------------------------
        inventory_logs_data = []
        for idx, p in enumerate(products_data, start=1):
            inventory_logs_data.append({
                "log_id": idx,
                "product_id": p["product_id"],
                "previous_stock": 0,
                "changed_stock": p["stock_quantity"],
                "new_stock": p["stock_quantity"],
                "reason": "Initial PostgreSQL Catalogue Import",
                "created_at": datetime.datetime.utcnow().isoformat()
            })

        # Save JSON master backup
        master_backup = {
            "metadata": {
                "exported_at": datetime.datetime.utcnow().isoformat(),
                "total_products": len(products_data),
                "total_categories": len(categories_data),
                "total_customers": len(customers_data),
                "total_addresses": len(addresses_data),
                "total_orders": len(orders_data),
                "total_order_items": len(order_items_data),
            },
            "Categories": categories_data,
            "Products": products_data,
            "Customers": customers_data,
            "Addresses": addresses_data,
            "Orders": orders_data,
            "Order_Items": order_items_data,
            "Inventory_Logs": inventory_logs_data,
            "Store_Settings": store_settings_data
        }
        json_backup_path = backup_dir / "full_database_backup.json"
        with open(json_backup_path, "w", encoding="utf-8") as f:
            json.dump(master_backup, f, indent=2)
        print(f"\n[OK] Master JSON backup saved to: {json_backup_path}")

        # Save CSV files for manual upload to Google Sheets if desired
        all_tables = {
            "Categories": categories_data,
            "Products": products_data,
            "Customers": customers_data,
            "Addresses": addresses_data,
            "Orders": orders_data,
            "Order_Items": order_items_data,
            "Inventory_Logs": inventory_logs_data,
            "Store_Settings": store_settings_data
        }
        for sheet_name, rows in all_tables.items():
            headers = WORKSHEET_SCHEMAS.get(sheet_name, [])
            csv_file = csv_dir / f"{sheet_name}.csv"
            with open(csv_file, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=headers)
                writer.writeheader()
                for r in rows:
                    writer.writerow({k: r.get(k, "") for k in headers})
        print(f"[OK] CSV backups saved to: {csv_dir}")

        # -------------------------------------------------------------
        # 8. PUSH TO GOOGLE SHEETS STORAGE (Live or Resilient Engine)
        # -------------------------------------------------------------
        print("\n" + "=" * 75)
        print(f" PUSHING DATA TO GOOGLE SHEETS STORAGE (Live Mode: {sheets_client.is_live})...")
        print("=" * 75)

        for sheet_name, records in all_tables.items():
            print(f"   Writing {len(records)} records to '{sheet_name}'...")
            sheets_client.batch_overwrite_sheet(sheet_name, records)

        # Invalidate memory cache so fresh data is loaded
        sheets_cache.invalidate_all()

        # -------------------------------------------------------------
        # 9. INTEGRITY VERIFICATION
        # -------------------------------------------------------------
        print("\n" + "=" * 75)
        print(" MIGRATION VERIFICATION & RECONCILIATION")
        print("=" * 75)

        read_cats = sheets_client.read_sheet("Categories")
        read_prods = sheets_client.read_sheet("Products")
        read_custs = sheets_client.read_sheet("Customers")
        read_addrs = sheets_client.read_sheet("Addresses")
        read_ords = sheets_client.read_sheet("Orders")
        read_items = sheets_client.read_sheet("Order_Items")

        print(f"   Categories: Expected {len(categories_data)} | Found {len(read_cats)} -> {'PASS' if len(read_cats) == len(categories_data) else 'FAIL'}")
        print(f"   Products:   Expected {len(products_data)} | Found {len(read_prods)} -> {'PASS' if len(read_prods) == len(products_data) else 'FAIL'}")
        print(f"   Customers:  Expected {len(customers_data)} | Found {len(read_custs)} -> {'PASS' if len(read_custs) == len(customers_data) else 'FAIL'}")
        print(f"   Addresses:  Expected {len(addresses_data)} | Found {len(read_addrs)} -> {'PASS' if len(read_addrs) == len(addresses_data) else 'FAIL'}")
        print(f"   Orders:     Expected {len(orders_data)} | Found {len(read_ords)} -> {'PASS' if len(read_ords) == len(orders_data) else 'FAIL'}")
        print(f"   Order Items:Expected {len(order_items_data)} | Found {len(read_items)} -> {'PASS' if len(read_items) == len(order_items_data) else 'FAIL'}")

        assert len(read_prods) == len(products_data), "Product count mismatch"
        assert len(read_cats) == len(categories_data), "Category count mismatch"
        assert len(read_custs) == len(customers_data), "Customer count mismatch"

        print("\n[SUCCESS] PostgreSQL to Google Sheets migration and verification completed!")
        print("=" * 75)

    finally:
        db.close()

if __name__ == "__main__":
    export_and_migrate()

