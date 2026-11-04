import psycopg2
import sys

DB_URL = "postgresql://postgres.gahduzexqmmlahshsyre:%23lakshman%402005%23@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require"

def optimize():
    print("=" * 80)
    print("SRI ADITHYA ORGANICS - DATABASE PERFORMANCE OPTIMIZATION & INDEX MIGRATION")
    print("=" * 80)

    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        # 1. Trigram extension for fast search
        print("\n[STEP 1] Enabling pg_trgm extension...")
        cur.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
        print("  -> pg_trgm extension enabled.")

        # 2. Composite and collection indexes
        print("\n[STEP 2] Creating composite query indexes...")
        indexes = [
            ("idx_products_name_trgm", "CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);"),
            ("idx_products_active_cat", "CREATE INDEX IF NOT EXISTS idx_products_active_cat ON products (is_active, category_id);"),
            ("idx_products_active_best", "CREATE INDEX IF NOT EXISTS idx_products_active_best ON products (is_active, is_best_seller);"),
            ("idx_products_active_feat", "CREATE INDEX IF NOT EXISTS idx_products_active_feat ON products (is_active, is_featured);"),
            ("idx_products_active_fresh", "CREATE INDEX IF NOT EXISTS idx_products_active_fresh ON products (is_active, is_fresh_today);"),
            ("idx_cart_items_cart_id", "CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items (cart_id);"),
            ("idx_cart_items_composite", "CREATE INDEX IF NOT EXISTS idx_cart_items_composite ON cart_items (cart_id, product_id, variant_id);"),
            ("idx_order_items_order_id", "CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);"),
            ("idx_orders_user_status", "CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders (user_id, status);"),
        ]

        for name, sql in indexes:
            cur.execute(sql)
            print(f"  -> Index {name} verified.")

        # 3. Numeric Precision Migration for Financial Accuracy
        print("\n[STEP 3] Converting monetary columns to NUMERIC(10, 2) for exact currency arithmetic...")
        alter_columns = [
            ("product_variants", "price", "NUMERIC(10, 2)"),
            ("product_variants", "mrp", "NUMERIC(10, 2)"),
            ("orders", "subtotal", "NUMERIC(10, 2)"),
            ("orders", "discount", "NUMERIC(10, 2)"),
            ("orders", "delivery_fee", "NUMERIC(10, 2)"),
            ("orders", "tax", "NUMERIC(10, 2)"),
            ("orders", "total_amount", "NUMERIC(10, 2)"),
            ("order_items", "unit_price", "NUMERIC(10, 2)"),
            ("order_items", "mrp", "NUMERIC(10, 2)"),
            ("order_items", "total_price", "NUMERIC(10, 2)"),
            ("delivery_settings", "min_order_amount", "NUMERIC(10, 2)"),
            ("delivery_settings", "free_delivery_threshold", "NUMERIC(10, 2)"),
            ("delivery_settings", "standard_delivery_fee", "NUMERIC(10, 2)"),
            ("delivery_settings", "express_delivery_fee", "NUMERIC(10, 2)"),
        ]

        for table, col, col_type in alter_columns:
            cur.execute(f"ALTER TABLE {table} ALTER COLUMN {col} TYPE {col_type} USING {col}::{col_type};")
            print(f"  -> {table}.{col} converted to {col_type}")

        conn.commit()
        print("\n[PASS] Database schema optimizations & numeric types successfully committed!")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Optimization failed: {e}", file=sys.stderr)
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    optimize()
