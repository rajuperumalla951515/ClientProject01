"""
Populate backend/data/sheets_offline_store.json with all 8 worksheets from master backup
Ensures that the application operates reliably even when Google Sheets API credentials 
have not yet been configured in the cloud environment.
"""

import sys
import json
from pathlib import Path

repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root))

from backend.app.sheets.client import WORKSHEET_SCHEMAS

def main():
    repo_root = Path(__file__).resolve().parent.parent
    backup_file = repo_root / "scripts" / "backup" / "backup_20261101_094344" / "full_database_backup.json"
    offline_file = repo_root / "backend" / "data" / "sheets_offline_store.json"

    with open(backup_file, "r", encoding="utf-8") as f:
        backup_data = json.load(f)

    full_store = {}
    for sheet_name, headers in WORKSHEET_SCHEMAS.items():
        records = backup_data.get(sheet_name, [])
        sheet_rows = [headers]
        for r in records:
            row = [r.get(h, "") for h in headers]
            sheet_rows.append(row)
        full_store[sheet_name] = sheet_rows

    # Ensure Store_Settings has full standard default values
    if len(full_store.get("Store_Settings", [])) <= 1:
        full_store["Store_Settings"] = [
            ["setting_key", "setting_value", "updated_at"],
            ["min_order_amount", "99.0", "2026-11-01T09:43:44Z"],
            ["free_delivery_threshold", "499.0", "2026-11-01T09:43:44Z"],
            ["standard_delivery_fee", "39.0", "2026-11-01T09:43:44Z"],
            ["express_delivery_fee", "59.0", "2026-11-01T09:43:44Z"],
            ["whatsapp_number", "919515159006", "2026-11-01T09:43:44Z"],
            ["active_slots_json", "[\"Express Delivery (15-30 Mins)\", \"Morning Slot (7:00 AM - 9:30 AM)\", \"Evening Slot (5:30 PM - 8:00 PM)\"]", "2026-11-01T09:43:44Z"],
            ["announcement_text", "Sri Adithya Organics - 100% Certified Organic - Free Delivery over Rs. 499", "2026-11-01T09:43:44Z"]
        ]

    offline_file.parent.mkdir(parents=True, exist_ok=True)
    with open(offline_file, "w", encoding="utf-8") as f:
        json.dump(full_store, f, indent=2)

    # Also save an immutable backup catalogue in backend/app/sheets/default_catalogue.json
    default_cat_file = repo_root / "backend" / "app" / "sheets" / "default_catalogue.json"
    default_cat = {
        "Products": backup_data.get("Products", []),
        "Categories": backup_data.get("Categories", []),
        "Store_Settings": [
            {"setting_key": "min_order_amount", "setting_value": "99.0"},
            {"setting_key": "free_delivery_threshold", "setting_value": "499.0"},
            {"setting_key": "standard_delivery_fee", "setting_value": "39.0"},
            {"setting_key": "express_delivery_fee", "setting_value": "59.0"},
            {"setting_key": "whatsapp_number", "setting_value": "919515159006"},
            {"setting_key": "active_slots_json", "setting_value": "[\"Express Delivery (15-30 Mins)\", \"Morning Slot (7:00 AM - 9:30 AM)\", \"Evening Slot (5:30 PM - 8:00 PM)\"]"},
            {"setting_key": "announcement_text", "setting_value": "Sri Adithya Organics - 100% Certified Organic - Free Delivery over Rs. 499"}
        ]
    }
    with open(default_cat_file, "w", encoding="utf-8") as f:
        json.dump(default_cat, f, indent=2)

    print("Updated backend/data/sheets_offline_store.json & backend/app/sheets/default_catalogue.json successfully!")
    for k, v in full_store.items():
        print(f"   {k}: {len(v)-1} rows")

if __name__ == "__main__":
    main()
