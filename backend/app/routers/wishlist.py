from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from backend.app.database import get_db
from backend.app.models import Wishlist, Product, User
from backend.app.schemas import WishlistItemOut, WishlistToggleRequest
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
def toggle_wishlist(
    toggle_in: WishlistToggleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(Wishlist).filter(
        Wishlist.user_id == current_user.id,
        Wishlist.product_id == toggle_in.product_id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"in_wishlist": False, "message": "Removed from wishlist."}
    else:
        # Check product exists
        product = db.query(Product).filter(Product.id == toggle_in.product_id, Product.is_active == True).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found.")

        item = Wishlist(user_id=current_user.id, product_id=toggle_in.product_id)
        db.add(item)
        db.commit()
        return {"in_wishlist": True, "message": "Added to wishlist."}

