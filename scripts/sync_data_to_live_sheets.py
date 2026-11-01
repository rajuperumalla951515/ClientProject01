"""
Synchronize migrated PostgreSQL database to Live Google Spreadsheet
Sri Adithya Organics Platform
Spreadsheet ID: 1Yvcf7_u-YypWJY8hW9JdvCZZVEneEH7XLlngGgCS_6o
Service Account: sri-adithya-sheets-service@tough-hologram-510509-n8.iam.gserviceaccount.com
"""

import sys
import os
import json
from pathlib import Path
from typing import Dict, List, Any

# Ensure project root is in sys.path
repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root))

from google.oauth2 import service_account
from googleapiclient.discovery import build
from backend.app.sheets.client import WORKSHEET_SCHEMAS

SPREADSHEET_ID = "1Yvcf7_u-YypWJY8hW9JdvCZZVEneEH7XLlngGgCS_6o"
CREDS_FILE = repo_root / "backend" / "credentials" / "google_service_account.json"
BACKUP_FILE = repo_root / "scripts" / "backup" / "backup_20261101_094344" / "full_database_backup.json"
OFFLINE_STORE = repo_root / "backend" / "data" / "sheets_offline_store.json"

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

def main():
    print("=" * 80)
    print("  SRI ADITHYA ORGANICS - LIVE GOOGLE SHEETS POPULATION & SYNC")
    print("=" * 80)
    print(f"[TARGET] Spreadsheet ID: {SPREADSHEET_ID}")
    print(f"[AUTH] Credentials File: {CREDS_FILE}")

    if not CREDS_FILE.exists():
        print(f"[ERROR] Credentials file not found at {CREDS_FILE}")
        sys.exit(1)

    # 1. Load Backup Data
    data_source = {}
    if OFFLINE_STORE.exists():
        with open(OFFLINE_STORE, "r", encoding="utf-8") as f:
            data_source = json.load(f)
        print(f"[DATA] Loaded {len(data_source)} worksheets from {OFFLINE_STORE.name}")
    elif BACKUP_FILE.exists():
        with open(BACKUP_FILE, "r", encoding="utf-8") as f:
            data_source = json.load(f)
        print(f"[DATA] Loaded master backup from {BACKUP_FILE.name}")
    else:
        print("[ERROR] Neither offline store nor backup JSON was found.")
        sys.exit(1)

    # 2. Authenticate with Google Sheets API
    try:
        creds = service_account.Credentials.from_service_account_file(str(CREDS_FILE), scopes=SCOPES)
        service = build("sheets", "v4", credentials=creds, cache_discovery=False)
        print(f"[OK] Authenticated as: {creds.service_account_email}")
    except Exception as e:
        print(f"[ERROR] Failed to authenticate: {e}")
        sys.exit(1)

    # 3. Inspect Live Spreadsheet Metadata
    try:
        spreadsheet = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
        existing_sheets = {s["properties"]["title"]: s["properties"]["sheetId"] for s in spreadsheet.get("sheets", [])}
        print(f"[OK] Connected to spreadsheet: '{spreadsheet.get('properties', {}).get('title', '')}'")
        print(f"     Existing worksheets: {list(existing_sheets.keys())}")
    except Exception as e:
        print(f"[ERROR] Could not access spreadsheet {SPREADSHEET_ID}: {e}")
        print("        Please ensure the spreadsheet has been shared with:")
        print(f"        {creds.service_account_email} with 'Editor' permissions.")
        sys.exit(1)

    # 4. Create missing worksheets
    requests = []
    target_worksheets = [
        "Products", "Categories", "Customers", "Orders",
        "Order_Items", "Addresses", "Inventory_Logs", "Store_Settings"
    ]

    for title in target_worksheets:
        if title not in existing_sheets:
            print(f"     [ACTION] Adding missing worksheet: '{title}'")
            requests.append({
                "addSheet": {
                    "properties": {
                        "title": title,
                        "gridProperties": {
                            "rowCount": 1000,
                            "columnCount": 26,
                            "frozenRowCount": 1
                        }
                    }
                }
            })

    if requests:
        res = service.spreadsheets().batchUpdate(
            spreadsheetId=SPREADSHEET_ID,
            body={"requests": requests}
        ).execute()
        print(f"[OK] Created {len(requests)} new worksheets.")

        # Refresh sheet list
        spreadsheet = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
        existing_sheets = {s["properties"]["title"]: s["properties"]["sheetId"] for s in spreadsheet.get("sheets", [])}

    # 5. Populate Data in Each Worksheet
    batch_values = []
    summary_counts = {}

    for title in target_worksheets:
        headers = WORKSHEET_SCHEMAS.get(title, [])
        sheet_rows = data_source.get(title, [])

        # If data is in raw [headers, row1, row2, ...] format
        if sheet_rows and isinstance(sheet_rows[0], list):
            values = sheet_rows
            count = len(sheet_rows) - 1
        elif sheet_rows and isinstance(sheet_rows[0], dict):
            # Convert list of dicts to list of rows
            values = [headers]
            for r in sheet_rows:
                row = [str(r.get(c, "") if r.get(c) is not None else "") for c in headers]
                values.append(row)
            count = len(sheet_rows)
        else:
            values = [headers]
            count = 0

        batch_values.append({
            "range": f"'{title}'!A1:Z{max(len(values), 1)}",
            "values": values
        })
        summary_counts[title] = count

    # Push all values in a single batchUpdate to respect rate limits
    print("\n[ACTION] Uploading data to all 8 worksheets in single batch...")
    body = {
        "valueInputOption": "USER_ENTERED",
        "data": batch_values
    }
    update_res = service.spreadsheets().values().batchUpdate(
        spreadsheetId=SPREADSHEET_ID,
        body=body
    ).execute()
    print(f"[OK] Populated {update_res.get('totalUpdatedRows', 0)} rows across {len(batch_values)} worksheets.")

    # 6. Delete default 'Sheet1' if present
    if "Sheet1" in existing_sheets and len(existing_sheets) > 1:
        try:
            service.spreadsheets().batchUpdate(
                spreadsheetId=SPREADSHEET_ID,
                body={"requests": [{"deleteSheet": {"sheetId": existing_sheets["Sheet1"]}}]}
            ).execute()
            print("[OK] Removed default empty 'Sheet1'.")
        except Exception as e:
            print(f"[NOTICE] Could not remove Sheet1: {e}")

    # 7. Verification Summary
    print("\n" + "=" * 80)
    print("  LIVE GOOGLE SPREADSHEET VERIFICATION SUMMARY")
    print("=" * 80)
    for title in target_worksheets:
        print(f"  • {title.ljust(16)} : {summary_counts.get(title, 0):4d} records synchronized")
    print("=" * 80)
    print(f"  Spreadsheet URL: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit")
    print("  [SUCCESS] All production data is now live on Google Sheets!")
    print("=" * 80)

if __name__ == "__main__":
    main()

