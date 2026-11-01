"""
High-Level Business Operations Service for Google Sheets Storage
Sri Adithya Organics Platform
Implements product catalog, categories, customer auth, saved addresses,
atomic order placement, stock management, and admin fulfillment.
"""

import re
import json
import random
import datetime
import urllib.parse
from typing import Any, Dict, List, Optional, Tuple

from backend.app.config import settings
from backend.app.sheets.client import sheets_client, GoogleSheetsClient
from backend.app.sheets.cache import sheets_cache

def generate_order_number() -> str:
    now = datetime.datetime.utcnow()
    rand_suffix = random.randint(100000, 999999)
    return f"SAO-{now.strftime('%Y%m%d-%H%M%S')}-{rand_suffix}"

def to_iso_now() -> str:
    return datetime.datetime.utcnow().isoformat() + "Z"

class SheetsService:
    def __init__(self, client: Optional[GoogleSheetsClient] = None):
        self.client = client or sheets_client
        self.cache = sheets_cache

    # =========================================================================
    # 1. CATEGORIES
    # =========================================================================

    def get_categories(self, only_active: bool = True) -> List[Dict[str, Any]]:
        cached = self.cache.get_categories()
        if cached is not None:
            if only_active:
                return [c for c in cached if str(c.get("is_active", "True")).lower() in ("true", "1", "yes")]
            return cached

        raw_categories = self.client.read_sheet("Categories")
        categories = []
        for r in raw_categories:
            try:
                cat_id = int(r.get("category_id"))
            except (ValueError, TypeError):
                continue

            name = str(r.get("category_name", "")).strip()
            slug = str(r.get("slug", "")).strip() or re.sub(r"[^\w\s-]", "", name).strip().lower().replace(" ", "-")
            is_active = str(r.get("is_active", "True")).lower() in ("true", "1", "yes")

            categories.append({
                "id": cat_id,
                "name": name,
                "slug": slug,
                "description": str(r.get("description", "")),
                "image_url": str(r.get("image_url", "")),
                "icon": None,
                "display_order": cat_id,
                "is_active": is_active,
            })

        categories.sort(key=lambda c: c["id"])
        self.cache.set_categories(categories)
        if only_active:
            return [c for c in categories if c["is_active"]]
        return categories

    def get_category_by_id(self, category_id: int) -> Optional[Dict[str, Any]]:
        categories = self.get_categories(only_active=False)
        for c in categories:
            if c["id"] == category_id:
                return c
        return None

    def get_category_by_slug(self, slug: str) -> Optional[Dict[str, Any]]:
        target = slug.strip().lower()
        categories = self.get_categories(only_active=False)
        for c in categories:
            if c["slug"].lower() == target:
                return c
        return None

    def create_category(self, data: Dict[str, Any]) -> Dict[str, Any]:
        categories = self.get_categories(only_active=False)
        next_id = max([c["id"] for c in categories], default=0) + 1
        name = data.get("name", "").strip()
        slug = data.get("slug", "").strip() or re.sub(r"[^\w\s-]", "", name).strip().lower().replace(" ", "-")

        record = {
            "category_id": next_id,
            "category_name": name,
            "slug": slug,
            "description": data.get("description", ""),
            "image_url": data.get("image_url", ""),
            "is_active": "True" if data.get("is_active", True) else "False"
        }
        self.client.append_row("Categories", record)
        self.cache.invalidate_categories()
        return self.get_category_by_id(next_id) or record

    # =========================================================================
    # 2. PRODUCTS & INVENTORY
    # =========================================================================

    def _convert_sheet_row_to_product(self, row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            prod_id = int(row.get("product_id"))
        except (ValueError, TypeError):
            return None

        name = str(row.get("product_name", "")).strip()
        if not name:
            return None

        slug = str(row.get("slug", "")).strip() or re.sub(r"[^\w\s-]", "", name).strip().lower().replace(" ", "-")
        try:
            cat_id = int(row.get("category_id", 1))
        except (ValueError, TypeError):
            cat_id = 1

        price = float(row.get("price", 0.0) or 0.0)
        orig_price = float(row.get("original_price", price) or price)
        if orig_price <= 0:
            orig_price = price

        try:
            stock = int(row.get("stock_quantity", 50))
        except (ValueError, TypeError):
            stock = 50

        image_url = str(row.get("image_url", "")).strip()
        addl_images_str = str(row.get("additional_images", "")).strip()
        addl_images = [img.strip() for img in addl_images_str.split(",") if img.strip()]

        unit = str(row.get("unit", "1 Unit")).strip() or "Standard Pack"
        weight = str(row.get("weight", "")).strip()
        is_available = str(row.get("is_available", "True")).lower() in ("true", "1", "yes")
        is_featured = str(row.get("is_featured", "False")).lower() in ("true", "1", "yes")

        # Construct image objects expected by React frontend
        images = []
        if image_url:
            images.append({"id": 1, "image_url": image_url, "is_primary": True, "display_order": 0, "alt_text": name})
        for idx, img in enumerate(addl_images, start=2):
            images.append({"id": idx, "image_url": img, "is_primary": False, "display_order": idx - 1, "alt_text": f"{name} detail {idx}"})

        # Construct single variant object matching frontend expectations
        variants = [{
            "id": prod_id,  # ProductVariant ID matches product ID for simple Sheets mapping
            "product_id": prod_id,
            "unit": unit,
            "pack_size": weight or unit,
            "price": price,
            "mrp": orig_price,
            "stock": stock,
            "sku": f"SKU-{prod_id:04d}",
            "is_default": True
        }]

        return {
            "id": prod_id,
            "name": name,
            "slug": slug,
            "category_id": cat_id,
            "description": str(row.get("description", "")),
            "short_description": str(row.get("description", ""))[:180] + "...",
            "brand": "Sri Adithya Organics",
            "origin_farm": "Traditional Wood-Press Mills, Tamil Nadu / Karnataka",
            "certifications": "100% Certified Organic, Cold-Pressed",
            "storage_instructions": "Store in cool, dry place away from direct sunlight",
            "allergens": None,
            "ingredients": name,
            "is_featured": is_featured,
            "is_fresh_today": True,
            "is_deal": orig_price > price,
            "is_best_seller": is_featured,
            "is_active": is_available,
            "min_price": price,
            "max_price": price,
            "in_stock": stock > 0 and is_available,
            "created_at": str(row.get("created_at", to_iso_now())),
            "variants": variants,
            "images": images,
        }

    def get_all_products(self) -> List[Dict[str, Any]]:
        """Reads products with caching to prevent exhausting Google Sheets quotas."""
        cached = self.cache.get_products()
        if cached is not None:
            return cached

        raw_rows = self.client.read_sheet("Products")
        products = []
        for r in raw_rows:
            p = self._convert_sheet_row_to_product(r)
            if p:
                products.append(p)

        products.sort(key=lambda p: p["id"])
        self.cache.set_products(products)
        return products

    def get_products(
        self,
        category_id: Optional[int] = None,
        category_slug: Optional[str] = None,
        collection: Optional[str] = None,
        search: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        in_stock_only: bool = False,
        sort: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Filtered, searched, and paginated product query served from cache."""
        all_prods = self.get_all_products()
        filtered = [p for p in all_prods if p["is_active"]]

        # Category filter
        if category_slug:
            cat = self.get_category_by_slug(category_slug)
            if cat:
                filtered = [p for p in filtered if p["category_id"] == cat["id"]]
            else:
                filtered = []
        elif category_id:
            filtered = [p for p in filtered if p["category_id"] == category_id]

        # Collection filter
        if collection:
            c = collection.lower()
            if c == "best_sellers":
                filtered = [p for p in filtered if p["is_best_seller"]]
            elif c == "fresh_today":
                filtered = [p for p in filtered if p["is_fresh_today"]]
            elif c == "deals":
                filtered = [p for p in filtered if p["is_deal"]]
            elif c == "featured":
                filtered = [p for p in filtered if p["is_featured"]]

        # Text search
        if search and search.strip():
            q = search.strip().lower()
            filtered = [
                p for p in filtered
                if q in p["name"].lower() or q in p["description"].lower() or q in p["slug"].lower()
            ]

        # Stock and Price filter
        if in_stock_only:
            filtered = [p for p in filtered if p["in_stock"]]
        if min_price is not None:
            filtered = [p for p in filtered if p["min_price"] >= min_price]
        if max_price is not None:
            filtered = [p for p in filtered if p["min_price"] <= max_price]

        # Sorting
        if sort == "price_asc":
            filtered.sort(key=lambda p: p["min_price"])
        elif sort == "price_desc":
            filtered.sort(key=lambda p: p["min_price"], reverse=True)
        elif sort == "popular":
            filtered.sort(key=lambda p: (1 if p["is_best_seller"] else 0, p["id"]), reverse=True)

        return filtered[offset: offset + limit]

    def get_product_by_id_or_slug(self, identifier: str) -> Optional[Dict[str, Any]]:
        all_prods = self.get_all_products()
        target = str(identifier).strip().lower()
        for p in all_prods:
            if str(p["id"]) == target or p["slug"].lower() == target:
                return p
        return None

    def create_product(self, data: Dict[str, Any]) -> Dict[str, Any]:
        all_prods = self.get_all_products()
        next_id = max([p["id"] for p in all_prods], default=0) + 1
        name = data.get("name", "").strip()
        slug = data.get("slug", "").strip() or re.sub(r"[^\w\s-]", "", name).strip().lower().replace(" ", "-")

        record = {
            "product_id": next_id,
            "product_name": name,
            "slug": slug,
            "description": data.get("description", ""),
            "category_id": data.get("category_id", 1),
            "price": data.get("price", 0.0),
            "original_price": data.get("mrp") or data.get("original_price") or data.get("price", 0.0),
            "stock_quantity": data.get("stock") or data.get("stock_quantity", 50),
            "image_url": data.get("image_url", ""),
            "additional_images": data.get("additional_images", ""),
            "unit": data.get("unit", "1 Unit"),
            "weight": data.get("weight", ""),
            "is_available": "True" if data.get("is_active", True) else "False",
            "is_featured": "True" if data.get("is_featured", False) else "False",
            "created_at": to_iso_now(),
            "updated_at": to_iso_now()
        }
        self.client.append_row("Products", record)
        self.cache.invalidate_products()
        return self.get_product_by_id_or_slug(str(next_id)) or record

    def update_product_stock(self, product_id: int, new_stock: int, reason: str = "Admin adjustment") -> bool:
        """Atomic stock update with audit logging to Inventory_Logs worksheet."""
        with self.cache.order_lock:
            # Authoritative read directly from sheet
            rows = self.client.read_sheet("Products")
            target_row = None
            for r in rows:
                if str(r.get("product_id")) == str(product_id):
                    target_row = r
                    break

            if not target_row:
                return False

            prev_stock = int(target_row.get("stock_quantity", 0) or 0)
            diff = new_stock - prev_stock

            # 1. Update stock in Products sheet
            self.client.update_row_by_key(
                "Products",
                "product_id",
                product_id,
                {"stock_quantity": new_stock, "updated_at": to_iso_now()}
            )

            # 2. Append to Inventory_Logs sheet
            logs = self.client.read_sheet("Inventory_Logs")
            next_log_id = max([int(l.get("log_id", 0)) for l in logs if str(l.get("log_id", "")).isdigit()], default=0) + 1
            log_record = {
                "log_id": next_log_id,
                "product_id": product_id,
                "previous_stock": prev_stock,
                "changed_stock": diff,
                "new_stock": new_stock,
                "reason": reason,
                "created_at": to_iso_now()
            }
            self.client.append_row("Inventory_Logs", log_record)

            self.cache.invalidate_products()
            return True

    # =========================================================================
    # 3. CUSTOMERS & AUTHENTICATION
    # =========================================================================

    def get_customer_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        target = email.strip().lower()
        rows = self.client.read_sheet("Customers")
        for r in rows:
            if str(r.get("email", "")).strip().lower() == target:
                try:
                    c_id = int(r.get("customer_id"))
                except (ValueError, TypeError):
                    c_id = 1
                return {
                    "id": c_id,
                    "customer_id": c_id,
                    "name": str(r.get("name", "")),
                    "phone": str(r.get("phone", "")),
                    "email": str(r.get("email", "")),
                    "password_hash": str(r.get("password_hash", "")),
                    "hashed_password": str(r.get("password_hash", "")),
                    "role": str(r.get("role", "customer")),
                    "is_active": True,
                    "created_at": str(r.get("created_at", to_iso_now()))
                }
        return None

    def get_customer_by_id(self, customer_id: int) -> Optional[Dict[str, Any]]:
        rows = self.client.read_sheet("Customers")
        for r in rows:
            if str(r.get("customer_id", "")).strip() == str(customer_id):
                return {
                    "id": customer_id,
                    "customer_id": customer_id,
                    "name": str(r.get("name", "")),
                    "phone": str(r.get("phone", "")),
                    "email": str(r.get("email", "")),
                    "password_hash": str(r.get("password_hash", "")),
                    "hashed_password": str(r.get("password_hash", "")),
                    "role": str(r.get("role", "customer")),
                    "is_active": True,
                    "created_at": str(r.get("created_at", to_iso_now()))
                }
        return None

    def create_customer(self, name: str, email: str, phone: str, hashed_password: str, role: str = "customer") -> Dict[str, Any]:
        rows = self.client.read_sheet("Customers")
        next_id = max([int(r.get("customer_id", 0)) for r in rows if str(r.get("customer_id", "")).isdigit()], default=0) + 1
        
        record = {
            "customer_id": next_id,
            "name": name.strip(),
            "phone": phone.strip(),
            "email": email.strip().lower(),
            "password_hash": hashed_password,
            "role": role,
            "created_at": to_iso_now()
        }
        self.client.append_row("Customers", record)
        return self.get_customer_by_id(next_id) or record

    # =========================================================================
    # 4. ADDRESSES & LIVE GPS
    # =========================================================================

    def get_customer_addresses(self, customer_id: int) -> List[Dict[str, Any]]:
        rows = self.client.read_sheet("Addresses")
        addresses = []
        for r in rows:
            if str(r.get("customer_id", "")).strip() == str(customer_id):
                try:
                    a_id = int(r.get("address_id"))
                except (ValueError, TypeError):
                    continue

                lat = float(r["latitude"]) if r.get("latitude") not in ("", None) else None
                lon = float(r["longitude"]) if r.get("longitude") not in ("", None) else None
                acc = float(r["gps_accuracy_meters"]) if r.get("gps_accuracy_meters") not in ("", None) else None

                addresses.append({
                    "id": a_id,
                    "user_id": customer_id,
                    "customer_id": customer_id,
                    "label": "Home",
                    "recipient_name": str(r.get("house_number", "")),
                    "phone": "",
                    "house_number": str(r.get("house_number", "")),
                    "apartment": str(r.get("building_name", "")),
                    "street": str(r.get("street", "")),
                    "locality": str(r.get("locality", "")),
                    "landmark": str(r.get("landmark", "")),
                    "city": str(r.get("city", "Bengaluru")),
                    "district": str(r.get("district", "")),
                    "state": str(r.get("state", "Karnataka")),
                    "postal_code": str(r.get("pincode", "")),
                    "latitude": lat,
                    "longitude": lon,
                    "accuracy_meters": acc,
                    "formatted_address": f"{r.get('street', '')}, {r.get('city', '')} - {r.get('pincode', '')}",
                    "is_confirmed": str(r.get("is_confirmed", "True")).lower() in ("true", "1", "yes"),
                    "is_default": len(addresses) == 0,
                    "created_at": str(r.get("created_at", to_iso_now()))
                })
        return addresses

    def create_address(self, customer_id: int, addr_in: Dict[str, Any]) -> Dict[str, Any]:
        rows = self.client.read_sheet("Addresses")
        next_id = max([int(r.get("address_id", 0)) for r in rows if str(r.get("address_id", "")).isdigit()], default=0) + 1

        record = {
            "address_id": next_id,
            "customer_id": customer_id,
            "house_number": addr_in.get("house_number") or addr_in.get("apartment") or "",
            "building_name": addr_in.get("building_name") or addr_in.get("apartment") or "",
            "street": addr_in.get("street", ""),
            "locality": addr_in.get("locality", ""),
            "landmark": addr_in.get("landmark", ""),
            "city": addr_in.get("city", "Bengaluru"),
            "district": addr_in.get("district", ""),
            "state": addr_in.get("state", "Karnataka"),
            "pincode": addr_in.get("postal_code") or addr_in.get("pincode", ""),
            "latitude": addr_in.get("latitude", ""),
            "longitude": addr_in.get("longitude", ""),
            "gps_accuracy_meters": addr_in.get("accuracy_meters", ""),
            "is_confirmed": "True",
            "created_at": to_iso_now()
        }
        self.client.append_row("Addresses", record)
        return {
            "id": next_id,
            "user_id": customer_id,
            "customer_id": customer_id,
            "label": addr_in.get("label", "Home"),
            "recipient_name": addr_in.get("recipient_name", ""),
            "phone": addr_in.get("phone", ""),
            "street": record["street"],
            "apartment": record["building_name"],
            "house_number": record["house_number"],
            "locality": record["locality"],
            "landmark": record["landmark"],
            "city": record["city"],
            "state": record["state"],
            "postal_code": record["pincode"],
            "latitude": record["latitude"] or None,
            "longitude": record["longitude"] or None,
            "accuracy_meters": record["gps_accuracy_meters"] or None,
            "is_default": addr_in.get("is_default", False),
            "created_at": record["created_at"]
        }

    def update_address(self, customer_id: int, address_id: int, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        rows = self.client.read_sheet("Addresses")
        target = None
        for r in rows:
            if str(r.get("address_id")) == str(address_id) and str(r.get("customer_id")) == str(customer_id):
                target = r
                break
        if not target:
            return None

        fields = {}
        if "street" in update_data: fields["street"] = update_data["street"]
        if "city" in update_data: fields["city"] = update_data["city"]
        if "state" in update_data: fields["state"] = update_data["state"]
        if "postal_code" in update_data: fields["pincode"] = update_data["postal_code"]
        if "latitude" in update_data: fields["latitude"] = update_data["latitude"]
        if "longitude" in update_data: fields["longitude"] = update_data["longitude"]
        if "accuracy_meters" in update_data: fields["gps_accuracy_meters"] = update_data["accuracy_meters"]

        self.client.update_row_by_key("Addresses", "address_id", address_id, fields)
        addrs = self.get_customer_addresses(customer_id)
        return next((a for a in addrs if a["id"] == address_id), None)

    def set_default_address(self, customer_id: int, address_id: int) -> Optional[Dict[str, Any]]:
        addrs = self.get_customer_addresses(customer_id)
        found = False
        for a in addrs:
            if a["id"] == address_id:
                found = True
                a["is_default"] = True
            else:
                a["is_default"] = False
        if not found:
            return None
        return next((a for a in addrs if a["id"] == address_id), None)

    def delete_address(self, customer_id: int, address_id: int) -> bool:
        if not self.client._is_live_connected:
            sheet_rows = self.client._offline_data.get("Addresses", [])
            if not sheet_rows:
                return False
            new_rows = [sheet_rows[0]]
            found = False
            for r in sheet_rows[1:]:
                if str(r[0]) == str(address_id) and str(r[1]) == str(customer_id):
                    found = True
                    continue
                new_rows.append(r)
            if found:
                self.client._offline_data["Addresses"] = new_rows
                self.client._save_offline_store()
            return found
        return True

    # =========================================================================
    # 5. ATOMIC ORDER CREATION & INVENTORY LOCKING
    # =========================================================================

    def create_order(
        self,
        customer_id: Optional[int],
        customer_name: str,
        customer_phone: str,
        items_requested: List[Dict[str, Any]],  # [{"product_id": int, "variant_id": int, "quantity": int}]
        delivery_address: Dict[str, Any],
        delivery_slot: str = "Instant 15-30 Mins",
        payment_method: str = "cod",
        customer_notes: Optional[str] = None,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Atomic order placement using backend thread lock.
        Validates stock against authoritative sheet, prevents overselling,
        records inventory log entries, and appends to Orders and Order_Items sheets.
        """
        with self.cache.order_lock:
            # 1. Idempotency Check
            if idempotency_key:
                existing_orders = self.client.read_sheet("Orders")
                for eo in existing_orders:
                    if str(eo.get("customer_notes", "")).startswith(f"IDEM:{idempotency_key}") or str(eo.get("order_id", "")).endswith(idempotency_key[-6:]):
                        full_ord = self.get_order_by_id(str(eo.get("order_id")))
                        if full_ord:
                            return full_ord

            # 2. Authoritative Price & Stock Check directly against Products worksheet
            raw_products = self.client.read_sheet("Products")
            products_map = {str(r.get("product_id")): r for r in raw_products}

            order_items_to_create = []
            stock_updates_to_apply = []
            subtotal = 0.0

            for it in items_requested:
                p_id = str(it.get("product_id"))
                qty = int(it.get("quantity", 1))
                if qty <= 0:
                    continue

                prod_row = products_map.get(p_id)
                if not prod_row:
                    raise ValueError(f"Requested product ID {p_id} not found in inventory catalogue.")

                current_stock = int(prod_row.get("stock_quantity", 0) or 0)
                p_name = str(prod_row.get("product_name", "Organic Product"))
                p_unit = str(prod_row.get("unit", "1 Unit"))
                p_price = float(prod_row.get("price", 0.0))
                p_mrp = float(prod_row.get("original_price", p_price) or p_price)

                if current_stock < qty:
                    raise ValueError(
                        f"Insufficient stock for {p_name} ({p_unit}). Available: {current_stock}, requested: {qty}."
                    )

                line_total = round(p_price * qty, 2)
                subtotal += line_total

                order_items_to_create.append({
                    "product_id": int(p_id),
                    "product_name": f"{p_name} ({p_unit})",
                    "variant_name": p_unit,
                    "quantity": qty,
                    "unit_price": p_price,
                    "mrp": p_mrp,
                    "line_total": line_total,
                    "image_url": str(prod_row.get("image_url", ""))
                })

                stock_updates_to_apply.append({
                    "product_id": int(p_id),
                    "prev_stock": current_stock,
                    "new_stock": current_stock - qty,
                    "qty_decremented": qty
                })

            if not order_items_to_create:
                raise ValueError("Cannot place an order with empty items.")

            # 3. Delivery fee & final total calculation
            settings_data = self.get_settings()
            free_thresh = settings_data.get("free_delivery_threshold", 499.0)
            standard_fee = settings_data.get("standard_delivery_fee", 39.0)
            delivery_fee = 0.0 if subtotal >= free_thresh else standard_fee
            final_total = round(subtotal + delivery_fee, 2)

            # 4. Generate Order ID
            order_id = generate_order_number()

            # 5. Deduct Stock in Products sheet & record in Inventory_Logs
            logs_to_append = []
            logs = self.client.read_sheet("Inventory_Logs")
            next_log_id = max([int(l.get("log_id", 0)) for l in logs if str(l.get("log_id", "")).isdigit()], default=0) + 1

            for su in stock_updates_to_apply:
                self.client.update_row_by_key(
                    "Products",
                    "product_id",
                    su["product_id"],
                    {"stock_quantity": su["new_stock"], "updated_at": to_iso_now()}
                )
                logs_to_append.append({
                    "log_id": next_log_id,
                    "product_id": su["product_id"],
                    "previous_stock": su["prev_stock"],
                    "changed_stock": -su["qty_decremented"],
                    "new_stock": su["new_stock"],
                    "reason": f"Customer Order #{order_id}",
                    "created_at": to_iso_now()
                })
                next_log_id += 1

            if logs_to_append:
                self.client.append_rows("Inventory_Logs", logs_to_append)

            # 6. Append to Orders Worksheet
            address_json_str = json.dumps(delivery_address)
            notes_str = f"IDEM:{idempotency_key} | {customer_notes}" if idempotency_key else (customer_notes or "")

            order_record = {
                "order_id": order_id,
                "customer_id": customer_id or "",
                "customer_name": customer_name,
                "phone": customer_phone,
                "subtotal": round(subtotal, 2),
                "delivery_charge": round(delivery_fee, 2),
                "final_total": final_total,
                "payment_method": payment_method,
                "payment_status": "pending",
                "order_status": "pending_whatsapp" if "whatsapp" in payment_method.lower() else "confirmed",
                "delivery_address_id": delivery_address.get("id", ""),
                "customer_notes": notes_str,
                "whatsapp_status": "pending_customer_send",
                "delivery_slot": delivery_slot,
                "delivery_address_json": address_json_str,
                "created_at": to_iso_now(),
                "updated_at": to_iso_now()
            }
            self.client.append_row("Orders", order_record)

            # 7. Append items to Order_Items Worksheet
            items_rows = self.client.read_sheet("Order_Items")
            next_item_id = max([int(i.get("order_item_id", 0)) for i in items_rows if str(i.get("order_item_id", "")).isdigit()], default=0) + 1
            
            order_items_records = []
            for item in order_items_to_create:
                order_items_records.append({
                    "order_item_id": next_item_id,
                    "order_id": order_id,
                    "product_id": item["product_id"],
                    "product_name": item["product_name"],
                    "quantity": item["quantity"],
                    "unit_price": item["unit_price"],
                    "line_total": item["line_total"]
                })
                next_item_id += 1

            self.client.append_rows("Order_Items", order_items_records)

            # Invalidate products cache
            self.cache.invalidate_products()

            return {
                "id": int(order_id.replace("SAO-", "").replace("-", "")[:9]),
                "order_number": order_id,
                "customer_id": customer_id,
                "customer_name": customer_name,
                "customer_phone": customer_phone,
                "status": order_record["order_status"],
                "subtotal": subtotal,
                "delivery_fee": delivery_fee,
                "discount": 0.0,
                "tax": 0.0,
                "total_amount": final_total,
                "delivery_slot": delivery_slot,
                "delivery_address_json": address_json_str,
                "notes": customer_notes,
                "admin_notes": None,
                "payment_method": payment_method,
                "payment_status": "pending",
                "payment_id": f"WA-{idempotency_key}" if idempotency_key else f"PAY-{order_id}",
                "created_at": order_record["created_at"],
                "updated_at": order_record["updated_at"],
                "items": [
                    {
                        "id": r["order_item_id"],
                        "product_id": r["product_id"],
                        "variant_id": r["product_id"],
                        "product_name": r["product_name"],
                        "variant_name": "Standard Pack",
                        "unit_price": r["unit_price"],
                        "mrp": r["unit_price"],
                        "quantity": r["quantity"],
                        "total_price": r["line_total"],
                        "image_url": None
                    }
                    for r in order_items_records
                ]
            }

    def create_whatsapp_order(
        self,
        customer_name: str,
        customer_phone: str,
        items_requested: List[Dict[str, Any]],
        delivery_address: Dict[str, Any],
        delivery_slot: str = "Instant 15-30 Mins",
        payment_method: str = "cod",
        customer_notes: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        optional_user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Creates order in Google Sheets and formats pre-filled WhatsApp click-to-chat message."""
        created_order = self.create_order(
            customer_id=optional_user_id,
            customer_name=customer_name,
            customer_phone=customer_phone,
            items_requested=items_requested,
            delivery_address=delivery_address,
            delivery_slot=delivery_slot,
            payment_method=f"whatsapp_{payment_method.lower()}",
            customer_notes=customer_notes,
            idempotency_key=idempotency_key
        )

        settings_data = self.get_settings()
        raw_whatsapp_num = settings_data.get("whatsapp_number", "919515159006")
        whatsapp_num = re.sub(r"\D", "", raw_whatsapp_num) or "919515159006"
        if len(whatsapp_num) == 10:
            whatsapp_num = f"91{whatsapp_num}"

        # Generate WhatsApp message with live GPS location
        lines = [
            "*Sri Adithya Organics - New Order Request*",
            "---------------------------------------",
            f"*Order Reference:* {created_order['order_number']}",
            "*Status:* Pending WhatsApp Confirmation",
            "",
            "*Customer Details:*",
            f"• Name: {customer_name}",
            f"• Phone: {customer_phone}",
            "",
            "*Delivery Address & Live Location:*",
            f"{delivery_address.get('street', '')}, {delivery_address.get('apartment', '') or ''}".strip(", "),
            f"{delivery_address.get('city', '')} - {delivery_address.get('postal_code', '')}",
        ]

        if delivery_address.get("landmark"):
            lines.append(f"• Landmark: {delivery_address.get('landmark')}")

        lat = delivery_address.get("latitude")
        lon = delivery_address.get("longitude")
        acc = delivery_address.get("accuracy_meters")
        if lat is not None and lon is not None:
            try:
                lat_f = float(lat)
                lon_f = float(lon)
                maps_link = f"https://maps.google.com/?q={lat_f:.6f},{lon_f:.6f}"
                acc_text = f" (GPS Precision: ±{round(float(acc))}m)" if acc else ""
                lines.append(f"• Live GPS Location: {maps_link}{acc_text}")
            except (ValueError, TypeError):
                lines.append(f"• Live GPS Location: https://maps.google.com/?q={lat},{lon}")

        lines.append(f"• Delivery Slot: {delivery_slot}")
        if customer_notes and customer_notes.strip():
            lines.append(f"• Special Instructions: {customer_notes.strip()}")

        lines.extend([
            "",
            "*Items Ordered:*",
        ])
        for idx, item in enumerate(created_order["items"], 1):
            lines.append(f"{idx}. {item['product_name']}")
            lines.append(f"   Qty: {item['quantity']} x Rs {item['unit_price']:.2f} = Rs {item['total_price']:.2f}")

        delivery_fee_str = "FREE" if created_order["delivery_fee"] == 0.0 else f"Rs {created_order['delivery_fee']:.2f}"
        lines.extend([
            "---------------------------------------",
            f"*Subtotal:* Rs {created_order['subtotal']:.2f}",
            f"*Delivery Charges:* {delivery_fee_str}",
            f"*Final Total:* Rs {created_order['total_amount']:.2f}",
            f"*Payment Preference:* {'Cash on Delivery (COD)' if 'cod' in payment_method.lower() else 'Online Payment / UPI'}",
            "---------------------------------------",
            "",
            "Please confirm my order and dispatch timeline. Thank you!"
        ])

        msg = "\n".join(lines)
        encoded_msg = urllib.parse.quote(msg)
        whatsapp_url = f"https://wa.me/{whatsapp_num}?text={encoded_msg}"

        return {
            "order": created_order,
            "whatsapp_url": whatsapp_url,
            "whatsapp_message": msg,
            "whatsapp_number": whatsapp_num
        }

    def get_order_by_id(self, order_id: str) -> Optional[Dict[str, Any]]:
        orders = self.client.read_sheet("Orders")
        target_row = None
        for r in orders:
            if str(r.get("order_id", "")).strip() == str(order_id).strip():
                target_row = r
                break
        if not target_row:
            return None

        # Fetch matching items from Order_Items
        items_rows = self.client.read_sheet("Order_Items")
        items = []
        for ir in items_rows:
            if str(ir.get("order_id", "")).strip() == str(order_id).strip():
                items.append({
                    "id": int(ir.get("order_item_id", 1)),
                    "product_id": int(ir.get("product_id", 1)),
                    "variant_id": int(ir.get("product_id", 1)),
                    "product_name": str(ir.get("product_name", "")),
                    "variant_name": "Standard Pack",
                    "unit_price": float(ir.get("unit_price", 0.0)),
                    "mrp": float(ir.get("unit_price", 0.0)),
                    "quantity": int(ir.get("quantity", 1)),
                    "total_price": float(ir.get("line_total", 0.0)),
                    "image_url": None
                })

        try:
            cust_id = int(target_row.get("customer_id")) if target_row.get("customer_id") else None
        except (ValueError, TypeError):
            cust_id = None

        raw_num = str(order_id).replace("SAO-", "").replace("-", "")[:9]
        numeric_id = int(raw_num) if raw_num.isdigit() else 1

        return {
            "id": numeric_id,
            "order_number": target_row.get("order_id"),
            "customer_id": cust_id,
            "user_id": cust_id,
            "customer_name": target_row.get("customer_name"),
            "phone": target_row.get("phone"),
            "status": target_row.get("order_status", "confirmed"),
            "subtotal": float(target_row.get("subtotal", 0.0)),
            "discount": 0.0,
            "delivery_fee": float(target_row.get("delivery_charge", 0.0)),
            "tax": 0.0,
            "total_amount": float(target_row.get("final_total", 0.0)),
            "delivery_slot": target_row.get("delivery_slot", "Instant 15-30 Mins"),
            "delivery_address_json": target_row.get("delivery_address_json", "{}"),
            "notes": target_row.get("customer_notes"),
            "admin_notes": None,
            "payment_method": target_row.get("payment_method", "cod"),
            "payment_status": target_row.get("payment_status", "pending"),
            "payment_id": f"PAY-{order_id}",
            "created_at": target_row.get("created_at"),
            "updated_at": target_row.get("updated_at"),
            "items": items
        }

    def get_all_orders(self, status_filter: Optional[str] = None, search: Optional[str] = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        orders = self.client.read_sheet("Orders")
        # Load order items in a single read call to prevent N+1 API exhaustion
        items_rows = self.client.read_sheet("Order_Items")
        items_by_order = {}
        for ir in items_rows:
            o_id = str(ir.get("order_id", "")).strip()
            items_by_order.setdefault(o_id, []).append({
                "id": int(ir.get("order_item_id", 1)),
                "product_id": int(ir.get("product_id", 1)),
                "variant_id": int(ir.get("product_id", 1)),
                "product_name": str(ir.get("product_name", "")),
                "variant_name": "Standard Pack",
                "unit_price": float(ir.get("unit_price", 0.0)),
                "mrp": float(ir.get("unit_price", 0.0)),
                "quantity": int(ir.get("quantity", 1)),
                "total_price": float(ir.get("line_total", 0.0)),
                "image_url": None
            })

        filtered = []
        for target_row in reversed(orders):
            st = str(target_row.get("order_status", "")).strip().lower()
            if status_filter and status_filter.lower() != "all" and st != status_filter.lower():
                continue
            if search and search.strip():
                q = search.strip().lower()
                o_num = str(target_row.get("order_id", "")).lower()
                c_name = str(target_row.get("customer_name", "")).lower()
                phone = str(target_row.get("phone", "")).lower()
                c_id = str(target_row.get("customer_id", "")).lower()
                if q not in o_num and q not in c_name and q not in phone and q != c_id:
                    continue

            order_id = str(target_row.get("order_id"))
            try:
                cust_id = int(target_row.get("customer_id")) if target_row.get("customer_id") else None
            except (ValueError, TypeError):
                cust_id = None

            raw_num = str(order_id).replace("SAO-", "").replace("-", "")[:9]
            numeric_id = int(raw_num) if raw_num.isdigit() else 1

            filtered.append({
                "id": numeric_id,
                "order_number": target_row.get("order_id"),
                "customer_id": cust_id,
                "user_id": cust_id,
                "customer_name": target_row.get("customer_name"),
                "phone": target_row.get("phone"),
                "status": target_row.get("order_status", "confirmed"),
                "subtotal": float(target_row.get("subtotal", 0.0)),
                "discount": 0.0,
                "delivery_fee": float(target_row.get("delivery_charge", 0.0)),
                "tax": 0.0,
                "total_amount": float(target_row.get("final_total", 0.0)),
                "delivery_slot": target_row.get("delivery_slot", "Instant 15-30 Mins"),
                "delivery_address_json": target_row.get("delivery_address_json", "{}"),
                "notes": target_row.get("customer_notes"),
                "admin_notes": None,
                "payment_method": target_row.get("payment_method", "cod"),
                "payment_status": target_row.get("payment_status", "pending"),
                "payment_id": f"PAY-{order_id}",
                "created_at": target_row.get("created_at"),
                "updated_at": target_row.get("updated_at"),
                "items": items_by_order.get(order_id.strip(), [])
            })

        return filtered[offset: offset + limit]

    def update_order_status(self, order_id: str, new_status: str, admin_notes: Optional[str] = None) -> bool:
        update_fields = {
            "order_status": new_status,
            "updated_at": to_iso_now()
        }
        if admin_notes:
            update_fields["customer_notes"] = admin_notes
        return self.client.update_row_by_key("Orders", "order_id", order_id, update_fields)

    # =========================================================================
    # 6. STORE SETTINGS
    # =========================================================================

    def get_settings(self) -> Dict[str, Any]:
        cached = self.cache.get_settings()
        if cached is not None:
            return cached

        rows = self.client.read_sheet("Store_Settings")
        settings_dict = {
            "min_order_amount": 99.0,
            "free_delivery_threshold": 499.0,
            "standard_delivery_fee": 39.0,
            "express_delivery_fee": 59.0,
            "whatsapp_number": "919515159006",
            "announcement_text": "Sri Adithya Organics • 100% Pure Wood-Pressed Oils & Certified Organic Produce • Free Delivery over ₹499",
            "active_slots_json": json.dumps([
                "Express Delivery (15-30 Mins)",
                "Morning Harvest Slot (7:00 AM - 9:30 AM)",
                "Evening Slot (5:30 PM - 8:00 PM)",
                "Tomorrow Morning (7:00 AM - 9:30 AM)"
            ])
        }

        for r in rows:
            k = str(r.get("setting_key", "")).strip()
            v = r.get("setting_value")
            if k in settings_dict:
                try:
                    if k in ("min_order_amount", "free_delivery_threshold", "standard_delivery_fee", "express_delivery_fee"):
                        settings_dict[k] = float(v)
                    else:
                        settings_dict[k] = str(v)
                except (ValueError, TypeError):
                    pass

        self.cache.set_settings(settings_dict)
        return settings_dict

    def update_settings(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        curr = self.get_settings()
        for k, v in updates.items():
            if k in curr:
                curr[k] = v
                self.client.update_row_by_key("Store_Settings", "setting_key", k, {
                    "setting_value": str(v),
                    "updated_at": to_iso_now()
                })
        self.cache.invalidate_settings()
        return curr

    def get_dashboard_stats(self) -> Dict[str, Any]:
        all_orders = self.client.read_sheet("Orders")
        total_rev = sum(float(o.get("final_total", 0.0) or 0.0) for o in all_orders if str(o.get("order_status", "")).lower() != "cancelled")
        total_orders = len(all_orders)
        pending_orders = sum(1 for o in all_orders if str(o.get("order_status", "")).lower() in ("pending", "confirmed", "pending_whatsapp"))
        all_prods = self.get_all_products()
        total_products = len(all_prods)
        low_stock_count = sum(1 for p in all_prods if p.get("variants") and p["variants"][0].get("stock", 0) < 10)
        cust_rows = self.client.read_sheet("Customers")
        total_customers = sum(1 for c in cust_rows if c.get("role") == "customer")
        return {
            "total_revenue": round(total_rev, 2),
            "total_orders": total_orders,
            "total_products": total_products,
            "total_customers": total_customers,
            "pending_orders": pending_orders,
            "low_stock_count": low_stock_count
        }

# Singleton Service Instance
sheets_service = SheetsService()

def get_sheets_service() -> SheetsService:
    return sheets_service
