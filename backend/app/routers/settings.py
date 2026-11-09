import re
import datetime
from fastapi import APIRouter, Depends, HTTPException
from backend.app.config import settings as app_settings
from backend.app.d1 import D1Database, get_d1
from backend.app.schemas import DeliverySettingOut, DeliverySettingUpdate, CourierRateTestRequest, CourierRateTestOut
from backend.app.deps import get_current_admin
from backend.app.events import broadcaster
from backend.app.courier import calculate_courier_shipping, DEFAULT_COURIER_ZONES

router = APIRouter(prefix="/settings", tags=["Store Settings"])

STORE_LOCATION_COLUMNS = {
    "store_name": "TEXT DEFAULT 'Sri Aditya Organics & Oil Mill'",
    "store_address": "TEXT DEFAULT 'Jilla Parishad Complex, Babu Camp Road, Ganeshbasthi, Opp. Babu Camp Ramalayam'",
    "store_city": "TEXT DEFAULT 'Kothagudem'",
    "store_district": "TEXT DEFAULT 'Bhadradri Kothagudem'",
    "store_state": "TEXT DEFAULT 'Telangana'",
    "store_pincode": "TEXT DEFAULT '507101'",
    "store_latitude": "REAL DEFAULT 17.5376",
    "store_longitude": "REAL DEFAULT 80.6210",
    "store_maps_url": "TEXT DEFAULT 'https://share.google/e1aO3V8FJQ7USIKzU'",
    "delivery_radius_km": "REAL DEFAULT 35.0",
    "max_express_radius_km": "REAL DEFAULT 15.0",
    "distance_slabs_json": "TEXT DEFAULT '[{\"min_km\":0,\"max_km\":2,\"fee\":20},{\"min_km\":2,\"max_km\":4,\"fee\":30},{\"min_km\":4,\"max_km\":6,\"fee\":40},{\"min_km\":6,\"max_km\":8,\"fee\":50},{\"min_km\":8,\"max_km\":10,\"fee\":60},{\"min_km\":10,\"max_km\":15,\"fee\":75},{\"min_km\":15,\"max_km\":35,\"fee\":99},{\"min_km\":35,\"max_km\":60,\"fee\":149}]'",
    "courier_enabled": "INTEGER DEFAULT 1",
    "courier_free_threshold": "REAL DEFAULT 999.0",
    "courier_partners_json": "TEXT DEFAULT '[\"Delhivery\", \"BlueDart\", \"India Post Speed Post\"]'",
    "courier_default_partner": "TEXT DEFAULT 'Delhivery'",
    "courier_delhivery_api_key": "TEXT DEFAULT ''",
    "courier_delhivery_client_id": "TEXT DEFAULT ''",
    "courier_shiprocket_email": "TEXT DEFAULT ''",
    "courier_shiprocket_token": "TEXT DEFAULT ''",
    "courier_rates_json": "TEXT DEFAULT ''",
    "courier_blacklisted_pins": "TEXT DEFAULT ''",
}

async def ensure_store_settings_schema(d1: D1Database):
    try:
        cols = await d1.fetch_all("PRAGMA table_info(delivery_settings)")
        existing_names = {c["name"] for c in cols} if cols else set()
        for col_name, col_def in STORE_LOCATION_COLUMNS.items():
            if col_name not in existing_names:
                try:
                    await d1.execute(f"ALTER TABLE delivery_settings ADD COLUMN {col_name} {col_def}")
                except Exception:
                    pass

        # Also ensure orders table has distance_km column
        order_cols = await d1.fetch_all("PRAGMA table_info(orders)")
        order_col_names = {c["name"] for c in order_cols} if order_cols else set()
        if "distance_km" not in order_col_names:
            try:
                await d1.execute("ALTER TABLE orders ADD COLUMN distance_km REAL DEFAULT NULL")
            except Exception:
                pass
    except Exception as e:
        print(f"[Settings] Migration notice: {e}")

@router.get("", response_model=DeliverySettingOut)
async def get_store_settings(d1: D1Database = Depends(get_d1)):
    await ensure_store_settings_schema(d1)
    setting = await d1.fetch_one("SELECT * FROM delivery_settings LIMIT 1")

    if not setting:
        sid = await d1.execute_insert(
            """
            INSERT INTO delivery_settings (
                min_order_amount, free_delivery_threshold, standard_delivery_fee, express_delivery_fee,
                active_slots_json, announcement_text, whatsapp_number,
                store_name, store_address, store_city, store_district, store_state, store_pincode,
                store_latitude, store_longitude, store_maps_url, delivery_radius_km, max_express_radius_km
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            99.0, 499.0, 39.0, 59.0,
            '["Express Delivery (15-30 Mins)", "Morning Slot (7:00 AM - 9:30 AM)", "Evening Slot (5:30 PM - 8:00 PM)"]',
            "Sri Adithya Organics • 100% Certified Organic • Free Delivery on orders over ₹499 • Harvested Fresh Today",
            "919515159006",
            "Sri Aditya Organics & Oil Mill",
            "Jilla Parishad Complex, Babu Camp Road, Ganeshbasthi, Opp. Babu Camp Ramalayam",
            "Kothagudem",
            "Bhadradri Kothagudem",
            "Telangana",
            "507101",
            17.5376,
            80.6210,
            "https://share.google/e1aO3V8FJQ7USIKzU",
            35.0,
            15.0
        )
        setting = await d1.fetch_one("SELECT * FROM delivery_settings WHERE id = ?", sid)
    elif not setting.get("whatsapp_number") or setting.get("whatsapp_number") in ["919876543210", "9876543210"]:
        await d1.execute("UPDATE delivery_settings SET whatsapp_number = '919515159006' WHERE id = ?", setting["id"])
        setting["whatsapp_number"] = "919515159006"

    # Default fallback values for unpopulated store location fields
    defaults = {
        "store_name": "Sri Aditya Organics & Oil Mill",
        "store_address": "Jilla Parishad Complex, Babu Camp Road, Ganeshbasthi, Opp. Babu Camp Ramalayam",
        "store_city": "Kothagudem",
        "store_district": "Bhadradri Kothagudem",
        "store_state": "Telangana",
        "store_pincode": "507101",
        "store_latitude": 17.5376,
        "store_longitude": 80.6210,
        "store_maps_url": "https://share.google/e1aO3V8FJQ7USIKzU",
        "delivery_radius_km": 35.0,
        "max_express_radius_km": 15.0,
        "distance_slabs_json": '[{"min_km":0,"max_km":2,"fee":20},{"min_km":2,"max_km":4,"fee":30},{"min_km":4,"max_km":6,"fee":40},{"min_km":6,"max_km":8,"fee":50},{"min_km":8,"max_km":10,"fee":60},{"min_km":10,"max_km":15,"fee":75},{"min_km":15,"max_km":35,"fee":99},{"min_km":35,"max_km":60,"fee":149}]',
        "courier_enabled": 1,
        "courier_free_threshold": 999.0,
        "courier_partners_json": '["Delhivery", "BlueDart", "India Post Speed Post"]',
        "courier_default_partner": "Delhivery",
        "courier_delhivery_api_key": "",
        "courier_delhivery_client_id": "",
        "courier_shiprocket_email": "",
        "courier_shiprocket_token": "",
        "courier_rates_json": json.dumps(DEFAULT_COURIER_ZONES),
        "courier_blacklisted_pins": "",
    }
    for k, v in defaults.items():
        if setting.get(k) is None:
            setting[k] = v

    return DeliverySettingOut(**setting)


@router.put("", response_model=DeliverySettingOut)
async def update_store_settings(
    setting_in: DeliverySettingUpdate,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    await ensure_store_settings_schema(d1)
    update_data = setting_in.model_dump(exclude_unset=True)
    if "whatsapp_number" in update_data and update_data["whatsapp_number"]:
        cleaned = re.sub(r"\D", "", str(update_data["whatsapp_number"]))
        if len(cleaned) == 10:
            cleaned = f"91{cleaned}"
        update_data["whatsapp_number"] = cleaned

    ALLOWED_SETTINGS_COLS = {
        "min_order_amount",
        "free_delivery_threshold",
        "standard_delivery_fee",
        "express_delivery_fee",
        "active_slots_json",
        "announcement_text",
        "whatsapp_number",
        "store_name",
        "store_address",
        "store_city",
        "store_district",
        "store_state",
        "store_pincode",
        "store_latitude",
        "store_longitude",
        "store_maps_url",
        "delivery_radius_km",
        "max_express_radius_km",
        "distance_slabs_json",
        "courier_enabled",
        "courier_free_threshold",
        "courier_partners_json",
        "courier_default_partner",
        "courier_delhivery_api_key",
        "courier_delhivery_client_id",
        "courier_shiprocket_email",
        "courier_shiprocket_token",
        "courier_rates_json",
        "courier_blacklisted_pins",
    }
    valid_data = {k: v for k, v in update_data.items() if k in ALLOWED_SETTINGS_COLS}

    setting = await d1.fetch_one("SELECT * FROM delivery_settings LIMIT 1")
    if not setting:
        cols = list(valid_data.keys())
        placeholders = ",".join("?" * len(cols))
        vals = [valid_data[c] for c in cols]
        sid = await d1.execute_insert(f"INSERT INTO delivery_settings ({', '.join(cols)}) VALUES ({placeholders})", *vals)
        setting = await d1.fetch_one("SELECT * FROM delivery_settings WHERE id = ?", sid)
    else:
        fields = []
        params = []
        for k, v in valid_data.items():
            fields.append(f"{k} = ?")
            params.append(v)
        if fields:
            params.append(setting["id"])
            await d1.execute(f"UPDATE delivery_settings SET {', '.join(fields)} WHERE id = ?", *params)
        setting = await d1.fetch_one("SELECT * FROM delivery_settings WHERE id = ?", setting["id"])

    # Invalidate cart settings cache
    try:
        from backend.app.routers import cart
        cart._settings_cache = (
            float(setting.get("free_delivery_threshold") if setting.get("free_delivery_threshold") is not None else 499.0),
            float(setting.get("standard_delivery_fee") if setting.get("standard_delivery_fee") is not None else 39.0)
        )
    except Exception:
        pass

    broadcaster.publish("SETTINGS_UPDATED", {
        "min_order_amount": float(setting.get("min_order_amount")) if setting.get("min_order_amount") is not None else None,
        "free_delivery_threshold": float(setting.get("free_delivery_threshold")) if setting.get("free_delivery_threshold") is not None else None,
        "standard_delivery_fee": float(setting.get("standard_delivery_fee")) if setting.get("standard_delivery_fee") is not None else None,
        "express_delivery_fee": float(setting.get("express_delivery_fee")) if setting.get("express_delivery_fee") is not None else None,
        "announcement_text": setting.get("announcement_text"),
        "whatsapp_number": setting.get("whatsapp_number"),
        "active_slots_json": setting.get("active_slots_json"),
        "distance_slabs_json": setting.get("distance_slabs_json")
    })
    return DeliverySettingOut(**setting)


@router.post("/test-courier-rate", response_model=CourierRateTestOut)
async def test_courier_rate(
    req: CourierRateTestRequest,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    """Admin tool to test nationwide courier rates for any destination PIN and parcel weight."""
    await ensure_store_settings_schema(d1)
    setting = await d1.fetch_one("SELECT * FROM delivery_settings LIMIT 1") or {}

    pickup_pin = setting.get("store_pincode") or "507101"
    partner = setting.get("courier_default_partner") or "Delhivery"
    free_thresh = float(setting.get("courier_free_threshold") if setting.get("courier_free_threshold") is not None else 999.0)
    blist = setting.get("courier_blacklisted_pins") or ""

    rates_json = setting.get("courier_rates_json")
    rates_dict = None
    if rates_json:
        try:
            rates_dict = json.loads(rates_json)
        except Exception:
            pass

    quote = calculate_courier_shipping(
        dest_pincode=req.destination_pincode,
        weight_kg=req.weight_kg,
        subtotal=req.cart_subtotal,
        pickup_pincode=pickup_pin,
        courier_rates=rates_dict,
        free_threshold=free_thresh,
        partner_name=partner,
        blacklisted_pins=blist
    )

    return CourierRateTestOut(
        is_serviceable=quote.get("is_serviceable", False),
        delivery_mode=quote.get("delivery_mode", "unserviceable"),
        zone=quote.get("zone", "Zone D"),
        zone_name=quote.get("zone_name", "Courier Zone"),
        courier_partner=quote.get("courier_partner", partner),
        pickup_pincode=quote.get("pickup_pincode", pickup_pin),
        destination_pincode=quote.get("destination_pincode", req.destination_pincode),
        actual_weight_kg=quote.get("actual_weight_kg", req.weight_kg),
        billable_weight_kg=quote.get("billable_weight_kg", req.weight_kg),
        shipping_fee=quote.get("shipping_fee", 0.0),
        is_free_shipping=quote.get("is_free_shipping", False),
        estimated_days=quote.get("estimated_days"),
        estimated_delivery_dates=quote.get("estimated_delivery_dates"),
        message=quote.get("message", "Calculated")
    )
