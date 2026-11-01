from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from backend.app.config import settings
from backend.app.database import get_db, check_db_connection
from backend.app.models import Order, Product, ProductVariant, User
from backend.app.schemas import DashboardStatsOut, OrderOut
from backend.app.deps import get_current_admin
from backend.app.sheets.service import sheets_service

router = APIRouter(prefix="/admin", tags=["Admin Analytics"])

def is_sheets_storage() -> bool:
    return settings.STORAGE_BACKEND == "sheets" or not check_db_connection()[0]

@router.get("/dashboard-stats", response_model=DashboardStatsOut)
def get_dashboard_stats(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    if is_sheets_storage():
        all_orders = sheets_service.get_all_orders()
        total_rev = sum(o.get("total_amount", 0.0) for o in all_orders if o.get("status") != "cancelled")
        total_orders = len(all_orders)
        pending_orders = sum(1 for o in all_orders if o.get("status") in ("pending", "confirmed", "pending_whatsapp"))
        all_prods = sheets_service.get_all_products()
        total_products = len(all_prods)
        low_stock_count = sum(1 for p in all_prods if p.get("variants") and p["variants"][0].get("stock", 0) < 10)
        cust_rows = sheets_service.client.read_sheet("Customers")
        total_customers = sum(1 for c in cust_rows if c.get("role") == "customer")
        recent_orders = [OrderOut.model_validate(o) for o in all_orders[:8]]

        return DashboardStatsOut(
            total_revenue=round(total_rev, 2),
            total_orders=total_orders,
            total_products=total_products,
            total_customers=total_customers,
            pending_orders=pending_orders,
            low_stock_products=low_stock_count,
            recent_orders=recent_orders
        )

    total_rev = db.query(func.sum(Order.total_amount)).filter(Order.status != "cancelled").scalar() or 0.0
    total_orders = db.query(func.count(Order.id)).scalar() or 0
    total_products = db.query(func.count(Product.id)).filter(Product.is_active == True).scalar() or 0
    total_customers = db.query(func.count(User.id)).filter(User.role == "customer").scalar() or 0
    pending_orders = db.query(func.count(Order.id)).filter(Order.status.in_(["pending", "confirmed"])).scalar() or 0
    
    # Low stock variants (< 10 units)
    low_stock_count = db.query(func.count(ProductVariant.id)).filter(ProductVariant.stock < 10).scalar() or 0

    recent_orders = db.query(Order).options(
        joinedload(Order.items)
    ).order_by(Order.created_at.desc()).limit(8).all()

    return DashboardStatsOut(
        total_revenue=round(total_rev, 2),
        total_orders=total_orders,
        total_products=total_products,
        total_customers=total_customers,
        pending_orders=pending_orders,
        low_stock_products=low_stock_count,
        recent_orders=recent_orders
    )

