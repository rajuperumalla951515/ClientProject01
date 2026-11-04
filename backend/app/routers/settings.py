import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.config import settings as app_settings
from backend.app.database import get_db
from backend.app.models import DeliverySetting
from backend.app.schemas import DeliverySettingOut, DeliverySettingUpdate
from backend.app.deps import get_current_admin

router = APIRouter(prefix="/settings", tags=["Store Settings"])

@router.get("", response_model=DeliverySettingOut)
def get_store_settings(db: Session = Depends(get_db)):
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

    setting = db.query(DeliverySetting).first()
    if not setting:
        setting = DeliverySetting(**update_data)
        db.add(setting)
    else:
        for field, val in update_data.items():
            setattr(setting, field, val)

    db.commit()
    db.refresh(setting)
    return setting
