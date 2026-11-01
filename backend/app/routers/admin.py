import datetime
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from backend.app.config import settings
from backend.app.database import get_db, check_db_connection
from backend.app.models import Order, Product, ProductVariant, User, Category
from backend.app.schemas import (
    EnhancedDashboardStatsOut, OrderOut, ProductOut,
    InventoryAdjustRequest, InventoryLogOut, CustomerMetricOut,
    CustomerDetailOut, OrderCancelRequest, TopProductStat
)
from backend.app.deps import get_current_admin
from backend.app.sheets.service import sheets_service

router = APIRouter(prefix="/admin", tags=["Admin Analytics & Operations"])

def is_sheets_storage() -> bool:
    return settings.STORAGE_BACKEND == "sheets" or not check_db_connection()[0]

@router.get("/dashboard-stats", response_model=EnhancedDashboardStatsOut)
def get_dashboard_stats(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    if is_sheets_storage():
        stats = sheets_service.get_detailed_dashboard_stats()
        return EnhancedDashboardStatsOut(
            total_revenue=stats["total_revenue"],
            today_revenue=stats["today_revenue"],
            total_orders=stats["total_orders"],
            today_orders=stats["today_orders"],
            total_products=stats["total_products"],
            total_customers=stats["total_customers"],
            pending_orders=stats["pending_orders"],
            delivered_orders=stats["delivered_orders"],
            cancelled_orders=stats["cancelled_orders"],
            low_stock_products=stats["low_stock_products"],
            order_status_counts=stats["order_status_counts"],
            top_products=[TopProductStat(**tp) for tp in stats["top_products"]],
            recent_orders=[OrderOut.model_validate(o) for o in stats["recent_orders"]]
        )

    # Relational Database Mode
    today_start = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    total_rev = db.query(func.sum(Order.total_amount)).filter(Order.status != "cancelled").scalar() or 0.0
    today_rev = db.query(func.sum(Order.total_amount)).filter(Order.status != "cancelled", Order.created_at >= today_start).scalar() or 0.0
    total_orders = db.query(func.count(Order.id)).scalar() or 0
    today_orders = db.query(func.count(Order.id)).filter(Order.created_at >= today_start).scalar() or 0
    total_products = db.query(func.count(Product.id)).filter(Product.is_active == True).scalar() or 0
    total_customers = db.query(func.count(User.id)).filter(User.role == "customer").scalar() or 0
    pending_orders = db.query(func.count(Order.id)).filter(Order.status.in_(["pending", "confirmed", "pending_whatsapp"])).scalar() or 0
    delivered_orders = db.query(func.count(Order.id)).filter(Order.status == "delivered").scalar() or 0
    cancelled_orders = db.query(func.count(Order.id)).filter(Order.status == "cancelled").scalar() or 0
    low_stock_count = db.query(func.count(ProductVariant.id)).filter(ProductVariant.stock < 10).scalar() or 0

    recent_orders = db.query(Order).options(
        joinedload(Order.items)
    ).order_by(Order.created_at.desc()).limit(8).all()

    return EnhancedDashboardStatsOut(
        total_revenue=round(total_rev, 2),
        today_revenue=round(today_rev, 2),
        total_orders=total_orders,
        today_orders=today_orders,
        total_products=total_products,
        total_customers=total_customers,
        pending_orders=pending_orders,
        delivered_orders=delivered_orders,
        cancelled_orders=cancelled_orders,
        low_stock_products=low_stock_count,
        order_status_counts={"pending": pending_orders, "delivered": delivered_orders, "cancelled": cancelled_orders},
        top_products=[],
        recent_orders=recent_orders
    )

@router.get("/inventory")
def get_inventory_status(
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    low_stock_only: bool = False,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    if is_sheets_storage():
        all_prods = sheets_service.get_all_products()
        categories = {c["id"]: c["name"] for c in sheets_service.get_categories(only_active=False)}
        
        result = []
        for p in all_prods:
            stock = p["variants"][0]["stock"] if p.get("variants") else 0
            if low_stock_only and stock >= 10:
                continue
            if category_id and p.get("category_id") != category_id:
                continue
            if search and search.strip():
                q = search.strip().lower()
                if q not in p["name"].lower() and q not in str(p.get("id")) and q not in p.get("slug", ""):
                    continue

            result.append({
                "id": p["id"],
                "name": p["name"],
                "slug": p["slug"],
                "category_id": p.get("category_id"),
                "category_name": categories.get(p.get("category_id"), "Organic Produce"),
                "price": p["min_price"],
                "stock": stock,
                "is_low_stock": stock < 10,
                "is_out_of_stock": stock <= 0,
                "unit": p["variants"][0]["unit"] if p.get("variants") else "1 Unit",
                "image_url": p["images"][0]["image_url"] if p.get("images") else None,
                "is_active": p["is_active"]
            })
        return result

    query = db.query(Product).options(joinedload(Product.variants), joinedload(Product.category))
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if search and search.strip():
        query = query.filter(Product.name.ilike(f"%{search.strip()}%"))
    
    prods = query.all()
    result = []
    for p in prods:
        stock = p.variants[0].stock if p.variants else 0
        if low_stock_only and stock >= 10:
            continue
        result.append({
            "id": p.id,
            "name": p.name,
            "slug": p.slug,
            "category_id": p.category_id,
            "category_name": p.category.name if p.category else "Organic Produce",
            "price": p.variants[0].price if p.variants else 0.0,
            "stock": stock,
            "is_low_stock": stock < 10,
            "is_out_of_stock": stock <= 0,
            "unit": p.variants[0].unit if p.variants else "1 Unit",
            "image_url": p.images[0].image_url if p.images else None,
            "is_active": p.is_active
        })
    return result

@router.post("/inventory/adjust")
def adjust_inventory_stock(
    req: InventoryAdjustRequest,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    if is_sheets_storage():
        try:
            res = sheets_service.adjust_inventory(
                product_id=req.product_id,
                delta=req.delta,
                new_stock=req.new_stock,
                reason=req.reason,
                notes=req.notes
            )
            return res
        except ValueError as err:
            raise HTTPException(status_code=400, detail=str(err))

    variant = db.query(ProductVariant).filter(ProductVariant.product_id == req.product_id).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Product variant not found.")
    
    prev = variant.stock
    if req.new_stock is not None:
        variant.stock = max(0, req.new_stock)
    elif req.delta is not None:
        variant.stock = max(0, variant.stock + req.delta)
    
    diff = variant.stock - prev
    db.commit()
    db.refresh(variant)
    return {
        "product_id": req.product_id,
        "previous_stock": prev,
        "changed_stock": diff,
        "new_stock": variant.stock,
        "reason": req.reason
    }

@router.get("/inventory/logs", response_model=List[InventoryLogOut])
def get_inventory_audit_logs(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    if is_sheets_storage():
        logs = sheets_service.get_inventory_logs(limit=limit, offset=offset)
        return [InventoryLogOut(**l) for l in logs]
    return []

@router.get("/customers", response_model=List[CustomerMetricOut])
def list_customers(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    if is_sheets_storage():
        custs = sheets_service.get_customers_with_metrics(search=search)
        return [CustomerMetricOut(**c) for c in custs]

    users = db.query(User).filter(User.role == "customer").all()
    results = []
    for u in users:
        ords = db.query(Order).filter(Order.user_id == u.id, Order.status != "cancelled").all()
        spend = sum(o.total_amount for o in ords)
        results.append(CustomerMetricOut(
            id=u.id,
            name=u.name,
            email=u.email,
            phone=u.phone,
            total_orders=len(ords),
            total_spend=round(spend, 2),
            created_at=u.created_at.isoformat() if hasattr(u.created_at, "isoformat") else str(u.created_at)
        ))
    return results

@router.get("/customers/{customer_id}", response_model=CustomerDetailOut)
def get_customer_details(
    customer_id: int,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    if is_sheets_storage():
        cust = sheets_service.get_customer_detail(customer_id)
        if not cust:
            raise HTTPException(status_code=404, detail="Customer not found.")
        return CustomerDetailOut.model_validate(cust)

    user = db.query(User).filter(User.id == customer_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found.")
    
    ords = db.query(Order).options(joinedload(Order.items)).filter(Order.user_id == user.id).all()
    spend = sum(o.total_amount for o in ords if o.status != "cancelled")
    
    return CustomerDetailOut(
        id=user.id,
        name=user.name,
        email=user.email,
        phone=user.phone,
        total_orders=len(ords),
        total_spend=round(spend, 2),
        created_at=user.created_at.isoformat() if hasattr(user.created_at, "isoformat") else str(user.created_at),
        addresses=[],
        orders=[OrderOut.model_validate(o) for o in ords]
    )

@router.post("/orders/{order_id}/cancel", response_model=OrderOut)
def cancel_order_admin(
    order_id: str,
    cancel_in: OrderCancelRequest,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    if is_sheets_storage():
        cancelled_order = sheets_service.cancel_order(order_id, reason=cancel_in.reason)
        if not cancelled_order:
            raise HTTPException(status_code=404, detail="Order not found.")
        return OrderOut.model_validate(cancelled_order)

    order = db.query(Order).options(joinedload(Order.items)).filter(
        (Order.id == int(order_id)) if str(order_id).isdigit() else (Order.order_number == str(order_id))
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if order.status != "cancelled":
        order.status = "cancelled"
        order.admin_notes = f"Cancelled: {cancel_in.reason}"
        # Restock
        for it in order.items:
            variant = db.query(ProductVariant).filter(ProductVariant.id == it.variant_id).first()
            if variant:
                variant.stock += it.quantity
        db.commit()
        db.refresh(order)

    return order
