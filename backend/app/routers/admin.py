import datetime
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from backend.app.config import settings
from backend.app.d1 import D1Database, get_d1
from backend.app.schemas import (
    EnhancedDashboardStatsOut, OrderOut, AddressOut,
    InventoryAdjustRequest, InventoryLogOut, CustomerMetricOut,
    CustomerDetailOut, OrderCancelRequest, TopProductStat
)
from backend.app.deps import get_current_admin
from backend.app.events import broadcaster
from backend.app.routers.orders import load_orders_with_items, load_order_with_items

router = APIRouter(prefix="/admin", tags=["Admin Analytics & Operations"])

@router.get("/dashboard-stats", response_model=EnhancedDashboardStatsOut)
async def get_dashboard_stats(d1: D1Database = Depends(get_d1), admin=Depends(get_current_admin)):
    today_start = datetime.datetime.utcnow().strftime("%Y-%m-%d 00:00:00")

    total_rev_row = await d1.fetch_one("SELECT SUM(total_amount) as s FROM orders WHERE status != 'cancelled'")
    total_rev = float(total_rev_row["s"] or 0.0) if total_rev_row else 0.0

    today_rev_row = await d1.fetch_one("SELECT SUM(total_amount) as s FROM orders WHERE status != 'cancelled' AND created_at >= ?", today_start)
    today_rev = float(today_rev_row["s"] or 0.0) if today_rev_row else 0.0

    total_orders_row = await d1.fetch_one("SELECT COUNT(*) as c FROM orders")
    total_orders = int(total_orders_row["c"] or 0) if total_orders_row else 0

    today_orders_row = await d1.fetch_one("SELECT COUNT(*) as c FROM orders WHERE created_at >= ?", today_start)
    today_orders = int(today_orders_row["c"] or 0) if today_orders_row else 0

    total_prods_row = await d1.fetch_one("SELECT COUNT(*) as c FROM products WHERE is_active = 1")
    total_products = int(total_prods_row["c"] or 0) if total_prods_row else 0

    total_custs_row = await d1.fetch_one("SELECT COUNT(*) as c FROM users WHERE role = 'customer'")
    total_customers = int(total_custs_row["c"] or 0) if total_custs_row else 0

    pending_orders_row = await d1.fetch_one(
        "SELECT COUNT(*) as c FROM orders WHERE status IN ('pending', 'confirmed', 'pending_whatsapp', 'processing')"
    )
    pending_orders = int(pending_orders_row["c"] or 0) if pending_orders_row else 0

    delivered_orders_row = await d1.fetch_one("SELECT COUNT(*) as c FROM orders WHERE status = 'delivered'")
    delivered_orders = int(delivered_orders_row["c"] or 0) if delivered_orders_row else 0

    cancelled_orders_row = await d1.fetch_one("SELECT COUNT(*) as c FROM orders WHERE status = 'cancelled'")
    cancelled_orders = int(cancelled_orders_row["c"] or 0) if cancelled_orders_row else 0

    low_stock_row = await d1.fetch_one("SELECT COUNT(*) as c FROM product_variants WHERE stock < 10")
    low_stock_count = int(low_stock_row["c"] or 0) if low_stock_row else 0

    # Aggregate status counts
    order_status_counts: Dict[str, int] = {}
    status_records = await d1.fetch_all("SELECT status, COUNT(*) as c FROM orders GROUP BY status")
    for r in status_records:
        if r.get("status"):
            order_status_counts[r["status"]] = int(r["c"])

    # Aggregate Top Products by units sold
    top_items = await d1.fetch_all(
        """
        SELECT oi.product_id, oi.product_name, SUM(oi.quantity) as units_sold, SUM(oi.total_price) as revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status != 'cancelled'
        GROUP BY oi.product_id, oi.product_name
        ORDER BY units_sold DESC
        LIMIT 5
        """
    )

    top_products = [
        TopProductStat(
            id=ti["product_id"],
            name=ti["product_name"],
            units_sold=int(ti["units_sold"] or 0),
            revenue=round(float(ti["revenue"] or 0.0), 2)
        )
        for ti in top_items
    ]

    recent_orders_raw = await d1.fetch_all("SELECT * FROM orders ORDER BY created_at DESC LIMIT 8")
    recent_orders = await load_orders_with_items(d1, recent_orders_raw)

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
async def get_inventory_status(
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    low_stock_only: bool = False,
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(None, ge=0),
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    clauses = ["1=1"]
    params = []

    if category_id:
        clauses.append("p.category_id = ?")
        params.append(category_id)

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        clauses.append("(LOWER(p.name) LIKE ? OR LOWER(p.slug) LIKE ?)")
        params.extend([term, term])

    sql = f"""
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE {' AND '.join(clauses)}
        ORDER BY p.id ASC
    """
    prods = await d1.fetch_all(sql, *params)
    if not prods:
        return []

    p_ids = [p["id"] for p in prods]
    p_ph = ",".join("?" * len(p_ids))
    variants = await d1.fetch_all(f"SELECT * FROM product_variants WHERE product_id IN ({p_ph}) ORDER BY is_default DESC, id ASC", *p_ids)
    images = await d1.fetch_all(f"SELECT * FROM product_images WHERE product_id IN ({p_ph}) ORDER BY is_primary DESC, display_order ASC", *p_ids)

    var_map: Dict[int, List[Dict[str, Any]]] = {}
    for v in variants:
        var_map.setdefault(v["product_id"], []).append(v)

    img_map: Dict[int, List[Dict[str, Any]]] = {}
    for img in images:
        img_map.setdefault(img["product_id"], []).append(img)

    result = []
    for p in prods:
        pid = p["id"]
        p_vars = var_map.get(pid, [])
        p_imgs = img_map.get(pid, [])

        default_variant = next((v for v in p_vars if v.get("is_default")), p_vars[0]) if p_vars else None
        stock = default_variant["stock"] if default_variant else 0
        unit_label = (default_variant.get("pack_size") or default_variant.get("unit")) if default_variant else "1 Unit"
        price = float(default_variant["price"]) if (default_variant and default_variant.get("price") is not None) else 0.0

        if low_stock_only and stock >= 10:
            continue

        result.append({
            "id": pid,
            "name": p["name"],
            "slug": p["slug"],
            "category_id": p["category_id"],
            "category_name": p.get("category_name") or "Organic Produce",
            "price": price,
            "stock": stock,
            "is_low_stock": stock < 10,
            "is_out_of_stock": stock <= 0,
            "unit": unit_label,
            "image_url": p_imgs[0]["image_url"] if p_imgs else None,
            "is_active": bool(p.get("is_active"))
        })

    if isinstance(offset, int):
        result = result[offset:]
    if isinstance(limit, int):
        result = result[:limit]

    return result


@router.post("/inventory/adjust")
async def adjust_inventory_stock(
    req: InventoryAdjustRequest,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    variant = await d1.fetch_one(
        "SELECT * FROM product_variants WHERE product_id = ? ORDER BY is_default DESC, id ASC LIMIT 1",
        req.product_id
    )
    if not variant:
        raise HTTPException(status_code=404, detail="Product variant not found.")

    prev = variant["stock"]
    if req.new_stock is not None:
        new_stk = max(0, req.new_stock)
    elif req.delta is not None:
        new_stk = max(0, variant["stock"] + req.delta)
    else:
        new_stk = prev

    diff = new_stk - prev
    now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    await d1.execute("UPDATE product_variants SET stock = ? WHERE id = ?", new_stk, variant["id"])
    reason_str = f"{req.reason}{f' - {req.notes}' if req.notes else ''}"

    await d1.execute_insert(
        """
        INSERT INTO inventory_logs (product_id, previous_stock, changed_stock, new_stock, reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        req.product_id, prev, diff, new_stk, reason_str, now
    )

    broadcaster.publish("INVENTORY_UPDATED", {
        "product_id": req.product_id,
        "variant_id": variant["id"],
        "previous_stock": prev,
        "new_stock": new_stk,
        "reason": req.reason
    })

    return {
        "product_id": req.product_id,
        "previous_stock": prev,
        "changed_stock": diff,
        "new_stock": new_stk,
        "reason": req.reason
    }


@router.get("/inventory/logs", response_model=List[InventoryLogOut])
async def get_inventory_audit_logs(
    limit: int = 100,
    offset: int = 0,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    db_logs = await d1.fetch_all(
        """
        SELECT il.*, p.name as product_name
        FROM inventory_logs il
        LEFT JOIN products p ON p.id = il.product_id
        ORDER BY il.created_at DESC
        LIMIT ? OFFSET ?
        """,
        limit, offset
    )

    return [
        InventoryLogOut(
            log_id=l["id"],
            product_id=l["product_id"],
            product_name=l.get("product_name") or f"Product #{l['product_id']}",
            previous_stock=l["previous_stock"],
            changed_stock=l["changed_stock"],
            new_stock=l["new_stock"],
            reason=l["reason"],
            created_at=str(l["created_at"])
        )
        for l in db_logs
    ]


@router.get("/customers", response_model=List[CustomerMetricOut])
async def list_customers(
    search: Optional[str] = None,
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(None, ge=0),
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    clauses = ["u.role = 'customer'"]
    params = []

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        clauses.append("(LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(u.phone) LIKE ?)")
        params.extend([term, term, term])

    sql = f"""
        SELECT
            u.id, u.name, u.email, u.phone, u.created_at,
            COUNT(o.id) as total_orders,
            COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total_amount ELSE 0 END), 0) as total_spend,
            MAX(o.created_at) as last_order_date
        FROM users u
        LEFT JOIN orders o ON o.user_id = u.id
        WHERE {' AND '.join(clauses)}
        GROUP BY u.id
        ORDER BY u.created_at DESC
    """
    if isinstance(limit, int):
        sql += f" LIMIT {limit}"
    if isinstance(offset, int):
        sql += f" OFFSET {offset}"

    rows = await d1.fetch_all(sql, *params)
    results = []
    for u in rows:
        results.append(CustomerMetricOut(
            id=u["id"],
            name=u["name"],
            email=u["email"],
            phone=u.get("phone"),
            total_orders=int(u["total_orders"] or 0),
            total_spend=float(round(float(u["total_spend"] or 0.0), 2)),
            created_at=str(u["created_at"]),
            last_order_date=str(u["last_order_date"]) if u.get("last_order_date") else None
        ))
    return results


@router.get("/customers/{customer_id}", response_model=CustomerDetailOut)
async def get_customer_details(
    customer_id: int,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    user = await d1.fetch_one("SELECT * FROM users WHERE id = ?", customer_id)
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found.")

    raw_orders = await d1.fetch_all("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", customer_id)
    orders = await load_orders_with_items(d1, raw_orders)
    spend = sum(o.total_amount for o in orders if o.status != "cancelled")

    raw_addrs = await d1.fetch_all("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC", customer_id)
    addresses = [AddressOut(**a) for a in raw_addrs]

    return CustomerDetailOut(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        phone=user.get("phone"),
        total_orders=len(orders),
        total_spend=float(round(float(spend), 2)),
        created_at=str(user["created_at"]),
        addresses=addresses,
        orders=orders
    )


@router.post("/orders/{order_id}/cancel", response_model=OrderOut)
async def cancel_order_admin(
    order_id: str,
    cancel_in: OrderCancelRequest,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    if str(order_id).isdigit():
        order = await d1.fetch_one("SELECT * FROM orders WHERE id = ?", int(order_id))
    else:
        order = await d1.fetch_one("SELECT * FROM orders WHERE order_number = ?", str(order_id))

    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    if order["status"] != "cancelled":
        admin_notes = f"Cancelled by Admin: {cancel_in.reason}"
        items = await d1.fetch_all("SELECT * FROM order_items WHERE order_id = ?", order["id"])
        for it in items:
            v = await d1.fetch_one("SELECT * FROM product_variants WHERE id = ?", it["variant_id"])
            if v:
                prev_stk = v["stock"]
                new_stk = prev_stk + it["quantity"]
                await d1.execute("UPDATE product_variants SET stock = ? WHERE id = ?", new_stk, v["id"])
                await d1.execute_insert(
                    """
                    INSERT INTO inventory_logs (product_id, previous_stock, changed_stock, new_stock, reason, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    it["product_id"], prev_stk, it["quantity"], new_stk, f"Order Restock #{order['order_number']} ({cancel_in.reason})", now
                )

        await d1.execute(
            "UPDATE orders SET status = 'cancelled', admin_notes = ?, updated_at = ? WHERE id = ?",
            admin_notes, now, order["id"]
        )

        broadcaster.publish("ORDER_UPDATED", {
            "order_id": order["id"],
            "order_number": order["order_number"],
            "status": "cancelled",
            "cancelled_by": "admin"
        })
        broadcaster.publish("INVENTORY_UPDATED", {
            "reason": f"Restocked order {order['order_number']}"
        })

    return await load_order_with_items(d1, order["id"])
