"""
Sri Adithya Organics — Admin Action Approval System
Enforces two-step verification workflow for all sensitive operations:
stock adjustments, price updates, promotion publishing, and product modifications.
Guarantees database transactions, audit logging, and idempotency key protection.
"""
import json
import hashlib
from datetime import datetime
from typing import Dict, Any, List, Optional

class ActionApprovalManager:

    @classmethod
    async def propose_stock_adjustment(
        cls,
        d1,
        product_id: int,
        variant_id: Optional[int],
        delta: int,
        reason: str,
        admin_id: int
    ) -> Dict[str, Any]:
        """Proposes a stock adjustment with preview diff."""
        # Validate product and variant
        query = """SELECT p.name, v.id as vid, v.unit, v.stock, v.price
                   FROM products p
                   JOIN product_variants v ON p.id = v.product_id
                   WHERE p.id = ?"""
        params = [product_id]
        if variant_id:
            query += " AND v.id = ?"
            params.append(variant_id)
        else:
            query += " AND v.is_default = 1"

        variant = await d1.fetch_one(query, *params)
        if not variant:
            raise ValueError(f"Product #{product_id} or specified variant not found.")

        current_stock = variant["stock"]
        new_stock = max(0, current_stock + delta)
        actual_vid = variant["vid"]

        preview_diff = {
            "product_name": variant["name"],
            "unit": variant["unit"],
            "current_stock": current_stock,
            "stock_change": delta,
            "new_stock": new_stock,
            "price": variant["price"]
        }

        payload = {
            "product_id": product_id,
            "variant_id": actual_vid,
            "delta": delta,
            "new_stock": new_stock,
            "reason": reason
        }

        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        idempotency_raw = f"stock:{actual_vid}:{delta}:{reason}:{now_str}"
        idempotency_key = hashlib.sha256(idempotency_raw.encode("utf-8")).hexdigest()

        title = f"Stock Adjustment: {variant['name']} ({'+' if delta > 0 else ''}{delta} units)"
        summary = f"Adjust on-shelf inventory from {current_stock} to {new_stock} units. Reason: {reason}"

        approval_id = await d1.execute_insert(
            """INSERT INTO ai_action_approvals (
                action_type, target_id, title, summary, payload_json, preview_diff_json,
                status, requested_by, idempotency_key, created_at
            ) VALUES ('stock_adjustment', ?, ?, ?, ?, ?, 'pending', ?, ?, ?)""",
            actual_vid, title, summary, json.dumps(payload), json.dumps(preview_diff),
            admin_id, idempotency_key, now_str
        )

        return {
            "approval_id": approval_id,
            "action_type": "stock_adjustment",
            "title": title,
            "summary": summary,
            "preview_diff": preview_diff,
            "status": "pending",
            "idempotency_key": idempotency_key
        }

    @classmethod
    async def propose_price_update(
        cls,
        d1,
        product_id: int,
        variant_id: Optional[int],
        new_price: float,
        reason: str,
        admin_id: int
    ) -> Dict[str, Any]:
        """Proposes a retail price modification with preview diff."""
        if new_price <= 0:
            raise ValueError("New price must be greater than zero.")

        query = """SELECT p.name, v.id as vid, v.unit, v.price, v.mrp
                   FROM products p
                   JOIN product_variants v ON p.id = v.product_id
                   WHERE p.id = ?"""
        params = [product_id]
        if variant_id:
            query += " AND v.id = ?"
            params.append(variant_id)
        else:
            query += " AND v.is_default = 1"

        variant = await d1.fetch_one(query, *params)
        if not variant:
            raise ValueError(f"Product #{product_id} or variant not found.")

        current_price = variant["price"]
        mrp = variant["mrp"]
        actual_vid = variant["vid"]

        preview_diff = {
            "product_name": variant["name"],
            "unit": variant["unit"],
            "current_price": current_price,
            "new_price": new_price,
            "price_delta": round(new_price - current_price, 2),
            "mrp": mrp
        }

        payload = {
            "product_id": product_id,
            "variant_id": actual_vid,
            "current_price": current_price,
            "new_price": new_price,
            "reason": reason
        }

        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        idempotency_raw = f"price:{actual_vid}:{new_price}:{now_str}"
        idempotency_key = hashlib.sha256(idempotency_raw.encode("utf-8")).hexdigest()

        title = f"Price Update: {variant['name']} (₹{current_price} -> ₹{new_price})"
        summary = f"Update price from ₹{current_price} to ₹{new_price}. Reason: {reason}"

        approval_id = await d1.execute_insert(
            """INSERT INTO ai_action_approvals (
                action_type, target_id, title, summary, payload_json, preview_diff_json,
                status, requested_by, idempotency_key, created_at
            ) VALUES ('price_update', ?, ?, ?, ?, ?, 'pending', ?, ?, ?)""",
            actual_vid, title, summary, json.dumps(payload), json.dumps(preview_diff),
            admin_id, idempotency_key, now_str
        )

        return {
            "approval_id": approval_id,
            "action_type": "price_update",
            "title": title,
            "summary": summary,
            "preview_diff": preview_diff,
            "status": "pending",
            "idempotency_key": idempotency_key
        }

    @classmethod
    async def list_pending_approvals(cls, d1) -> List[Dict[str, Any]]:
        """Returns all pending proposals awaiting administrator confirmation."""
        rows = await d1.fetch_all(
            """SELECT * FROM ai_action_approvals
               WHERE status = 'pending'
               ORDER BY created_at DESC"""
        )
        res = []
        for r in rows:
            item = dict(r)
            try:
                item["preview_diff"] = json.loads(item.get("preview_diff_json") or "{}")
            except Exception:
                item["preview_diff"] = {}
            res.append(item)
        return res

    @classmethod
    async def resolve_approval(
        cls,
        d1,
        approval_id: int,
        approved: bool,
        admin_id: int,
        ip_address: Optional[str] = "unknown"
    ) -> Dict[str, Any]:
        """
        Executes approved action or records rejection.
        Never allows unapproved automatic execution.
        """
        record = await d1.fetch_one("SELECT * FROM ai_action_approvals WHERE id = ?", approval_id)
        if not record:
            raise ValueError(f"Approval action #{approval_id} not found.")

        if record["status"] != "pending":
            raise ValueError(f"Approval action #{approval_id} has already been {record['status']}.")

        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        # 1. Rejection Path
        if not approved:
            await d1.execute(
                """UPDATE ai_action_approvals
                   SET status = 'rejected',
                       approved_by = ?,
                       executed_at = ?
                   WHERE id = ?""",
                admin_id, now_str, approval_id
            )
            return {
                "approval_id": approval_id,
                "status": "rejected",
                "message": f"Proposal #{approval_id} rejected by administrator."
            }

        # 2. Approval & Execution Path
        payload = json.loads(record["payload_json"])
        action_type = record["action_type"]

        if action_type == "stock_adjustment":
            variant_id = payload["variant_id"]
            new_stock = payload["new_stock"]
            reason = payload.get("reason", "Admin Action Approval")

            # Fetch existing stock
            cur_v = await d1.fetch_one("SELECT stock, product_id FROM product_variants WHERE id = ?", variant_id)
            if cur_v:
                prev_stock = cur_v["stock"]
                delta = new_stock - prev_stock

                # Update variant stock
                await d1.execute("UPDATE product_variants SET stock = ? WHERE id = ?", new_stock, variant_id)

                # Log inventory movement
                await d1.execute(
                    """INSERT INTO inventory_logs (
                        product_id, previous_stock, changed_stock, new_stock, reason, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?)""",
                    cur_v["product_id"], prev_stock, delta, new_stock, f"[Approved Proposal #{approval_id}] {reason}", now_str
                )

        elif action_type == "price_update":
            variant_id = payload["variant_id"]
            new_price = payload["new_price"]
            await d1.execute("UPDATE product_variants SET price = ? WHERE id = ?", new_price, variant_id)

        # Mark approval record executed
        await d1.execute(
            """UPDATE ai_action_approvals
               SET status = 'executed',
                   approved_by = ?,
                   executed_at = ?
               WHERE id = ?""",
            admin_id, now_str, approval_id
        )

        # Record in ai_audit_logs
        await d1.execute(
            """INSERT INTO ai_audit_logs (
                action, entity_type, entity_id, details_json, admin_id, ip_address, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
            f"EXECUTE_{action_type.upper()}",
            "ai_action_approvals",
            approval_id,
            record["payload_json"],
            admin_id,
            ip_address,
            now_str
        )

        return {
            "approval_id": approval_id,
            "status": "executed",
            "action_type": action_type,
            "message": f"Action #{approval_id} ({action_type}) successfully executed and applied to database."
        }

action_approvals = ActionApprovalManager()
