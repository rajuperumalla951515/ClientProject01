import sys
from pathlib import Path

schema_file = Path("migrations/d1/0001_initial_schema.sql")
seed_file = Path("migrations/d1/0002_seed_data.sql")

def parse_sql(text):
    statements = []
    current = []
    for line in text.splitlines():
        line_str = line.strip()
        if not line_str or line_str.startswith("--"):
            continue
        current.append(line)
        if line_str.endswith(";"):
            stmt = "\n".join(current).strip()
            # remove trailing semicolon for prepare() if needed, but standard D1 accepts it
            statements.append(stmt)
            current = []
    if current:
        stmt = "\n".join(current).strip()
        if stmt:
            statements.append(stmt)
    return statements

schema_stmts = parse_sql(schema_file.read_text(encoding="utf-8"))
seed_stmts = parse_sql(seed_file.read_text(encoding="utf-8"))

print(f"Schema statements: {len(schema_stmts)}")
print(f"Seed statements: {len(seed_stmts)}")

output_py = Path("backend/app/d1_migrations.py")
content = '''"""
Sri Adithya Organics — In-Worker D1 Initializer
Automatically bundles and executes D1 initial schema and seed data.
"""

SCHEMA_STATEMENTS = ''' + repr(schema_stmts) + '''

SEED_STATEMENTS = ''' + repr(seed_stmts) + '''
'''

output_py.write_text(content, encoding="utf-8")
print(f"Written to {output_py}")
