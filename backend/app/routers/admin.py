from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from backend.app.database import get_db
from backend.app.models import Order, Product, ProductVariant, User
from backend.app.schemas import DashboardStatsOut
from backend.app.deps import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin Analytics"])

@router.get("/dashboard-stats", response_model=DashboardStatsOut)
def get_dashboard_stats(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
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

