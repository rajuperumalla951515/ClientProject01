"""
Sri Adithya Organics — AI Business Intelligence Assistant
Answers conversational executive inquiries using strictly predefined,
parameterized D1 database tools. NEVER executes arbitrary SQL.
"""
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from backend.app.ai.router import ai_router

BI_SYSTEM_PROMPT = """You are the Senior Business Intelligence Analyst for Sri Adithya Organics.
You provide executive summaries for store owners regarding sales revenue, order fulfillment,
stock levels, and customer trends.
Strict Security & Integrity Rules:
1. NEVER invent numbers or make up data. You must cite ONLY the verified figures provided in the Database Report.
2. If the data is empty or unavailable, state clearly that no records exist in the database for that query.
3. NEVER reveal customer passwords, hashes, internal system keys, or payment gateway credentials.
4. Keep answers professional, executive-level, clear, and actionable. Format with clean bullet points.
5. Currency must always be formatted in Indian Rupees (₹).
"""

class BusinessIntelligenceAssistant:

    # --- Predefined Parameterized D1 Database Tools ---

    @classmethod
    async def get_sales_summary(cls, d1, days: int = 30) -> Dict[str, Any]:
        """Calculates revenue, orders count, and AOV for the last N days."""
        cutoff = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")
        row = await d1.fetch_one(
            """SELECT
                COUNT(*) as total_orders,
                COALESCE(SUM(total_amount), 0.0) as total_revenue,
                COALESCE(AVG(total_amount), 0.0) as average_order_value
               FROM orders
               WHERE status != 'cancelled' AND created_at >= ?""",
            cutoff
        )
        return {
            "period_days": days,
            "total_orders": row.get("total_orders", 0) if row else 0,
            "total_revenue": round(float(row.get("total_revenue", 0.0) if row else 0.0), 2),
            "average_order_value": round(float(row.get("average_order_value", 0.0) if row else 0.0), 2),
        }

    @classmethod
    async def get_top_products(cls, d1, limit: int = 10) -> List[Dict[str, Any]]:
        """Returns fastest moving products by volume and revenue."""
        rows = await d1.fetch_all(
            """SELECT
                oi.product_id,
                oi.product_name,
                SUM(oi.quantity) as units_sold,
                COALESCE(SUM(oi.total_price), 0.0) as revenue
               FROM order_items oi
               JOIN orders o ON oi.order_id = o.id
               WHERE o.status != 'cancelled'
               GROUP BY oi.product_id, oi.product_name
               ORDER BY units_sold DESC
               LIMIT ?""",
            limit
        )
        return [dict(r) for r in rows]

    @classmethod
    async def get_low_stock_products(cls, d1, threshold: int = 15) -> List[Dict[str, Any]]:
        """Identifies SKUs currently at or below the minimum stock threshold or out of stock."""
        rows = await d1.fetch_all(
            """SELECT
                p.id,
                p.name,
                c.name as category_name,
                v.unit,
                v.stock,
                v.price
               FROM products p
               JOIN categories c ON p.category_id = c.id
               JOIN product_variants v ON p.id = v.product_id
               WHERE p.is_active = 1 AND v.stock <= ?
               ORDER BY v.stock ASC
               LIMIT 25""",
            threshold
        )
        return [dict(r) for r in rows]

    @classmethod
    async def get_pending_orders(cls, d1) -> Dict[str, Any]:
        """Returns details on pending, WhatsApp pending, and processing orders."""
        rows = await d1.fetch_all(
            """SELECT
                o.id,
                o.order_number,
                COALESCE(u.name, json_extract(o.delivery_address_json, '$.recipient_name'), 'Guest Customer') AS customer_name,
                o.status,
                o.total_amount,
                o.delivery_slot,
                o.created_at
               FROM orders o
               LEFT JOIN users u ON o.user_id = u.id
               WHERE o.status IN ('pending', 'pending_whatsapp', 'processing')
               ORDER BY o.created_at ASC"""
        )
        return {
            "count": len(rows),
            "orders": [dict(r) for r in rows]
        }

    @classmethod
    async def get_inventory_report(cls, d1) -> Dict[str, Any]:
        """Warehouse-wide stock valuation and SKU balance."""
        row = await d1.fetch_one(
            """SELECT
                COUNT(DISTINCT p.id) as total_products,
                COUNT(v.id) as total_variants,
                COALESCE(SUM(v.stock), 0) as total_units_in_stock,
                COALESCE(SUM(v.stock * v.price), 0.0) as inventory_retail_valuation
               FROM products p
               JOIN product_variants v ON p.id = v.product_id
               WHERE p.is_active = 1"""
        )
        return {
            "total_products": row.get("total_products", 0) if row else 0,
            "total_variants": row.get("total_variants", 0) if row else 0,
            "total_units_in_stock": row.get("total_units_in_stock", 0) if row else 0,
            "inventory_retail_valuation": round(float(row.get("inventory_retail_valuation", 0.0) if row else 0.0), 2)
        }

    @classmethod
    async def get_customer_statistics(cls, d1) -> Dict[str, Any]:
        """Returns customer counts, repeat buyer counts, and retention rate."""
        total_cust_row = await d1.fetch_one("SELECT COUNT(*) as c FROM users WHERE role = 'customer'")
        total_customers = total_cust_row.get("c", 0) if total_cust_row else 0

        repeat_row = await d1.fetch_one(
            """SELECT COUNT(*) as c FROM (
                SELECT user_id FROM orders WHERE status != 'cancelled' AND user_id IS NOT NULL
                GROUP BY user_id HAVING COUNT(*) > 1
            )"""
        )
        repeat_customers = repeat_row.get("c", 0) if repeat_row else 0
        rate = (repeat_customers / max(total_customers, 1)) * 100.0

        return {
            "total_registered_customers": total_customers,
            "repeat_customers": repeat_customers,
            "retention_rate_percent": round(rate, 1)
        }

    @classmethod
    async def get_revenue_comparison(cls, d1) -> Dict[str, Any]:
        """Compares last 30 days against the preceding 30 days."""
        now = datetime.utcnow()
        last_30_start = (now - timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S")
        prev_30_start = (now - timedelta(days=60)).strftime("%Y-%m-%d %H:%M:%S")

        current_row = await d1.fetch_one(
            """SELECT COALESCE(SUM(total_amount), 0.0) as rev, COUNT(*) as ords
               FROM orders WHERE status != 'cancelled' AND created_at >= ?""",
            last_30_start
        )
        prev_row = await d1.fetch_one(
            """SELECT COALESCE(SUM(total_amount), 0.0) as rev, COUNT(*) as ords
               FROM orders WHERE status != 'cancelled' AND created_at >= ? AND created_at < ?""",
            prev_30_start, last_30_start
        )

        curr_rev = float(current_row.get("rev", 0.0) if current_row else 0.0)
        prev_rev = float(prev_row.get("rev", 0.0) if prev_row else 0.0)
        growth_percent = (((curr_rev - prev_rev) / max(prev_rev, 1.0)) * 100.0) if prev_rev > 0 else 0.0

        return {
            "current_30_days_revenue": round(curr_rev, 2),
            "current_30_days_orders": current_row.get("ords", 0) if current_row else 0,
            "previous_30_days_revenue": round(prev_rev, 2),
            "previous_30_days_orders": prev_row.get("ords", 0) if prev_row else 0,
            "growth_percent": round(growth_percent, 1)
        }

    @classmethod
    async def get_application_overview(cls, d1) -> Dict[str, Any]:
        """Comprehensive snapshot of the entire Sri Adithya Organics application."""
        # 1. Database entity counts
        prod_count = (await d1.fetch_one("SELECT COUNT(*) as c FROM products")).get("c", 0)
        active_prod_count = (await d1.fetch_one("SELECT COUNT(*) as c FROM products WHERE is_active = 1")).get("c", 0)
        cat_count = (await d1.fetch_one("SELECT COUNT(*) as c FROM categories")).get("c", 0)
        orders_count = (await d1.fetch_one("SELECT COUNT(*) as c FROM orders")).get("c", 0)
        users_count = (await d1.fetch_one("SELECT COUNT(*) as c FROM users")).get("c", 0)
        customers_count = (await d1.fetch_one("SELECT COUNT(*) as c FROM users WHERE role = 'customer'")).get("c", 0)
        admins_count = (await d1.fetch_one("SELECT COUNT(*) as c FROM users WHERE role = 'admin'")).get("c", 0)

        # 2. Financial totals
        fin_row = await d1.fetch_one("SELECT COALESCE(SUM(total_amount), 0.0) as rev FROM orders WHERE status != 'cancelled'")
        lifetime_revenue = round(float(fin_row.get("rev", 0.0) if fin_row else 0.0), 2)

        # 3. Warehouse valuation
        inv_row = await d1.fetch_one("""
            SELECT
                COALESCE(SUM(v.stock), 0) as total_units,
                COALESCE(SUM(v.stock * v.price), 0.0) as val
            FROM product_variants v
            JOIN products p ON v.product_id = p.id
            WHERE p.is_active = 1
        """)
        total_units = inv_row.get("total_units", 0) if inv_row else 0
        inventory_valuation = round(float(inv_row.get("val", 0.0) if inv_row else 0.0), 2)

        # 4. Delivery & WhatsApp settings
        deliv = await d1.fetch_one("SELECT * FROM delivery_settings LIMIT 1")
        whatsapp = (deliv.get("whatsapp_number") if deliv and deliv.get("whatsapp_number") else "919515159006")
        min_order = float(deliv.get("min_order_amount", 99.0)) if deliv else 99.0
        free_deliv = float(deliv.get("free_delivery_threshold", 499.0)) if deliv else 499.0
        std_fee = float(deliv.get("standard_delivery_fee", 39.0)) if deliv else 39.0
        exp_fee = float(deliv.get("express_delivery_fee", 59.0)) if deliv else 59.0
        announcement = deliv.get("announcement_text", "") if deliv else ""

        # 5. AI Providers status
        providers = await d1.fetch_all("SELECT provider_name, model_name, is_enabled, requests_today, last_success_at FROM ai_provider_config ORDER BY priority ASC")

        # 6. Categories list
        categories_rows = await d1.fetch_all("SELECT name FROM categories WHERE is_active = 1 ORDER BY display_order ASC")

        return {
            "application_name": "Sri Adithya Organics",
            "version": "1.0.0",
            "environment": "production",
            "runtime": "Cloudflare Workers Python (Pyodide ASGI)",
            "database": {
                "engine": "Cloudflare D1 (Serverless Distributed SQLite)",
                "database_name": "sri-adithya-db",
                "database_id": "ba45ad6e-035c-4a3f-a9b6-77ec16e5a355",
                "total_products": prod_count,
                "active_products": active_prod_count,
                "total_categories": cat_count,
                "total_orders": orders_count,
                "total_users": users_count,
                "registered_customers": customers_count,
                "administrators": admins_count,
                "active_categories": [c["name"] for c in categories_rows]
            },
            "commerce_and_logistics": {
                "whatsapp_business_ordering": f"+{whatsapp}",
                "whatsapp_channel_url": f"https://wa.me/{whatsapp}",
                "minimum_order_amount": min_order,
                "free_delivery_threshold": free_deliv,
                "standard_delivery_fee": std_fee,
                "express_delivery_fee": exp_fee,
                "delivery_speed": "Instant 15-30 Mins (Vaagai wood-pressed oils & fresh farm produce)",
                "announcement_banner": announcement or "Fresh Wood-Pressed Oils & Organic Produce Daily"
            },
            "financial_summary": {
                "lifetime_gross_revenue": lifetime_revenue,
                "warehouse_units_in_stock": total_units,
                "warehouse_retail_valuation": inventory_valuation
            },
            "ai_intelligence_system": {
                "policy": "100% Zero-Cost Hard Quota Guard",
                "primary_provider": "Cloudflare Workers AI (@cf/meta/llama-3.1-8b-instruct)",
                "fallback_provider_1": "GroqCloud API (llama-3.3-70b-versatile)",
                "fallback_provider_2": "Google Gemini API (gemini-flash-latest)",
                "active_providers": [dict(p) for p in providers]
            },
            "architecture_endpoints": {
                "customer_storefront": "https://sriadithyaorganics.pages.dev",
                "admin_portal": "https://adminsriadithyaorganics.pages.dev",
                "backend_worker": "https://sriadithyaorganics.devraj951515.workers.dev"
            }
        }

    @classmethod
    async def ask(
        cls,
        d1,
        question: str,
        admin_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Executes conversational inquiry:
        1. Classifies intent & fetches deterministic verified D1 database records.
        2. Synthesizes a factual, executive response.
        """
        q_lower = question.lower().strip()
        data_payload: Dict[str, Any] = {}
        tool_used = "general_business_report"

        # Determine tools to execute
        if any(w in q_lower for w in ["entire application", "application details", "system architecture", "app details", "application overview", "about the app", "system details", "store details", "all details", "everything"]):
            data_payload["entire_application_details"] = await cls.get_application_overview(d1)
            tool_used = "application_details"

        if any(w in q_lower for w in ["today", "revenue", "sales", "month", "last week", "aov", "average order"]):
            data_payload["sales_summary_30d"] = await cls.get_sales_summary(d1, days=30)
            data_payload["sales_summary_7d"] = await cls.get_sales_summary(d1, days=7)
            data_payload["revenue_comparison"] = await cls.get_revenue_comparison(d1)
            if tool_used == "general_business_report":
                tool_used = "sales_summary"

        if any(w in q_lower for w in ["top", "best seller", "selling", "popular", "fast"]):
            data_payload["top_selling_products"] = await cls.get_top_products(d1, limit=10)
            if tool_used == "general_business_report":
                tool_used = "top_products"

        if any(w in q_lower for w in ["stock", "inventory", "low", "out of stock", "replenish", "warehouse"]):
            data_payload["low_stock_products"] = await cls.get_low_stock_products(d1, threshold=15)
            data_payload["inventory_summary"] = await cls.get_inventory_report(d1)
            if tool_used == "general_business_report":
                tool_used = "inventory_report"

        if any(w in q_lower for w in ["pending", "unfulfilled", "order status", "dispatch"]):
            data_payload["pending_orders"] = await cls.get_pending_orders(d1)
            if tool_used == "general_business_report":
                tool_used = "pending_orders"

        if any(w in q_lower for w in ["customer", "repeat", "retention", "shopper", "loyalty"]):
            data_payload["customer_statistics"] = await cls.get_customer_statistics(d1)
            if tool_used == "general_business_report":
                tool_used = "customer_statistics"

        # If question is broad, fetch high-level health overview
        if not data_payload:
            data_payload["entire_application_details"] = await cls.get_application_overview(d1)
            tool_used = "application_details"

        # Synthesize with AI
        prompt = f"""Admin User Question: "{question}"

Verified Database Data (Source of Truth):
{json.dumps(data_payload, indent=2)}

Please answer the admin's question concisely based strictly on the verified data above.
Include key metrics (with ₹ symbol) and brief recommendations if helpful."""

        res = await ai_router.route_request(
            d1=d1,
            task_type="bi_assistant",
            prompt=prompt,
            system_prompt=BI_SYSTEM_PROMPT,
            json_mode=False,
            admin_id=admin_id
        )

        return {
            "answer": res["content"],
            "tool_used": tool_used,
            "verified_data": data_payload,
            "provider": res["provider"],
            "model": res["model"]
        }

bi_assistant = BusinessIntelligenceAssistant()
