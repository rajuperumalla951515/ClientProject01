from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
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
            active_slots_json='["⚡ Instant Delivery (15-30 Mins)", "🌅 Morning Slot (7:00 AM - 9:30 AM)", "🌇 Evening Slot (5:30 PM - 8:00 PM)"]',
            announcement_text="🌱 100% Certified Organic • Free Delivery on orders over ₹499 • Harvested Fresh Today"
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting


@router.put("", response_model=DeliverySettingOut)
def update_store_settings(
    setting_in: DeliverySettingUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    setting = db.query(DeliverySetting).first()
    if not setting:
        setting = DeliverySetting()
        db.add(setting)

    update_data = setting_in.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(setting, k, v)

    db.commit()
    db.refresh(setting)
    return setting

