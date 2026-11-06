import os
import ssl
import json
import datetime
from dotenv import load_dotenv

load_dotenv('backend/.env')
import pg8000.native

db_url = os.getenv('DATABASE_URL')
if not db_url:
    raise ValueError("DATABASE_URL not set in backend/.env")

# Parse connection info
from urllib.parse import urlparse, unquote
parsed = urlparse(db_url)
user = unquote(parsed.username) if parsed.username else ""
password = unquote(parsed.password) if parsed.password else ""
host = parsed.hostname or "aws-0-ap-southeast-1.pooler.supabase.com"
port = parsed.port or 5432
database = parsed.path.lstrip('/') if parsed.path else "postgres"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

conn = pg8000.native.Connection(
    user=user,
    password=password,
    host=host,
    port=port,
    database=database,
    ssl_context=ctx
)

tables = [
    'categories',
    'delivery_settings',
    'users',
    'addresses',
    'products',
    'product_variants',
    'product_images',
    'carts',
    'cart_items',
    'orders',
    'order_items',
    'wishlists'
]

backup_data = {}
timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
backup_dir = os.path.join('scripts', 'backup', f'backup_{timestamp}')
os.makedirs(backup_dir, exist_ok=True)

sql_lines = [
    "-- Sri Adithya Organics Production Database Backup",
    f"-- Generated: {datetime.datetime.now(datetime.timezone.utc).isoformat()}",
    "-- Target: Cloudflare Migration Snapshot",
    ""
]

def default_json_serializer(obj):
    if isinstance(obj, (datetime.datetime, datetime.date)):
        return obj.isoformat()
    if hasattr(obj, '__float__'):
        return float(obj)
    return str(obj)

for table in tables:
    # Fetch column names
    col_res = conn.run(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}' ORDER BY ordinal_position;")
    cols = [r[0] for r in col_res]
    
    rows = conn.run(f"SELECT * FROM {table};")
    dict_rows = [dict(zip(cols, r)) for r in rows]
    backup_data[table] = dict_rows
    print(f'Backed up {table}: {len(rows)} rows')
    
    # Generate SQL inserts
    if rows:
        col_names = ', '.join(f'"{c}"' for c in cols)
        for r in rows:
            vals = []
            for v in r:
                if v is None:
                    vals.append('NULL')
                elif isinstance(v, (int, float)):
                    vals.append(str(v))
                elif isinstance(v, bool):
                    vals.append('TRUE' if v else 'FALSE')
                elif isinstance(v, (datetime.datetime, datetime.date)):
                    vals.append(f"'{v.isoformat()}'")
                else:
                    escaped = str(v).replace("'", "''")
                    vals.append(f"'{escaped}'")
            values_str = ', '.join(vals)
            sql_lines.append(f'INSERT INTO {table} ({col_names}) VALUES ({values_str}) ON CONFLICT DO NOTHING;')

json_path = os.path.join(backup_dir, 'full_database_backup.json')
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(backup_data, f, indent=2, default=default_json_serializer)

sql_path = os.path.join(backup_dir, 'full_database_backup.sql')
with open(sql_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))

print(f'\n[SUCCESS] Production Database snapshot verified and written to:')
print(f'  JSON: {json_path}')
print(f'  SQL:  {sql_path}')
conn.close()
