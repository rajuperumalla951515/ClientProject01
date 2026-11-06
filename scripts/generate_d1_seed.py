import sys
sys.path.insert(0, ".")
import json
from pathlib import Path
from backend.app.security import get_password_hash

backup_path = Path("scripts/backup/backup_20261106_170039/full_database_backup.json")
output_path = Path("migrations/d1/0002_seed_data.sql")

with open(backup_path, "r", encoding="utf-8") as f:
    data = json.load(f)

sql_lines = [
    "-- Sri Adithya Organics: Cloudflare D1 Native SQLite Seed Data",
    "-- Migration 0002: Seed Data from Central Database Snapshot",
    "",
]

def sql_quote(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, bool):
        return "1" if val else "0"
    s = str(val).replace("'", "''")
    return f"'{s}'"

# 1. Users
sql_lines.append("-- 1. Users (Admin and Customer Accounts)")
users = [
    {
        "id": 1,
        "name": "Sri Adithya Admin",
        "email": "admin@sriadithyaorganics.com",
        "hashed_password": get_password_hash("admin123"),
        "phone": "919515159006",
        "role": "admin",
        "is_active": 1,
    },
    {
        "id": 2,
        "name": "Raju Perumalla",
        "email": "rajuperumallar@gmail.com",
        "hashed_password": get_password_hash("123456"),
        "phone": "919515159006",
        "role": "admin",
        "is_active": 1,
    },
    {
        "id": 3,
        "name": "Arjun Sharma",
        "email": "arjun.sharma@example.com",
        "hashed_password": get_password_hash("customer123"),
        "phone": "9876543210",
        "role": "customer",
        "is_active": 1,
    },
    {
        "id": 4,
        "name": "Customer Demo",
        "email": "customer@sriadithyaorganics.com",
        "hashed_password": get_password_hash("customer123"),
        "phone": "9988776655",
        "role": "customer",
        "is_active": 1,
    }
]

for u in users:
    sql_lines.append(
        f"INSERT OR IGNORE INTO users (id, name, email, hashed_password, phone, role, is_active) "
        f"VALUES ({u['id']}, {sql_quote(u['name'])}, {sql_quote(u['email'])}, {sql_quote(u['hashed_password'])}, "
        f"{sql_quote(u['phone'])}, {sql_quote(u['role'])}, {u['is_active']});"
    )

# 2. Categories
sql_lines.append("\n-- 2. Categories")
for c in data.get("categories", []):
    sql_lines.append(
        f"INSERT OR IGNORE INTO categories (id, name, slug, description, image_url, icon, display_order, is_active) "
        f"VALUES ({c['id']}, {sql_quote(c['name'])}, {sql_quote(c['slug'])}, {sql_quote(c.get('description'))}, "
        f"{sql_quote(c.get('image_url'))}, {sql_quote(c.get('icon'))}, {c.get('display_order', 0)}, {1 if c.get('is_active') else 0});"
    )

# 3. Products
sql_lines.append("\n-- 3. Products")
for p in data.get("products", []):
    sql_lines.append(
        f"INSERT OR IGNORE INTO products (id, name, slug, category_id, description, short_description, brand, origin_farm, "
        f"certifications, storage_instructions, allergens, ingredients, is_featured, is_fresh_today, is_deal, is_best_seller, is_active) "
        f"VALUES ({p['id']}, {sql_quote(p['name'])}, {sql_quote(p['slug'])}, {p['category_id']}, {sql_quote(p['description'])}, "
        f"{sql_quote(p.get('short_description'))}, {sql_quote(p.get('brand', 'Sri Adithya Organics'))}, {sql_quote(p.get('origin_farm'))}, "
        f"{sql_quote(p.get('certifications'))}, {sql_quote(p.get('storage_instructions'))}, {sql_quote(p.get('allergens'))}, "
        f"{sql_quote(p.get('ingredients'))}, {1 if p.get('is_featured') else 0}, {1 if p.get('is_fresh_today') else 0}, "
        f"{1 if p.get('is_deal') else 0}, {1 if p.get('is_best_seller') else 0}, {1 if p.get('is_active') else 0});"
    )

# 4. Product Variants
sql_lines.append("\n-- 4. Product Variants")
for v in data.get("product_variants", []):
    sql_lines.append(
        f"INSERT OR IGNORE INTO product_variants (id, product_id, unit, pack_size, price, mrp, stock, sku, is_default) "
        f"VALUES ({v['id']}, {v['product_id']}, {sql_quote(v['unit'])}, {sql_quote(v.get('pack_size', 'Standard Pack'))}, "
        f"{float(v['price'])}, {float(v['mrp'])}, {v.get('stock', 50)}, {sql_quote(v.get('sku'))}, {1 if v.get('is_default') else 0});"
    )

# 5. Product Images
sql_lines.append("\n-- 5. Product Images")
for img in data.get("product_images", []):
    sql_lines.append(
        f"INSERT OR IGNORE INTO product_images (id, product_id, image_url, alt_text, is_primary, display_order) "
        f"VALUES ({img['id']}, {img['product_id']}, {sql_quote(img['image_url'])}, {sql_quote(img.get('alt_text'))}, "
        f"{1 if img.get('is_primary') else 0}, {img.get('display_order', 0)});"
    )

# 6. Delivery Settings
sql_lines.append("\n-- 6. Delivery Settings")
ds = data.get("delivery_settings", [{}])[0]
sql_lines.append(
    f"INSERT OR IGNORE INTO delivery_settings (id, min_order_amount, free_delivery_threshold, standard_delivery_fee, express_delivery_fee, announcement_text, whatsapp_number) "
    f"VALUES (1, {float(ds.get('min_order_amount', 99.0))}, {float(ds.get('free_delivery_threshold', 499.0))}, "
    f"{float(ds.get('standard_delivery_fee', 39.0))}, {float(ds.get('express_delivery_fee', 59.0))}, "
    f"{sql_quote(ds.get('announcement_text', 'Sri Adithya Organics • 100% Certified Organic • Free Delivery on orders over ₹499'))}, "
    f"{sql_quote(ds.get('whatsapp_number', '919515159006'))});"
)

output_path.parent.mkdir(parents=True, exist_ok=True)
with open(output_path, "w", encoding="utf-8") as f:
    f.write("\n".join(sql_lines) + "\n")

print(f"Generated {output_path} with {len(sql_lines)} statements.")
