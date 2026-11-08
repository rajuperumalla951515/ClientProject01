import re
import datetime
from fastapi import APIRouter, Depends, HTTPException
from backend.app.config import settings as app_settings
from backend.app.d1 import D1Database, get_d1
from backend.app.schemas import DeliverySettingOut, DeliverySettingUpdate
from backend.app.deps import get_current_admin
from backend.app.events import broadcaster

router = APIRouter(prefix="/settings", tags=["Store Settings"])

@router.get("", response_model=DeliverySettingOut)
async def get_store_settings(d1: D1Database = Depends(get_d1)):
    setting = await d1.fetch_one("SELECT * FROM delivery_settings LIMIT 1")

    if not setting:
        sid = await d1.execute_insert(
            """
            INSERT INTO delivery_settings (
                min_order_amount, free_delivery_threshold, standard_delivery_fee, express_delivery_fee,
                active_slots_json, announcement_text, whatsapp_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            99.0, 499.0, 39.0, 59.0,
            '["Express Delivery (15-30 Mins)", "Morning Slot (7:00 AM - 9:30 AM)", "Evening Slot (5:30 PM - 8:00 PM)"]',
            "Sri Adithya Organics • 100% Certified Organic • Free Delivery on orders over ₹499 • Harvested Fresh Today",
            "919515159006"
        )
        setting = await d1.fetch_one("SELECT * FROM delivery_settings WHERE id = ?", sid)
    elif not setting.get("whatsapp_number") or setting.get("whatsapp_number") in ["919876543210", "9876543210"]:
        await d1.execute("UPDATE delivery_settings SET whatsapp_number = '919515159006' WHERE id = ?", setting["id"])
        setting["whatsapp_number"] = "919515159006"

    return DeliverySettingOut(**setting)


@router.put("", response_model=DeliverySettingOut)
async def update_store_settings(
    setting_in: DeliverySettingUpdate,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
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
        "whatsapp_number"
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
        "active_slots_json": setting.get("active_slots_json")
    })
    return DeliverySettingOut(**setting)
