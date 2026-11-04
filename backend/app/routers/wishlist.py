from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models import Wishlist, Product, User
from backend.app.schemas import WishlistItemOut, WishlistToggleRequest, ProductOut
from backend.app.deps import get_current_user
from backend.app.routers.products import enrich_product_out

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])

@router.get("", response_model=List[WishlistItemOut])
def get_user_wishlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = db.query(Wishlist).options(
        joinedload(Wishlist.product).joinedload(Product.images),
        joinedload(Wishlist.product).joinedload(Product.variants),
        joinedload(Wishlist.product).joinedload(Product.category)
    ).filter(Wishlist.user_id == current_user.id).all()

    results = []
    for item in items:
        if not item.product or not item.product.is_active:
            continue
        p_out = enrich_product_out(item.product)
        results.append(WishlistItemOut(
            id=item.id,
            product_id=item.product_id,
            created_at=item.created_at,
            product=p_out
        ))
    return results


@router.post("/toggle")
def toggle_wishlist_item(
    toggle_in: WishlistToggleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    prod = db.query(Product).filter(
        Product.id == toggle_in.product_id,
        Product.is_active == True
    ).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found or currently unavailable.")

    existing = db.query(Wishlist).filter(
        Wishlist.user_id == current_user.id,
        Wishlist.product_id == toggle_in.product_id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"status": "removed", "product_id": toggle_in.product_id, "in_wishlist": False}
    else:
        new_item = Wishlist(
            user_id=current_user.id,
            product_id=toggle_in.product_id
        )
        db.add(new_item)
        db.commit()
        return {"status": "added", "product_id": toggle_in.product_id, "in_wishlist": True}
