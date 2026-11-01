"""
Google Sheets API v4 Resilient Client
Sri Adithya Organics Platform
Handles authentication, exponential backoff, batch read/writes, quota management,
and automatic worksheet schema initialization.
"""

import os
import json
import time
import random
import logging
from typing import Any, Dict, List, Optional, Tuple
from pathlib import Path

logger = logging.getLogger("sri_adithya.sheets.client")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(levelname)s] %(asctime)s - %(name)s: %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

# Worksheet Definitions & Exact Column Ordering (per Project Specification)
WORKSHEET_SCHEMAS: Dict[str, List[str]] = {
    "Products": [
        "product_id", "product_name", "slug", "description", "category_id",
        "price", "original_price", "stock_quantity", "image_url", "additional_images",
        "unit", "weight", "is_available", "is_featured", "created_at", "updated_at"
    ],
    "Categories": [
        "category_id", "category_name", "slug", "description", "image_url", "is_active"
    ],
    "Customers": [
        "customer_id", "name", "phone", "email", "password_hash", "role", "created_at"
    ],
    "Orders": [
        "order_id", "customer_id", "customer_name", "phone", "subtotal",
        "delivery_charge", "final_total", "payment_method", "payment_status",
        "order_status", "delivery_address_id", "customer_notes", "whatsapp_status",
        "delivery_slot", "delivery_address_json", "created_at", "updated_at"
    ],
    "Order_Items": [
        "order_item_id", "order_id", "product_id", "product_name", "quantity",
        "unit_price", "line_total"
    ],
    "Addresses": [
        "address_id", "customer_id", "house_number", "building_name", "street",
        "locality", "landmark", "city", "district", "state", "pincode",
        "latitude", "longitude", "gps_accuracy_meters", "is_confirmed", "created_at"
    ],
    "Inventory_Logs": [
        "log_id", "product_id", "previous_stock", "changed_stock", "new_stock",
        "reason", "created_at"
    ],
    "Store_Settings": [
        "setting_key", "setting_value", "updated_at"
    ]
}

class GoogleSheetsClient:
    def __init__(self, spreadsheet_id: Optional[str] = None):
        from backend.app.config import settings
        self.spreadsheet_id = spreadsheet_id or settings.GOOGLE_SHEETS_SPREADSHEET_ID
        self.email = settings.GOOGLE_SERVICE_ACCOUNT_EMAIL
        self.private_key = settings.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
        self.raw_json = settings.GOOGLE_SERVICE_ACCOUNT_JSON

        self._service: Optional[Any] = None
        self._is_live_connected: bool = False
        self._offline_data: Dict[str, List[List[Any]]] = {}
        self._offline_file: Path = Path(__file__).resolve().parent.parent.parent / "data" / "sheets_offline_store.json"
        
        self._init_client()

    def _init_client(self) -> None:
        """Initialize Google Sheets API v4 service or fallback to resilient local offline engine."""
        creds = None
        SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

        try:
            from google.oauth2 import service_account
            from googleapiclient.discovery import build

            # Method A: Full JSON string or file path provided
            if self.raw_json and self.raw_json.strip():
                raw = self.raw_json.strip()
                if os.path.exists(raw):
                    creds = service_account.Credentials.from_service_account_file(raw, scopes=SCOPES)
                else:
                    info = json.loads(raw)
                    creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)

            # Method B: Email + Private Key provided via environment variables
            elif self.email and self.private_key:
                clean_key = self.private_key.replace("\\n", "\n").strip()
                info = {
                    "type": "service_account",
                    "client_email": self.email.strip(),
                    "private_key": clean_key,
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
                creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)

            if creds and self.spreadsheet_id:
                self._service = build("sheets", "v4", credentials=creds, cache_discovery=False)
                self._is_live_connected = True
                logger.info(f"Connected to Google Sheets API v4 (Spreadsheet ID: {self.spreadsheet_id[:8]}...)")
                self._ensure_remote_worksheets()
                return

        except Exception as e:
            logger.warning(f"Google Sheets API live connection not initialized: {e}. Running in local resilient store mode.")

        # Resilient Offline/Local Store Engine initialization
        self._is_live_connected = False
        self._init_offline_store()

    @property
    def is_live(self) -> bool:
        """True if authenticated and connected to real Google Sheets API."""
        return self._is_live_connected

    def _init_offline_store(self) -> None:
        """Loads offline store snapshot or seeds initial worksheets."""
        self._offline_data = {}
        if self._offline_file.exists():
            try:
                with open(self._offline_file, "r", encoding="utf-8") as f:
                    self._offline_data = json.load(f)
                    logger.info("Loaded persistent local offline Google Sheets snapshot.")
            except Exception as e:
                logger.warning(f"Could not load offline store snapshot: {e}")

        for sheet_name, headers in WORKSHEET_SCHEMAS.items():
            if sheet_name not in self._offline_data:
                self._offline_data[sheet_name] = [headers]

    def _save_offline_store(self) -> None:
        """Persists offline store changes to disk atomically."""
        try:
            self._offline_file.parent.mkdir(parents=True, exist_ok=True)
            temp_file = self._offline_file.with_suffix(".tmp")
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(self._offline_data, f, indent=2)
            temp_file.replace(self._offline_file)
        except Exception as e:
            logger.warning(f"Could not persist offline store: {e}")

    # --- Resilience & Retry Layer ---
    def _execute_with_retry(self, request_callable, max_retries: int = 4, initial_backoff: float = 1.0) -> Any:
        """
        Executes Google Sheets API requests with exponential backoff and jitter.
        Handles rate limits (429 Quota Exceeded) and transient 5xx server errors.
        """
        backoff = initial_backoff
        for attempt in range(max_retries):
            try:
                return request_callable.execute()
            except Exception as e:
                error_str = str(e)
                is_rate_limit = "429" in error_str or "quota" in error_str.lower()
                is_transient = "500" in error_str or "503" in error_str or "504" in error_str or "backendError" in error_str
                
                if (is_rate_limit or is_transient) and attempt < max_retries - 1:
                    jitter = random.uniform(0.1, 0.5)
                    sleep_time = backoff + jitter
                    logger.warning(f"[RETRY {attempt+1}/{max_retries}] Google API rate-limit/transient error ({e}). Retrying in {sleep_time:.2f}s...")
                    time.sleep(sleep_time)
                    backoff *= 2.0
                else:
                    logger.error(f"Google Sheets API call failed after {attempt+1} attempts: {e}")
                    raise

    # --- Live Remote Worksheets Provisioning ---
    def _ensure_remote_worksheets(self) -> None:
        """Ensures all 8 worksheets and header rows exist on the remote spreadsheet."""
        if not self._is_live_connected or not self._service:
            return

        try:
            req = self._service.spreadsheets().get(spreadsheetId=self.spreadsheet_id)
            meta = self._execute_with_retry(req)
            existing_sheets = {s["properties"]["title"] for s in meta.get("sheets", [])}

            add_sheet_requests = []
            for sheet_name in WORKSHEET_SCHEMAS.keys():
                if sheet_name not in existing_sheets:
                    add_sheet_requests.append({
                        "addSheet": {
                            "properties": {
                                "title": sheet_name,
                                "gridProperties": {
                                    "frozenRowCount": 1
                                }
                            }
                        }
                    })

            if add_sheet_requests:
                batch_body = {"requests": add_sheet_requests}
                batch_req = self._service.spreadsheets().batchUpdate(
                    spreadsheetId=self.spreadsheet_id,
                    body=batch_body
                )
                self._execute_with_retry(batch_req)
                logger.info(f"Created {len(add_sheet_requests)} missing worksheets in Google Spreadsheet.")

            # Ensure header row for each worksheet
            ranges_to_check = [f"'{s}'!A1:Z1" for s in WORKSHEET_SCHEMAS.keys()]
            batch_get_req = self._service.spreadsheets().values().batchGet(
                spreadsheetId=self.spreadsheet_id,
                ranges=ranges_to_check
            )
            header_res = self._execute_with_retry(batch_get_req)
            value_ranges = header_res.get("valueRanges", [])

            update_data = []
            for vr in value_ranges:
                range_str = vr.get("range", "")
                sheet_title = range_str.split("!")[0].strip("'")
                rows = vr.get("values", [])
                if not rows or len(rows[0]) == 0:
                    schema_headers = WORKSHEET_SCHEMAS.get(sheet_title)
                    if schema_headers:
                        update_data.append({
                            "range": f"'{sheet_title}'!A1:{chr(ord('A') + len(schema_headers) - 1)}1",
                            "values": [schema_headers]
                        })

            if update_data:
                update_body = {
                    "valueInputOption": "USER_ENTERED",
                    "data": update_data
                }
                upd_req = self._service.spreadsheets().values().batchUpdate(
                    spreadsheetId=self.spreadsheet_id,
                    body=update_body
                )
                self._execute_with_retry(upd_req)
                logger.info(f"Initialized headers on {len(update_data)} worksheets.")

        except Exception as e:
            logger.warning(f"Worksheet verification notice: {e}")

    # --- Core Data Operations: Read ---

    def read_sheet(self, sheet_name: str) -> List[Dict[str, Any]]:
        """
        Reads all rows from a worksheet and converts them into list of dictionaries
        mapped to worksheet schema headers.
        """
        headers = WORKSHEET_SCHEMAS.get(sheet_name, [])
        if not headers:
            raise ValueError(f"Unknown worksheet: {sheet_name}")

        if not self._is_live_connected or not self._service:
            # Read from local offline store
            sheet_rows = self._offline_data.get(sheet_name, [])
            if len(sheet_rows) <= 1:
                return []
            header_row = [str(c).strip() for c in sheet_rows[0]]
            records = []
            for row in sheet_rows[1:]:
                rec = {}
                for idx, col in enumerate(header_row):
                    val = row[idx] if idx < len(row) else ""
                    rec[col] = val
                records.append(rec)
            return records

        # Read from live Google Sheets API
        range_name = f"'{sheet_name}'!A1:Z5000"
        req = self._service.spreadsheets().values().get(
            spreadsheetId=self.spreadsheet_id,
            range=range_name,
            valueRenderOption="UNFORMATTED_VALUE"
        )
        res = self._execute_with_retry(req)
        rows = res.get("values", [])
        if len(rows) <= 1:
            return []

        header_row = [str(c).strip() for c in rows[0]]
        records = []
        for row in rows[1:]:
            rec = {}
            for idx, col in enumerate(header_row):
                val = row[idx] if idx < len(row) else ""
                rec[col] = val
            records.append(rec)
        return records

    def batch_read_sheets(self, sheet_names: List[str]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Performs a single batch read for multiple worksheets to minimize API quota usage.
        """
        result = {}
        if not self._is_live_connected or not self._service:
            for s in sheet_names:
                result[s] = self.read_sheet(s)
            return result

        ranges = [f"'{s}'!A1:Z5000" for s in sheet_names]
        req = self._service.spreadsheets().values().batchGet(
            spreadsheetId=self.spreadsheet_id,
            ranges=ranges,
            valueRenderOption="UNFORMATTED_VALUE"
        )
        res = self._execute_with_retry(req)
        value_ranges = res.get("valueRanges", [])

        for vr in value_ranges:
            sheet_title = vr.get("range", "").split("!")[0].strip("'")
            rows = vr.get("values", [])
            if len(rows) <= 1:
                result[sheet_title] = []
                continue
            header_row = [str(c).strip() for c in rows[0]]
            records = []
            for row in rows[1:]:
                rec = {}
                for idx, col in enumerate(header_row):
                    val = row[idx] if idx < len(row) else ""
                    rec[col] = val
                records.append(rec)
            result[sheet_title] = records

        return result

    # --- Core Data Operations: Write & Append ---

    def append_row(self, sheet_name: str, record: Dict[str, Any]) -> None:
        """Appends a single dictionary record to a worksheet according to schema column ordering."""
        self.append_rows(sheet_name, [record])

    def append_rows(self, sheet_name: str, records: List[Dict[str, Any]]) -> None:
        """Appends multiple records in a single batch operation."""
        if not records:
            return

        headers = WORKSHEET_SCHEMAS.get(sheet_name)
        if not headers:
            raise ValueError(f"Unknown worksheet: {sheet_name}")

        rows_to_append = []
        for rec in records:
            row = [rec.get(col, "") for col in headers]
            rows_to_append.append(row)

        if not self._is_live_connected or not self._service:
            if sheet_name not in self._offline_data:
                self._offline_data[sheet_name] = [headers]
            self._offline_data[sheet_name].extend(rows_to_append)
            self._save_offline_store()
            return

        range_name = f"'{sheet_name}'!A:A"
        body = {
            "values": rows_to_append
        }
        req = self._service.spreadsheets().values().append(
            spreadsheetId=self.spreadsheet_id,
            range=range_name,
            valueInputOption="USER_ENTERED",
            insertDataOption="INSERT_ROWS",
            body=body
        )
        self._execute_with_retry(req)

    def update_row_by_key(self, sheet_name: str, key_field: str, key_value: Any, updated_fields: Dict[str, Any]) -> bool:
        """
        Locates a row where key_field == key_value and updates matching columns.
        Returns True if row was found and updated.
        """
        headers = WORKSHEET_SCHEMAS.get(sheet_name)
        if not headers or key_field not in headers:
            raise ValueError(f"Invalid sheet {sheet_name} or key field {key_field}")

        key_idx = headers.index(key_field)
        str_target = str(key_value).strip().lower()

        if not self._is_live_connected or not self._service:
            rows = self._offline_data.get(sheet_name, [])
            for r_idx in range(1, len(rows)):
                curr_val = str(rows[r_idx][key_idx] if key_idx < len(rows[r_idx]) else "").strip().lower()
                if curr_val == str_target:
                    # Update fields
                    for col_name, val in updated_fields.items():
                        if col_name in headers:
                            c_idx = headers.index(col_name)
                            while len(rows[r_idx]) <= c_idx:
                                rows[r_idx].append("")
                            rows[r_idx][c_idx] = val
                    self._save_offline_store()
                    return True
            return False

        # Live Google Sheets: Read sheet to find row index
        req = self._service.spreadsheets().values().get(
            spreadsheetId=self.spreadsheet_id,
            range=f"'{sheet_name}'!A1:Z5000",
            valueRenderOption="UNFORMATTED_VALUE"
        )
        res = self._execute_with_retry(req)
        rows = res.get("values", [])
        if len(rows) <= 1:
            return False

        sheet_headers = [str(c).strip() for c in rows[0]]
        if key_field not in sheet_headers:
            return False
        k_idx = sheet_headers.index(key_field)

        target_row_number = None
        target_row_data = None
        for idx, row in enumerate(rows[1:], start=2):
            val = str(row[k_idx] if k_idx < len(row) else "").strip().lower()
            if val == str_target:
                target_row_number = idx
                target_row_data = list(row)
                break

        if not target_row_number or target_row_data is None:
            return False

        # Apply updates to row values
        while len(target_row_data) < len(sheet_headers):
            target_row_data.append("")

        for col_name, new_val in updated_fields.items():
            if col_name in sheet_headers:
                c_idx = sheet_headers.index(col_name)
                target_row_data[c_idx] = new_val

        # Write updated row
        end_col_char = chr(ord('A') + len(sheet_headers) - 1)
        update_range = f"'{sheet_name}'!A{target_row_number}:{end_col_char}{target_row_number}"
        update_body = {
            "values": [target_row_data]
        }
        upd_req = self._service.spreadsheets().values().update(
            spreadsheetId=self.spreadsheet_id,
            range=update_range,
            valueInputOption="USER_ENTERED",
            body=update_body
        )
        self._execute_with_retry(upd_req)
        return True

    def batch_overwrite_sheet(self, sheet_name: str, records: List[Dict[str, Any]]) -> None:
        """Overwrites an entire sheet with headers and data (used during initial migration/seeding)."""
        headers = WORKSHEET_SCHEMAS.get(sheet_name)
        if not headers:
            raise ValueError(f"Unknown worksheet: {sheet_name}")

        rows = [headers]
        for rec in records:
            row = [rec.get(col, "") for col in headers]
            rows.append(row)

        if not self._is_live_connected or not self._service:
            self._offline_data[sheet_name] = rows
            self._save_offline_store()
            return

        clear_req = self._service.spreadsheets().values().clear(
            spreadsheetId=self.spreadsheet_id,
            range=f"'{sheet_name}'!A1:Z10000"
        )
        self._execute_with_retry(clear_req)

        body = {"values": rows}
        write_req = self._service.spreadsheets().values().update(
            spreadsheetId=self.spreadsheet_id,
            range=f"'{sheet_name}'!A1",
            valueInputOption="USER_ENTERED",
            body=body
        )
        self._execute_with_retry(write_req)

# Singleton client instance
sheets_client = GoogleSheetsClient()
