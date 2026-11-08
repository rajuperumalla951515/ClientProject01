import datetime
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from backend.app.config import settings
from backend.app.d1 import D1Database, get_d1
from backend.app.schemas import (
    EnhancedDashboardStatsOut, OrderOut, AddressOut,
    InventoryAdjustRequest, InventoryLogOut, CustomerMetricOut,
    CustomerDetailOut, OrderCancelRequest, TopProductStat,
    SalesTrendPoint, CouponOut, CouponCreate, CouponUpdate,
    ReviewOut, ReviewStatusUpdate, DeliveryZoneOut, DeliveryZoneCreate, DeliveryZoneUpdate,
    AnalyticsReportOut, CategoryAnalyticsItem, InventoryCategoryValuation
)
from backend.app.deps import get_current_admin
from backend.app.events import broadcaster
from backend.app.routers.orders import load_orders_with_items, load_order_with_items

router = APIRouter(prefix="/admin", tags=["Admin Analytics & Operations"])

async def ensure_admin_tables(d1: D1Database):
    """Safely ensure enterprise tables exist in D1 or local SQLite."""
    try:
        await d1.execute("""
            CREATE TABLE IF NOT EXISTS coupons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                description TEXT,
                discount_type TEXT NOT NULL DEFAULT 'percentage',
                discount_value REAL NOT NULL,
                min_order_amount REAL DEFAULT 0.0,
                max_discount_amount REAL,
                usage_limit INTEGER DEFAULT 100,
                usage_count INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                valid_from TEXT,
                valid_until TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            );
        """)
        await d1.execute("""
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                customer_name TEXT NOT NULL,
                rating INTEGER NOT NULL,
                title TEXT,
                comment TEXT NOT NULL,
                is_verified_buyer INTEGER DEFAULT 1,
                status TEXT DEFAULT 'approved',
                created_at TEXT DEFAULT (datetime('now'))
            );
        """)
        await d1.execute("""
            CREATE TABLE IF NOT EXISTS delivery_zones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pincode TEXT UNIQUE NOT NULL,
                area_name TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                delivery_fee REAL DEFAULT 39.0,
                estimated_delivery_time TEXT DEFAULT '15-30 Mins',
                created_at TEXT DEFAULT (datetime('now'))
            );
        """)
    except Exception as e:
        print(f"[Admin] Ensure tables notice: {e}")

def resolve_date_range(period: str, date_from: Optional[str] = None, date_to: Optional[str] = None):
    now = datetime.datetime.utcnow()
    p = (period or "today").lower()

    if p == "today":
        start_str = now.strftime("%Y-%m-%d 00:00:00")
        end_str = now.strftime("%Y-%m-%d 23:59:59")
    elif p == "yesterday":
        yest = now - datetime.timedelta(days=1)
        start_str = yest.strftime("%Y-%m-%d 00:00:00")
        end_str = yest.strftime("%Y-%m-%d 23:59:59")
    elif p == "7d":
        start_str = (now - datetime.timedelta(days=7)).strftime("%Y-%m-%d 00:00:00")
        end_str = now.strftime("%Y-%m-%d 23:59:59")
    elif p == "30d":
        start_str = (now - datetime.timedelta(days=30)).strftime("%Y-%m-%d 00:00:00")
        end_str = now.strftime("%Y-%m-%d 23:59:59")
    elif p == "month":
        start_str = now.strftime("%Y-%m-01 00:00:00")
        end_str = now.strftime("%Y-%m-%d 23:59:59")
    elif p == "custom" and date_from:
        start_str = f"{date_from} 00:00:00" if len(date_from) == 10 else date_from
        end_str = f"{date_to} 23:59:59" if date_to and len(date_to) == 10 else (date_to or now.strftime("%Y-%m-%d 23:59:59"))
    else:
        # All time
        start_str = "2020-01-01 00:00:00"
        end_str = "2099-12-31 23:59:59"

    return start_str, end_str

@router.get("/dashboard-stats", response_model=EnhancedDashboardStatsOut)
async def get_dashboard_stats(
    period: str = Query("today", description="today, yesterday, 7d, 30d, month, all, custom"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    await ensure_admin_tables(d1)
    now = datetime.datetime.utcnow()
    today_start = now.strftime("%Y-%m-%d 00:00:00")
    period_start, period_end = resolve_date_range(period, date_from, date_to)

    # 1. Total & Today Revenue
    total_rev_row = await d1.fetch_one("SELECT SUM(total_amount) as s FROM orders WHERE status != 'cancelled'")
    total_rev = float(total_rev_row["s"] or 0.0) if total_rev_row else 0.0

    today_rev_row = await d1.fetch_one(
        "SELECT SUM(total_amount) as s FROM orders WHERE status != 'cancelled' AND created_at >= ?",
        today_start
    )
    today_rev = float(today_rev_row["s"] or 0.0) if today_rev_row else 0.0

    # Filtered Period Revenue & Orders
    filtered_rev_row = await d1.fetch_one(
        "SELECT SUM(total_amount) as s, COUNT(*) as c FROM orders WHERE status != 'cancelled' AND created_at >= ? AND created_at <= ?",
        period_start, period_end
    )
    filtered_rev = float(filtered_rev_row["s"] or 0.0) if filtered_rev_row else 0.0
    filtered_orders = int(filtered_rev_row["c"] or 0) if filtered_rev_row else 0
    filtered_aov = round(filtered_rev / filtered_orders, 2) if filtered_orders > 0 else 0.0

    # 2. Total & Today Orders
    total_orders_row = await d1.fetch_one("SELECT COUNT(*) as c FROM orders")
    total_orders = int(total_orders_row["c"] or 0) if total_orders_row else 0

    today_orders_row = await d1.fetch_one("SELECT COUNT(*) as c FROM orders WHERE created_at >= ?", today_start)
    today_orders = int(today_orders_row["c"] or 0) if today_orders_row else 0

    # 3. Product & Inventory Counts
    total_prods_row = await d1.fetch_one("SELECT COUNT(*) as c FROM products WHERE is_active = 1")
    total_products = int(total_prods_row["c"] or 0) if total_prods_row else 0

    total_custs_row = await d1.fetch_one("SELECT COUNT(*) as c FROM users WHERE role = 'customer'")
    total_customers = int(total_custs_row["c"] or 0) if total_custs_row else 0

    pending_orders_row = await d1.fetch_one(
        "SELECT COUNT(*) as c FROM orders WHERE status IN ('pending', 'confirmed', 'pending_whatsapp', 'processing', 'packed', 'out_for_delivery')"
    )
    pending_orders = int(pending_orders_row["c"] or 0) if pending_orders_row else 0

    delivered_orders_row = await d1.fetch_one("SELECT COUNT(*) as c FROM orders WHERE status = 'delivered'")
    delivered_orders = int(delivered_orders_row["c"] or 0) if delivered_orders_row else 0

    cancelled_orders_row = await d1.fetch_one("SELECT COUNT(*) as c FROM orders WHERE status = 'cancelled'")
    cancelled_orders = int(cancelled_orders_row["c"] or 0) if cancelled_orders_row else 0

    low_stock_row = await d1.fetch_one("SELECT COUNT(*) as c FROM product_variants WHERE stock > 0 AND stock < 10")
    low_stock_count = int(low_stock_row["c"] or 0) if low_stock_row else 0

    out_of_stock_row = await d1.fetch_one("SELECT COUNT(*) as c FROM product_variants WHERE stock <= 0")
    out_of_stock_count = int(out_of_stock_row["c"] or 0) if out_of_stock_row else 0

    valuation_row = await d1.fetch_one("SELECT SUM(stock * price) as val FROM product_variants")
    inventory_val = float(valuation_row["val"] or 0.0) if valuation_row else 0.0

    # 4. Aggregate status counts
    order_status_counts: Dict[str, int] = {}
    status_records = await d1.fetch_all("SELECT status, COUNT(*) as c FROM orders GROUP BY status")
    for r in status_records:
        if r.get("status"):
            order_status_counts[r["status"]] = int(r["c"])

    # 5. Top Products
    top_items = await d1.fetch_all(
        """
        SELECT oi.product_id, oi.product_name, SUM(oi.quantity) as units_sold, SUM(oi.total_price) as revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status != 'cancelled'
        GROUP BY oi.product_id, oi.product_name
        ORDER BY units_sold DESC
        LIMIT 6
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

    # 6. Sales Trend (Daily points in the last 7 or 14 days)
    trend_start = (now - datetime.timedelta(days=14)).strftime("%Y-%m-%d 00:00:00")
    daily_orders = await d1.fetch_all(
        """
        SELECT substr(created_at, 1, 10) as day, SUM(total_amount) as rev, COUNT(*) as cnt
        FROM orders
        WHERE status != 'cancelled' AND created_at >= ?
        GROUP BY substr(created_at, 1, 10)
        ORDER BY day ASC
        """,
        trend_start
    )
    sales_trend_map = {r["day"]: {"revenue": float(r["rev"] or 0.0), "orders": int(r["cnt"] or 0)} for r in daily_orders}
    
    sales_trend = []
    for i in range(7, -1, -1):
        d_str = (now - datetime.timedelta(days=i)).strftime("%Y-%m-%d")
        pt = sales_trend_map.get(d_str, {"revenue": 0.0, "orders": 0})
        sales_trend.append(SalesTrendPoint(date=d_str, revenue=pt["revenue"], orders=pt["orders"]))

    # 7. Recent Orders & Stock changes
    recent_orders_raw = await d1.fetch_all("SELECT * FROM orders ORDER BY created_at DESC LIMIT 6")
    recent_orders = await load_orders_with_items(d1, recent_orders_raw)

    recent_stock_raw = await d1.fetch_all(
        """
        SELECT il.*, p.name as product_name
        FROM inventory_logs il
        LEFT JOIN products p ON p.id = il.product_id
        ORDER BY il.created_at DESC
        LIMIT 5
        """
    )
    recent_stock_changes = [
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
        for l in recent_stock_raw
    ]

    return EnhancedDashboardStatsOut(
        total_revenue=round(total_rev, 2),
        today_revenue=round(today_rev, 2),
        filtered_revenue=round(filtered_rev, 2),
        total_orders=total_orders,
        today_orders=today_orders,
        filtered_orders=filtered_orders,
        filtered_aov=filtered_aov,
        total_products=total_products,
        total_customers=total_customers,
        pending_orders=pending_orders,
        delivered_orders=delivered_orders,
        cancelled_orders=cancelled_orders,
        low_stock_products=low_stock_count,
        out_of_stock_products=out_of_stock_count,
        inventory_valuation=round(inventory_val, 2),
        order_status_counts=order_status_counts,
        top_products=top_products,
        recent_orders=recent_orders,
        sales_trend=sales_trend,
        recent_stock_changes=recent_stock_changes
    )

@router.get("/analytics", response_model=AnalyticsReportOut)
async def get_analytics_report(
    period: str = Query("30d"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    await ensure_admin_tables(d1)
    period_start, period_end = resolve_date_range(period, date_from, date_to)

    # Orders aggregate
    agg_row = await d1.fetch_one(
        "SELECT SUM(total_amount) as s, COUNT(*) as c FROM orders WHERE status != 'cancelled' AND created_at >= ? AND created_at <= ?",
        period_start, period_end
    )
    tot_rev = float(agg_row["s"] or 0.0) if agg_row else 0.0
    tot_orders = int(agg_row["c"] or 0) if agg_row else 0
    aov = round(tot_rev / tot_orders, 2) if tot_orders > 0 else 0.0

    # Total units sold
    units_row = await d1.fetch_one(
        """
        SELECT SUM(oi.quantity) as u
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status != 'cancelled' AND o.created_at >= ? AND o.created_at <= ?
        """,
        period_start, period_end
    )
    units_sold = int(units_row["u"] or 0) if units_row else 0

    # Sales trend
    trend_rows = await d1.fetch_all(
        """
        SELECT substr(created_at, 1, 10) as day, SUM(total_amount) as rev, COUNT(*) as cnt
        FROM orders
        WHERE status != 'cancelled' AND created_at >= ? AND created_at <= ?
        GROUP BY substr(created_at, 1, 10)
        ORDER BY day ASC
        """,
        period_start, period_end
    )
    sales_trend = [
        SalesTrendPoint(date=r["day"], revenue=round(float(r["rev"] or 0.0), 2), orders=int(r["cnt"] or 0))
        for r in trend_rows
    ]

    # Category performance
    cat_rows = await d1.fetch_all(
        """
        SELECT c.id, c.name, SUM(oi.quantity) as units, SUM(oi.total_price) as rev
        FROM categories c
        JOIN products p ON p.category_id = c.id
        JOIN order_items oi ON oi.product_id = p.id
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status != 'cancelled' AND o.created_at >= ? AND o.created_at <= ?
        GROUP BY c.id, c.name
        ORDER BY rev DESC
        """,
        period_start, period_end
    )
    cat_breakdown = []
    for cr in cat_rows:
        cr_rev = float(cr["rev"] or 0.0)
        pct = round((cr_rev / tot_rev * 100), 1) if tot_rev > 0 else 0.0
        cat_breakdown.append(CategoryAnalyticsItem(
            category_id=cr["id"],
            category_name=cr["name"],
            units_sold=int(cr["units"] or 0),
            revenue=round(cr_rev, 2),
            percentage_share=pct
        ))

    # Top selling products
    top_items = await d1.fetch_all(
        """
        SELECT oi.product_id, oi.product_name, SUM(oi.quantity) as units_sold, SUM(oi.total_price) as revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status != 'cancelled' AND o.created_at >= ? AND o.created_at <= ?
        GROUP BY oi.product_id, oi.product_name
        ORDER BY units_sold DESC
        LIMIT 10
        """,
        period_start, period_end
    )
    top_selling = [
        TopProductStat(
            id=ti["product_id"],
            name=ti["product_name"],
            units_sold=int(ti["units_sold"] or 0),
            revenue=round(float(ti["revenue"] or 0.0), 2)
        )
        for ti in top_items
    ]

    # Slow moving products (active products with stock > 0 and 0 or low sales)
    slow_items = await d1.fetch_all(
        """
        SELECT p.id, p.name, c.name as category_name, v.stock, v.price
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        JOIN product_variants v ON v.product_id = p.id AND v.is_default = 1
        WHERE p.is_active = 1 AND v.stock > 10
        AND p.id NOT IN (
            SELECT DISTINCT oi.product_id
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE o.status != 'cancelled' AND o.created_at >= ?
        )
        LIMIT 8
        """,
        period_start
    )
    slow_moving = [
        {
            "id": s["id"],
            "name": s["name"],
            "category_name": s.get("category_name") or "Organic Produce",
            "stock": s["stock"],
            "price": float(s["price"])
        }
        for s in slow_items
    ]

    # Inventory by category
    inv_by_cat = await d1.fetch_all(
        """
        SELECT c.id, c.name, COUNT(DISTINCT p.id) as skus, SUM(v.stock) as total_units, SUM(v.stock * v.price) as retail_val
        FROM categories c
        JOIN products p ON p.category_id = c.id
        JOIN product_variants v ON v.product_id = p.id
        GROUP BY c.id, c.name
        ORDER BY retail_val DESC
        """
    )
    inventory_categories = [
        InventoryCategoryValuation(
            category_id=ic["id"],
            category_name=ic["name"],
            sku_count=int(ic["skus"] or 0),
            total_units=int(ic["total_units"] or 0),
            retail_valuation=round(float(ic["retail_val"] or 0.0), 2)
        )
        for ic in inv_by_cat
    ]

    # Repeat customer rate
    repeat_row = await d1.fetch_one(
        """
        SELECT
            COUNT(DISTINCT user_id) as total_users,
            COUNT(DISTINCT CASE WHEN order_count > 1 THEN user_id END) as repeat_users
        FROM (
            SELECT user_id, COUNT(*) as order_count
            FROM orders
            WHERE user_id IS NOT NULL AND status != 'cancelled'
            GROUP BY user_id
        )
        """
    )
    rep_rate = 0.0
    if repeat_row and repeat_row.get("total_users"):
        tot_u = int(repeat_row["total_users"])
        rep_u = int(repeat_row["repeat_users"] or 0)
        rep_rate = round((rep_u / tot_u * 100), 1) if tot_u > 0 else 0.0

    return AnalyticsReportOut(
        period=period,
        date_from=period_start[:10],
        date_to=period_end[:10],
        total_revenue=round(tot_rev, 2),
        total_orders=tot_orders,
        average_order_value=aov,
        total_units_sold=units_sold,
        sales_trend=sales_trend,
        category_breakdown=cat_breakdown,
        top_selling_products=top_selling,
        slow_moving_products=slow_moving,
        inventory_by_category=inventory_categories,
        repeat_customer_rate=rep_rate
    )

# --- Inventory Operations ---
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
            "is_low_stock": 0 < stock < 10,
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

# --- Customers Operations ---
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

# --- Order Cancellation ---
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

# --- Coupons & Discount Operations ---
@router.get("/coupons", response_model=List[CouponOut])
async def list_coupons(
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    await ensure_admin_tables(d1)
    rows = await d1.fetch_all("SELECT * FROM coupons ORDER BY id DESC")
    return [
        CouponOut(
            id=r["id"],
            code=r["code"],
            description=r.get("description"),
            discount_type=r.get("discount_type") or "percentage",
            discount_value=float(r["discount_value"]),
            min_order_amount=float(r.get("min_order_amount") or 0.0),
            max_discount_amount=float(r["max_discount_amount"]) if r.get("max_discount_amount") is not None else None,
            usage_limit=int(r["usage_limit"]) if r.get("usage_limit") is not None else 100,
            usage_count=int(r.get("usage_count") or 0),
            is_active=bool(r.get("is_active", 1)),
            valid_from=str(r["valid_from"]) if r.get("valid_from") else None,
            valid_until=str(r["valid_until"]) if r.get("valid_until") else None,
            created_at=str(r["created_at"])
        )
        for r in rows
    ]

@router.post("/coupons", response_model=CouponOut, status_code=status.HTTP_201_CREATED)
async def create_coupon(
    payload: CouponCreate,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    await ensure_admin_tables(d1)
    code_upper = payload.code.strip().upper()
    existing = await d1.fetch_one("SELECT id FROM coupons WHERE code = ?", code_upper)
    if existing:
        raise HTTPException(status_code=400, detail="A coupon with this code already exists.")

    new_id = await d1.execute_insert(
        """
        INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, is_active, valid_from, valid_until)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        code_upper, payload.description, payload.discount_type, payload.discount_value,
        payload.min_order_amount, payload.max_discount_amount, payload.usage_limit,
        1 if payload.is_active else 0, payload.valid_from, payload.valid_until
    )
    row = await d1.fetch_one("SELECT * FROM coupons WHERE id = ?", new_id)
    return CouponOut(
        id=row["id"],
        code=row["code"],
        description=row.get("description"),
        discount_type=row.get("discount_type") or "percentage",
        discount_value=float(row["discount_value"]),
        min_order_amount=float(row.get("min_order_amount") or 0.0),
        max_discount_amount=float(row["max_discount_amount"]) if row.get("max_discount_amount") is not None else None,
        usage_limit=int(row["usage_limit"]) if row.get("usage_limit") is not None else 100,
        usage_count=int(row.get("usage_count") or 0),
        is_active=bool(row.get("is_active", 1)),
        valid_from=str(row["valid_from"]) if row.get("valid_from") else None,
        valid_until=str(row["valid_until"]) if row.get("valid_until") else None,
        created_at=str(row["created_at"])
    )

@router.put("/coupons/{coupon_id}", response_model=CouponOut)
async def update_coupon(
    coupon_id: int,
    payload: CouponUpdate,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    await ensure_admin_tables(d1)
    existing = await d1.fetch_one("SELECT * FROM coupons WHERE id = ?", coupon_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Coupon not found.")

    updates = []
    params = []
    if payload.code is not None:
        updates.append("code = ?")
        params.append(payload.code.strip().upper())
    if payload.description is not None:
        updates.append("description = ?")
        params.append(payload.description)
    if payload.discount_type is not None:
        updates.append("discount_type = ?")
        params.append(payload.discount_type)
    if payload.discount_value is not None:
        updates.append("discount_value = ?")
        params.append(payload.discount_value)
    if payload.min_order_amount is not None:
        updates.append("min_order_amount = ?")
        params.append(payload.min_order_amount)
    if payload.max_discount_amount is not None:
        updates.append("max_discount_amount = ?")
        params.append(payload.max_discount_amount)
    if payload.usage_limit is not None:
        updates.append("usage_limit = ?")
        params.append(payload.usage_limit)
    if payload.is_active is not None:
        updates.append("is_active = ?")
        params.append(1 if payload.is_active else 0)

    if updates:
        params.append(coupon_id)
        await d1.execute(f"UPDATE coupons SET {', '.join(updates)} WHERE id = ?", *params)

    row = await d1.fetch_one("SELECT * FROM coupons WHERE id = ?", coupon_id)
    return CouponOut(
        id=row["id"],
        code=row["code"],
        description=row.get("description"),
        discount_type=row.get("discount_type") or "percentage",
        discount_value=float(row["discount_value"]),
        min_order_amount=float(row.get("min_order_amount") or 0.0),
        max_discount_amount=float(row["max_discount_amount"]) if row.get("max_discount_amount") is not None else None,
        usage_limit=int(row["usage_limit"]) if row.get("usage_limit") is not None else 100,
        usage_count=int(row.get("usage_count") or 0),
        is_active=bool(row.get("is_active", 1)),
        valid_from=str(row["valid_from"]) if row.get("valid_from") else None,
        valid_until=str(row["valid_until"]) if row.get("valid_until") else None,
        created_at=str(row["created_at"])
    )

@router.delete("/coupons/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_coupon(
    coupon_id: int,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    await ensure_admin_tables(d1)
    await d1.execute("DELETE FROM coupons WHERE id = ?", coupon_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# --- Reviews Moderation Operations ---
@router.get("/reviews", response_model=List[ReviewOut])
async def list_reviews(
    status_filter: Optional[str] = None,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    await ensure_admin_tables(d1)
    clauses = ["1=1"]
    params = []
    if status_filter and status_filter != "all":
        clauses.append("r.status = ?")
        params.append(status_filter)

    rows = await d1.fetch_all(
        f"""
        SELECT r.*, p.name as product_name
        FROM reviews r
        LEFT JOIN products p ON p.id = r.product_id
        WHERE {' AND '.join(clauses)}
        ORDER BY r.id DESC
        """,
        *params
    )
    return [
        ReviewOut(
            id=r["id"],
            product_id=r["product_id"],
            product_name=r.get("product_name") or f"Product #{r['product_id']}",
            customer_name=r["customer_name"],
            rating=int(r["rating"]),
            title=r.get("title"),
            comment=r["comment"],
            is_verified_buyer=bool(r.get("is_verified_buyer", 1)),
            status=r.get("status") or "approved",
            created_at=str(r["created_at"])
        )
        for r in rows
    ]

@router.put("/reviews/{review_id}/status", response_model=ReviewOut)
async def update_review_status(
    review_id: int,
    payload: ReviewStatusUpdate,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    await ensure_admin_tables(d1)
    await d1.execute("UPDATE reviews SET status = ? WHERE id = ?", payload.status, review_id)
    r = await d1.fetch_one(
        "SELECT r.*, p.name as product_name FROM reviews r LEFT JOIN products p ON p.id = r.product_id WHERE r.id = ?",
        review_id
    )
    if not r:
        raise HTTPException(status_code=404, detail="Review not found.")
    return ReviewOut(
        id=r["id"],
        product_id=r["product_id"],
        product_name=r.get("product_name") or f"Product #{r['product_id']}",
        customer_name=r["customer_name"],
        rating=int(r["rating"]),
        title=r.get("title"),
        comment=r["comment"],
        is_verified_buyer=bool(r.get("is_verified_buyer", 1)),
        status=r.get("status") or "approved",
        created_at=str(r["created_at"])
    )

@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: int,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    await ensure_admin_tables(d1)
    await d1.execute("DELETE FROM reviews WHERE id = ?", review_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# --- Delivery Zones Operations ---
@router.get("/delivery-zones", response_model=List[DeliveryZoneOut])
async def list_delivery_zones(
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    await ensure_admin_tables(d1)
    rows = await d1.fetch_all("SELECT * FROM delivery_zones ORDER BY pincode ASC")
    return [
        DeliveryZoneOut(
            id=r["id"],
            pincode=r["pincode"],
            area_name=r["area_name"],
            is_active=bool(r.get("is_active", 1)),
            delivery_fee=float(r.get("delivery_fee") or 39.0),
            estimated_delivery_time=r.get("estimated_delivery_time") or "15-30 Mins",
            created_at=str(r["created_at"])
        )
        for r in rows
    ]

@router.post("/delivery-zones", response_model=DeliveryZoneOut, status_code=status.HTTP_201_CREATED)
async def create_delivery_zone(
    payload: DeliveryZoneCreate,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    await ensure_admin_tables(d1)
    existing = await d1.fetch_one("SELECT id FROM delivery_zones WHERE pincode = ?", payload.pincode.strip())
    if existing:
        raise HTTPException(status_code=400, detail="A delivery zone with this pincode already exists.")

    new_id = await d1.execute_insert(
        """
        INSERT INTO delivery_zones (pincode, area_name, is_active, delivery_fee, estimated_delivery_time)
        VALUES (?, ?, ?, ?, ?)
        """,
        payload.pincode.strip(), payload.area_name.strip(), 1 if payload.is_active else 0,
        payload.delivery_fee, payload.estimated_delivery_time
    )
    row = await d1.fetch_one("SELECT * FROM delivery_zones WHERE id = ?", new_id)
    return DeliveryZoneOut(
        id=row["id"],
        pincode=row["pincode"],
        area_name=row["area_name"],
        is_active=bool(row.get("is_active", 1)),
        delivery_fee=float(row.get("delivery_fee") or 39.0),
        estimated_delivery_time=row.get("estimated_delivery_time") or "15-30 Mins",
        created_at=str(row["created_at"])
    )

@router.put("/delivery-zones/{zone_id}", response_model=DeliveryZoneOut)
async def update_delivery_zone(
    zone_id: int,
    payload: DeliveryZoneUpdate,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    await ensure_admin_tables(d1)
    updates = []
    params = []
    if payload.pincode is not None:
        updates.append("pincode = ?")
        params.append(payload.pincode.strip())
    if payload.area_name is not None:
        updates.append("area_name = ?")
        params.append(payload.area_name.strip())
    if payload.is_active is not None:
        updates.append("is_active = ?")
        params.append(1 if payload.is_active else 0)
    if payload.delivery_fee is not None:
        updates.append("delivery_fee = ?")
        params.append(payload.delivery_fee)
    if payload.estimated_delivery_time is not None:
        updates.append("estimated_delivery_time = ?")
        params.append(payload.estimated_delivery_time)

    if updates:
        params.append(zone_id)
        await d1.execute(f"UPDATE delivery_zones SET {', '.join(updates)} WHERE id = ?", *params)

    row = await d1.fetch_one("SELECT * FROM delivery_zones WHERE id = ?", zone_id)
    if not row:
        raise HTTPException(status_code=404, detail="Delivery zone not found.")
    return DeliveryZoneOut(
        id=row["id"],
        pincode=row["pincode"],
        area_name=row["area_name"],
        is_active=bool(row.get("is_active", 1)),
        delivery_fee=float(row.get("delivery_fee") or 39.0),
        estimated_delivery_time=row.get("estimated_delivery_time") or "15-30 Mins",
        created_at=str(row["created_at"])
    )

@router.delete("/delivery-zones/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_delivery_zone(
    zone_id: int,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    await ensure_admin_tables(d1)
    await d1.execute("DELETE FROM delivery_zones WHERE id = ?", zone_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
