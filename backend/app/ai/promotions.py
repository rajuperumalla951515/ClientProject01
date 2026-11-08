"""
Sri Adithya Organics — Promotion Intelligence & Margin Validation Engine
AI recommends strategic promotional offers, while the backend strictly enforces
cost floors, maximum discounts, and gross margin integrity.
"""
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from backend.app.ai.router import ai_router

PROMOTION_SYSTEM_PROMPT = """You are the Senior Retail Pricing & Merchandising Strategist for Sri Adithya Organics.
Objective: Recommend high-converting, seasonal, margin-safe promotional concepts.
Guidelines:
1. Emphasize traditional wellness incentives: e.g. "Pure Vaagai Pressed Oil Festival Offer", "First Harvest Shopper Discount".
2. Focus on organic customer retention and basket size expansion.
3. Suggest clear promo codes (e.g. HARVEST15, PUREOIL20, HEALTHYCART).
4. Output strictly valid JSON without markdown formatting.
"""

class PromotionIntelligence:

    @classmethod
    def calculate_margin(cls, original_price: float, discounted_price: float, estimated_cost: float) -> Dict[str, float]:
        """
        Deterministic backend financial calculations. AI is never trusted with finance mathematics.
        """
        orig = max(original_price, 1.0)
        disc_price = max(discounted_price, 0.0)
        cost = max(estimated_cost, 0.0)

        discount_amount = max(0.0, orig - disc_price)
        discount_percent = (discount_amount / orig) * 100.0

        if disc_price > 0:
            gross_profit = disc_price - cost
            gross_margin = (gross_profit / disc_price) * 100.0
        else:
            gross_profit = 0.0
            gross_margin = 0.0

        return {
            "original_price": round(orig, 2),
            "discount_amount": round(discount_amount, 2),
            "discount_percent": round(discount_percent, 1),
            "discounted_price": round(disc_price, 2),
            "estimated_cost": round(cost, 2),
            "gross_profit": round(gross_profit, 2),
            "gross_margin_percent": round(gross_margin, 1)
        }

    @classmethod
    async def recommend_promotion(
        cls,
        d1,
        product_id: Optional[int] = None,
        category_id: Optional[int] = None,
        campaign_goal: str = "growth",  # 'growth', 'clear_stock', 'festival', 'retention'
        min_margin_percent: float = 18.0,
        admin_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Synthesizes catalog stock, sales velocity, and pricing to generate a margin-safe offer.
        """
        target_name = "Storewide Catalog"
        original_price = 450.0
        mrp = 550.0
        stock = 100
        category_name = "All Produce"

        if product_id:
            prod = await d1.fetch_one(
                """SELECT p.name, p.id, c.name as category_name,
                          v.price, v.mrp, v.stock
                   FROM products p
                   LEFT JOIN categories c ON p.category_id = c.id
                   LEFT JOIN product_variants v ON p.id = v.product_id AND v.is_default = 1
                   WHERE p.id = ?""",
                product_id
            )
            if prod:
                target_name = prod["name"]
                original_price = float(prod.get("price") or 380.0)
                mrp = float(prod.get("mrp") or (original_price * 1.25))
                stock = int(prod.get("stock") or 50)
                category_name = prod.get("category_name", "Wood-Pressed Oils")

        # Conservative estimated procurement cost (typically 65-72% of retail price in organic grocery)
        estimated_cost = original_price * 0.70

        prompt = f"""Generate promotional offer recommendation:
Target: {target_name}
Category: {category_name}
Current Retail Selling Price: ₹{original_price}
MRP: ₹{mrp}
Warehouse Stock Quantity: {stock} units
Campaign Goal: {campaign_goal}
Minimum Allowed Profit Margin: {min_margin_percent}%

Respond ONLY with a JSON object in this exact schema:
{{
    "title": "Campaign headline (e.g. Traditional Groundnut Oil Harvest Celebration)",
    "suggested_code": "PROMOCODE",
    "promo_type": "percentage",
    "recommended_discount_percent": 12.0,
    "min_order_value": 499.0,
    "reasoning": "Strategic explanation for why this discount maximizes conversion while preserving margin",
    "recommended_duration_days": 14
}}
"""
        res = await ai_router.route_request(
            d1=d1,
            task_type="promotion_intelligence",
            prompt=prompt,
            system_prompt=PROMOTION_SYSTEM_PROMPT,
            json_mode=True,
            admin_id=admin_id
        )

        ai_data = json.loads(res["content"])
        raw_disc_percent = float(ai_data.get("recommended_discount_percent", 10.0))

        # --- Strict Backend Margin Guardrail ---
        # Calculate resulting price
        test_discounted_price = original_price * (1.0 - (raw_disc_percent / 100.0))
        financials = cls.calculate_margin(original_price, test_discounted_price, estimated_cost)

        # If margin violates configured floor, backend automatically clamps the discount!
        margin_adjusted = False
        if financials["gross_margin_percent"] < min_margin_percent:
            # Solve for price where margin = min_margin_percent:
            # (P - cost) / P = m  => P*(1 - m) = cost => P = cost / (1 - m)
            required_price = estimated_cost / (1.0 - (min_margin_percent / 100.0))
            if required_price < original_price:
                test_discounted_price = required_price
            else:
                test_discounted_price = original_price * 0.95  # 5% max safe discount
            financials = cls.calculate_margin(original_price, test_discounted_price, estimated_cost)
            margin_adjusted = True

        now = datetime.utcnow()
        days = int(ai_data.get("recommended_duration_days", 14))
        end_date = (now + timedelta(days=days)).strftime("%Y-%m-%d")

        # Save to ai_promotions draft table
        now_str = now.strftime("%Y-%m-%d %H:%M:%S")
        promo_id = await d1.execute_insert(
            """INSERT INTO ai_promotions (
                title, promo_type, product_id, category_id, original_price,
                discounted_price, calculated_margin, min_order_value, reasoning,
                suggested_code, status, start_date, end_date, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)""",
            ai_data.get("title", f"Special Offer on {target_name}"),
            ai_data.get("promo_type", "percentage"),
            product_id,
            category_id,
            financials["original_price"],
            financials["discounted_price"],
            financials["gross_margin_percent"],
            float(ai_data.get("min_order_value", 499.0)),
            ai_data.get("reasoning", "Margin-validated promotion"),
            ai_data.get("suggested_code", "ORGANICDEAL").upper(),
            now.strftime("%Y-%m-%d"),
            end_date,
            admin_id,
            now_str,
            now_str
        )

        return {
            "promo_id": promo_id,
            "title": ai_data.get("title"),
            "suggested_code": ai_data.get("suggested_code", "ORGANICDEAL").upper(),
            "promo_type": ai_data.get("promo_type", "percentage"),
            "discount_percent": financials["discount_percent"],
            "discount_amount": financials["discount_amount"],
            "financials": financials,
            "margin_adjusted_by_backend": margin_adjusted,
            "min_order_value": float(ai_data.get("min_order_value", 499.0)),
            "reasoning": ai_data.get("reasoning"),
            "start_date": now.strftime("%Y-%m-%d"),
            "end_date": end_date,
            "status": "draft",
            "provider": res["provider"]
        }

    @classmethod
    async def approve_and_publish_promotion(cls, d1, promo_id: int, admin_id: int) -> Dict[str, Any]:
        """
        Two-step approval execution: turns an approved draft promotion into an active production coupon!
        """
        promo = await d1.fetch_one("SELECT * FROM ai_promotions WHERE id = ?", promo_id)
        if not promo:
            raise ValueError(f"Promotion #{promo_id} not found.")

        if promo["status"] == "active":
            raise ValueError(f"Promotion #{promo_id} is already active.")

        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        # 1. Insert or update in active coupons table
        code = promo["suggested_code"]
        discount_value = promo["original_price"] - promo["discounted_price"]
        min_cart = promo["min_order_value"] or 0.0

        existing_coupon = await d1.fetch_one("SELECT id FROM coupons WHERE code = ?", code)
        if existing_coupon:
            await d1.execute(
                """UPDATE coupons
                   SET discount_type = 'flat',
                       discount_value = ?,
                       min_order_amount = ?,
                       is_active = 1,
                       valid_until = ?
                   WHERE id = ?""",
                discount_value, min_cart, promo["end_date"], existing_coupon["id"]
            )
        else:
            await d1.execute(
                """INSERT INTO coupons (
                    code, description, discount_type, discount_value,
                    min_order_amount, is_active, valid_from, valid_until, created_at
                ) VALUES (?, ?, 'flat', ?, ?, 1, ?, ?, ?)""",
                code, promo["title"], discount_value, min_cart,
                promo["start_date"], promo["end_date"], now_str
            )

        # 2. Update ai_promotions status
        await d1.execute(
            """UPDATE ai_promotions
               SET status = 'active',
                   approved_by = ?,
                   updated_at = ?
               WHERE id = ?""",
            admin_id, now_str, promo_id
        )

        return {
            "promo_id": promo_id,
            "code": code,
            "status": "active",
            "message": f"Promotion #{promo_id} approved. Active coupon '{code}' published to customer storefront."
        }

promotion_intelligence = PromotionIntelligence()
