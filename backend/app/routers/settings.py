import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.config import settings as app_settings
from backend.app.database import get_db, check_db_connection
from backend.app.models import DeliverySetting
from backend.app.schemas import DeliverySettingOut, DeliverySettingUpdate
from backend.app.deps import get_current_admin
from backend.app.sheets.service import sheets_service

router = APIRouter(prefix="/settings", tags=["Store Settings"])

def is_sheets_storage() -> bool:
    return app_settings.STORAGE_BACKEND == "sheets" or not check_db_connection()[0]

@router.get("", response_model=DeliverySettingOut)
def get_store_settings(db: Session = Depends(get_db)):
    if is_sheets_storage():
        data = sheets_service.get_settings()
        return DeliverySettingOut(
            id=1,
            min_order_amount=data.get("min_order_amount", 99.0),
            free_delivery_threshold=data.get("free_delivery_threshold", 499.0),
            standard_delivery_fee=data.get("standard_delivery_fee", 39.0),
            express_delivery_fee=data.get("express_delivery_fee", 59.0),
            active_slots_json=data.get("active_slots_json", "[]"),
            announcement_text=data.get("announcement_text", ""),
            whatsapp_number=data.get("whatsapp_number", "919515159006")
        )

    setting = db.query(DeliverySetting).first()
    if not setting:
        setting = DeliverySetting(
            min_order_amount=99.0,
            free_delivery_threshold=499.0,
            standard_delivery_fee=39.0,
            express_delivery_fee=59.0,
            active_slots_json='["Express Delivery (15-30 Mins)", "Morning Slot (7:00 AM - 9:30 AM)", "Evening Slot (5:30 PM - 8:00 PM)"]',
            announcement_text="Sri Adithya Organics • 100% Certified Organic • Free Delivery on orders over ₹499 • Harvested Fresh Today",
            whatsapp_number="919515159006"
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)
    elif not getattr(setting, "whatsapp_number", None) or setting.whatsapp_number in ["919876543210", "9876543210"]:
        setting.whatsapp_number = "919515159006"
        db.commit()
        db.refresh(setting)
    return setting


@router.put("", response_model=DeliverySettingOut)
def update_store_settings(
    setting_in: DeliverySettingUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    update_data = setting_in.model_dump(exclude_unset=True)
    if "whatsapp_number" in update_data and update_data["whatsapp_number"]:
        cleaned = re.sub(r"\D", "", str(update_data["whatsapp_number"]))
        if len(cleaned) == 10:
            cleaned = f"91{cleaned}"
        update_data["whatsapp_number"] = cleaned

    if is_sheets_storage():
        updated = sheets_service.update_settings(update_data)
        return DeliverySettingOut(
            id=1,
            min_order_amount=updated.get("min_order_amount", 99.0),
            free_delivery_threshold=updated.get("free_delivery_threshold", 499.0),
            standard_delivery_fee=updated.get("standard_delivery_fee", 39.0),
            express_delivery_fee=updated.get("express_delivery_fee", 59.0),
            active_slots_json=updated.get("active_slots_json", "[]"),
            announcement_text=updated.get("announcement_text", ""),
            whatsapp_number=updated.get("whatsapp_number", "919515159006")
        )

    setting = db.query(DeliverySetting).first()
    if not setting:
        setting = DeliverySetting()
        db.add(setting)

    for k, v in update_data.items():
        setattr(setting, k, v)

    db.commit()
    db.refresh(setting)
    return setting

