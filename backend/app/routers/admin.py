import datetime
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, or_
from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models import Order, OrderItem, Product, ProductVariant, User, Category, InventoryLog, Address
from backend.app.schemas import (
    EnhancedDashboardStatsOut, OrderOut, ProductOut, AddressOut,
    InventoryAdjustRequest, InventoryLogOut, CustomerMetricOut,
    CustomerDetailOut, OrderCancelRequest, TopProductStat
)
from backend.app.deps import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin Analytics & Operations"])

@router.get("/dashboard-stats", response_model=EnhancedDashboardStatsOut)
def get_dashboard_stats(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    today_start = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    total_rev = db.query(func.sum(Order.total_amount)).filter(Order.status != "cancelled").scalar() or 0.0
    today_rev = db.query(func.sum(Order.total_amount)).filter(Order.status != "cancelled", Order.created_at >= today_start).scalar() or 0.0
    total_orders = db.query(func.count(Order.id)).scalar() or 0
    today_orders = db.query(func.count(Order.id)).filter(Order.created_at >= today_start).scalar() or 0
    total_products = db.query(func.count(Product.id)).filter(Product.is_active == True).scalar() or 0
    total_customers = db.query(func.count(User.id)).filter(User.role == "customer").scalar() or 0
    pending_orders = db.query(func.count(Order.id)).filter(Order.status.in_(["pending", "confirmed", "pending_whatsapp", "processing"])).scalar() or 0
    delivered_orders = db.query(func.count(Order.id)).filter(Order.status == "delivered").scalar() or 0
    cancelled_orders = db.query(func.count(Order.id)).filter(Order.status == "cancelled").scalar() or 0
    low_stock_count = db.query(func.count(ProductVariant.id)).filter(ProductVariant.stock < 10).scalar() or 0

    # Aggregate status counts across all order records
    order_status_counts: Dict[str, int] = {}
    status_records = db.query(Order.status, func.count(Order.id)).group_by(Order.status).all()
    for s_name, s_count in status_records:
        if s_name:
            order_status_counts[s_name] = s_count

    # Aggregate Top Products by units sold
    top_items = db.query(
        OrderItem.product_id,
        OrderItem.product_name,
        func.sum(OrderItem.quantity).label("units_sold"),
        func.sum(OrderItem.total_price).label("revenue")
    ).join(Order, Order.id == OrderItem.order_id).filter(
        Order.status != "cancelled"
    ).group_by(OrderItem.product_id, OrderItem.product_name).order_by(
        desc("units_sold")
    ).limit(5).all()

    top_products = [
        TopProductStat(
            id=ti.product_id,
            name=ti.product_name,
            units_sold=int(ti.units_sold or 0),
            revenue=round(float(ti.revenue or 0.0), 2)
        )
        for ti in top_items
    ]

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
        order_status_counts=order_status_counts,
        top_products=top_products,
        recent_orders=recent_orders
    )


@router.get("/inventory")
def get_inventory_status(
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    low_stock_only: bool = False,
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(None, ge=0),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    query = db.query(Product).options(
        joinedload(Product.variants),
        joinedload(Product.category),
        joinedload(Product.images)
    )

    if category_id:
        query = query.filter(Product.category_id == category_id)

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                Product.name.ilike(term),
                Product.slug.ilike(term)
            )
        )

    prods = query.order_by(Product.id.asc()).all()
    result = []

    for p in prods:
        default_variant = next((v for v in p.variants if v.is_default), p.variants[0]) if p.variants else None
        stock = default_variant.stock if default_variant else 0
        unit_label = default_variant.pack_size or default_variant.unit if default_variant else "1 Unit"
        price = default_variant.price if default_variant else 0.0

        if low_stock_only and stock >= 10:
            continue
        result.append({
            "id": p.id,
            "name": p.name,
            "slug": p.slug,
            "category_id": p.category_id,
            "category_name": p.category.name if p.category else "Organic Produce",
            "price": price,
            "stock": stock,
            "is_low_stock": stock < 10,
            "is_out_of_stock": stock <= 0,
            "unit": unit_label,
            "image_url": p.images[0].image_url if p.images else None,
            "is_active": p.is_active
        })

    if isinstance(offset, int):
        result = result[offset:]
    if isinstance(limit, int):
        result = result[:limit]

    return result


@router.post("/inventory/adjust")
def adjust_inventory_stock(
    req: InventoryAdjustRequest,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    variant = db.query(ProductVariant).filter(
        ProductVariant.product_id == req.product_id
    ).order_by(ProductVariant.is_default.desc(), ProductVariant.id.asc()).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Product variant not found.")
    
    prev = variant.stock
    if req.new_stock is not None:
        variant.stock = max(0, req.new_stock)
    elif req.delta is not None:
        variant.stock = max(0, variant.stock + req.delta)
    
    diff = variant.stock - prev

    # Record Inventory Audit Log in PostgreSQL
    log_entry = InventoryLog(
        product_id=req.product_id,
        previous_stock=prev,
        changed_stock=diff,
        new_stock=variant.stock,
        reason=f"{req.reason}{f' - {req.notes}' if req.notes else ''}"
    )
    db.add(log_entry)
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
    db_logs = db.query(InventoryLog).options(
        joinedload(InventoryLog.product)
    ).order_by(InventoryLog.created_at.desc()).offset(offset).limit(limit).all()

    return [
        InventoryLogOut(
            log_id=l.id,
            product_id=l.product_id,
            product_name=l.product.name if l.product else f"Product #{l.product_id}",
            previous_stock=l.previous_stock,
            changed_stock=l.changed_stock,
            new_stock=l.new_stock,
            reason=l.reason,
            created_at=l.created_at.isoformat() if hasattr(l.created_at, "isoformat") else str(l.created_at)
        )
        for l in db_logs
    ]


@router.get("/customers", response_model=List[CustomerMetricOut])
def list_customers(
    search: Optional[str] = None,
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(None, ge=0),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    query = db.query(User).filter(User.role == "customer")
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                User.name.ilike(term),
                User.email.ilike(term),
                User.phone.ilike(term)
            )
        )

    query = query.order_by(User.created_at.desc())
    if isinstance(offset, int):
        query = query.offset(offset)
    if isinstance(limit, int):
        query = query.limit(limit)

    users = query.all()
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
    user = db.query(User).filter(User.id == customer_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found.")
    
    ords = db.query(Order).options(joinedload(Order.items)).filter(Order.user_id == user.id).all()
    spend = sum(o.total_amount for o in ords if o.status != "cancelled")
    addrs = db.query(Address).filter(Address.user_id == user.id).all()
    
    return CustomerDetailOut(
        id=user.id,
        name=user.name,
        email=user.email,
        phone=user.phone,
        total_orders=len(ords),
        total_spend=round(spend, 2),
        created_at=user.created_at.isoformat() if hasattr(user.created_at, "isoformat") else str(user.created_at),
        addresses=[AddressOut.model_validate(a) for a in addrs],
        orders=[OrderOut.model_validate(o) for o in ords]
    )


@router.post("/orders/{order_id}/cancel", response_model=OrderOut)
def cancel_order_admin(
    order_id: str,
    cancel_in: OrderCancelRequest,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    order = db.query(Order).options(joinedload(Order.items)).filter(
        (Order.id == int(order_id)) if str(order_id).isdigit() else (Order.order_number == str(order_id))
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if order.status != "cancelled":
        order.status = "cancelled"
        order.admin_notes = f"Cancelled by Admin: {cancel_in.reason}"
        # Restock products and record inventory audit log
        for it in order.items:
            variant = db.query(ProductVariant).filter(ProductVariant.id == it.variant_id).first()
            if variant:
                prev_stk = variant.stock
                variant.stock += it.quantity
                log_entry = InventoryLog(
                    product_id=it.product_id,
                    previous_stock=prev_stk,
                    changed_stock=it.quantity,
                    new_stock=variant.stock,
                    reason=f"Order Restock #{order.order_number} ({cancel_in.reason})"
                )
                db.add(log_entry)
        db.commit()
        db.refresh(order)

    return order
