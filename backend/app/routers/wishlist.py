from typing import List, Dict, Set, Optional, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from backend.app.config import settings
from backend.app.database import get_db, check_db_connection
from backend.app.models import Wishlist, Product, User
from backend.app.schemas import WishlistItemOut, WishlistToggleRequest, ProductOut
from backend.app.deps import get_current_user
from backend.app.routers.products import enrich_product_out
from backend.app.sheets.service import sheets_service

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])

# In-memory user wishlist store for Google Sheets / DB-free mode
_SHEETS_WISHLIST_STORE: Dict[int, Set[int]] = {}

def is_sheets_storage() -> bool:
    return settings.STORAGE_BACKEND == "sheets" or not check_db_connection()[0]

@router.get("", response_model=List[WishlistItemOut])
def get_user_wishlist(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    if is_sheets_storage():
        user_id = getattr(current_user, "id", None) or 1
        product_ids = _SHEETS_WISHLIST_STORE.get(user_id, set())
        results = []
        for pid in product_ids:
            prod = sheets_service.get_product_by_id_or_slug(str(pid))
            if not prod or not prod.get("is_active", True):
                continue
            p_out = ProductOut.model_validate(prod)
            results.append(WishlistItemOut(
                id=pid,
                product_id=pid,
                created_at=datetime.now(timezone.utc),
                product=p_out
            ))
        return results

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
    current_user: Any = Depends(get_current_user)
):
    if is_sheets_storage():
        user_id = getattr(current_user, "id", None) or 1
        prod = sheets_service.get_product_by_id_or_slug(str(toggle_in.product_id))
        if not prod or not prod.get("is_active", True):
            raise HTTPException(status_code=404, detail="Product not found.")

        user_set = _SHEETS_WISHLIST_STORE.setdefault(user_id, set())
        if toggle_in.product_id in user_set:
            user_set.remove(toggle_in.product_id)
            return {"in_wishlist": False, "message": "Removed from wishlist."}
        else:
            user_set.add(toggle_in.product_id)
            return {"in_wishlist": True, "message": "Added to wishlist."}

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

