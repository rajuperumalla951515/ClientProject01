import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from backend.app.config import settings
from backend.app.d1 import D1Database, get_d1
from backend.app.schemas import WishlistItemOut, WishlistToggleRequest, ProductOut
from backend.app.deps import get_current_user
from backend.app.routers.products import batch_load_relations, parse_datetime

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])

@router.get("", response_model=List[WishlistItemOut])
async def get_user_wishlist(
    d1: D1Database = Depends(get_d1),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    items = await d1.fetch_all("SELECT * FROM wishlists WHERE user_id = ? ORDER BY id DESC", current_user["id"])
    if not items:
        return []

    product_ids = [it["product_id"] for it in items]
    p_ph = ",".join("?" * len(product_ids))
    products = await d1.fetch_all(f"SELECT * FROM products WHERE id IN ({p_ph}) AND is_active = 1", *product_ids)
    enriched_prods = await batch_load_relations(d1, products)
    prod_map = {p.id: p for p in enriched_prods}

    results = []
    for it in items:
        pid = it["product_id"]
        if pid in prod_map:
            results.append(WishlistItemOut(
                id=it["id"],
                product_id=pid,
                created_at=parse_datetime(it.get("created_at")),
                product=prod_map[pid]
            ))
    return results


@router.post("/toggle")
async def toggle_wishlist_item(
    toggle_in: WishlistToggleRequest,
    d1: D1Database = Depends(get_d1),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = current_user["id"]
    prod = await d1.fetch_one("SELECT id FROM products WHERE id = ? AND is_active = 1", toggle_in.product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found or currently unavailable.")

    existing = await d1.fetch_one(
        "SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?",
        user_id, toggle_in.product_id
    )

    if existing:
        await d1.execute("DELETE FROM wishlists WHERE id = ?", existing["id"])
        return {"status": "removed", "product_id": toggle_in.product_id, "in_wishlist": False}
    else:
        now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        await d1.execute_insert(
            "INSERT INTO wishlists (user_id, product_id, created_at) VALUES (?, ?, ?)",
            user_id, toggle_in.product_id, now
        )
        return {"status": "added", "product_id": toggle_in.product_id, "in_wishlist": True}
