import time
import uuid
from typing import Optional, List, Tuple
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session, joinedload
from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models import Cart, CartItem, Product, ProductVariant, DeliverySetting, User
from backend.app.schemas import CartOut, CartItemAdd, CartItemUpdate, CartItemOut, ProductOut, VariantOut
from backend.app.deps import get_optional_user
from backend.app.pricing import compute_financials

router = APIRouter(prefix="/cart", tags=["Shopping Cart"])

# In-memory TTL cache for delivery settings to eliminate redundant SQL roundtrips on every cart operation
_settings_cache: Optional[Tuple[float, float]] = None
_settings_cache_time: float = 0.0

def get_cached_delivery_settings(db: Session) -> Tuple[float, float]:
    global _settings_cache, _settings_cache_time
    now = time.time()
    if _settings_cache is None or (now - _settings_cache_time) > 60.0:
        setting = db.query(DeliverySetting).first()
        if setting:
            _settings_cache = (
                float(setting.free_delivery_threshold if setting.free_delivery_threshold is not None else 499.0),
                float(setting.standard_delivery_fee if setting.standard_delivery_fee is not None else 39.0)
            )
        else:
            _settings_cache = (499.0, 39.0)
        _settings_cache_time = now
    return _settings_cache


def get_or_create_cart(db: Session, user: Optional[User], session_id: Optional[str]) -> Cart:
    """
    Get or create active shopping cart for authenticated user or anonymous guest.
    Uses single-query joinedload so all cart items, products, and variants are retrieved immediately.
    """
    cart_query = db.query(Cart).options(
        joinedload(Cart.items).joinedload(CartItem.product).joinedload(Product.images),
        joinedload(Cart.items).joinedload(CartItem.variant)
    )

    cart: Optional[Cart] = None
    if user and user.id:
        cart = cart_query.filter(Cart.user_id == user.id).first()
        if not cart:
            cart = Cart(user_id=user.id)
            db.add(cart)
            db.commit()
            cart = cart_query.filter(Cart.id == cart.id).first()
    elif session_id and session_id.strip():
        clean_sid = session_id.strip()
        cart = cart_query.filter(Cart.session_id == clean_sid).first()
        if not cart:
            cart = Cart(session_id=clean_sid)
            db.add(cart)
            db.commit()
            cart = cart_query.filter(Cart.id == cart.id).first()
    else:
        unique_guest_id = f"guest_{uuid.uuid4().hex}"
        cart = Cart(session_id=unique_guest_id)
        db.add(cart)
        db.commit()
        cart = cart_query.filter(Cart.id == cart.id).first()

    return cart


def compute_cart_details(cart: Cart, db: Session) -> CartOut:
    free_threshold, standard_delivery = get_cached_delivery_settings(db)
    items = cart.items or []

    items_out: List[CartItemOut] = []
    raw_fin_items = []

    for item in items:
        if not item.product or not item.variant or not item.product.is_active:
            continue

        primary_img = None
        if item.product.images:
            sorted_images = sorted(item.product.images, key=lambda x: (not x.is_primary, x.display_order))
            primary_img = sorted_images[0].image_url
        if not primary_img:
            primary_img = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800"

        var_price = float(item.variant.price)
        var_mrp = float(item.variant.mrp or item.variant.price)
        discount_pct = int(round(((var_mrp - var_price) / var_mrp) * 100)) if var_mrp > var_price and var_mrp > 0 else 0

        p_out = ProductOut(
            id=item.product.id,
            name=item.product.name,
            slug=item.product.slug,
            category_id=item.product.category_id,
            description=item.product.description or "",
            short_description=item.product.short_description,
            brand=item.product.brand or "Sri Adithya Organics",
            is_featured=item.product.is_featured or False,
            is_best_seller=item.product.is_best_seller or False,
            is_fresh_today=item.product.is_fresh_today or False,
            is_deal=item.product.is_deal or False,
            is_active=item.product.is_active,
            created_at=item.product.created_at,
            primary_image=primary_img,
            min_price=var_price,
            max_price=var_price,
            mrp=var_mrp,
            discount_percentage=discount_pct,
            in_stock=item.variant.stock > 0,
            variants=[VariantOut.model_validate(item.variant)],
            images=[]
        )
        v_out = VariantOut.model_validate(item.variant)

        items_out.append(CartItemOut(
            id=item.id,
            product_id=item.product_id,
            variant_id=item.variant_id,
            quantity=item.quantity,
            product=p_out,
            variant=v_out
        ))

        raw_fin_items.append({
            "product_id": item.product_id,
            "variant_id": item.variant_id,
            "unit_price": item.variant.price,
            "mrp": item.variant.mrp,
            "quantity": item.quantity
        })

    fin = compute_financials(
        raw_fin_items,
        free_delivery_threshold=free_threshold,
        standard_delivery_fee=standard_delivery
    )

    return CartOut(
        id=cart.id,
        items=items_out,
        item_count=fin.item_count,
        subtotal=fin.subtotal,
        discount=fin.discount,
        delivery_fee=fin.delivery_fee,
        taxes=fin.tax,
        total_amount=fin.total_amount,
        free_delivery_threshold=fin.free_delivery_threshold,
        free_delivery_progress=fin.free_delivery_progress,
        amount_needed_for_free_delivery=fin.amount_needed_for_free_delivery
    )


@router.get("", response_model=CartOut)
def get_cart(
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    cart = get_or_create_cart(db, user, x_session_id)
    return compute_cart_details(cart, db)


@router.post("/items", response_model=CartOut)
def add_item_to_cart(
    item_in: CartItemAdd,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    # Single-query resolution of product variant and parent product
    variant_query = db.query(ProductVariant).options(joinedload(ProductVariant.product))
    if item_in.variant_id:
        variant = variant_query.filter(
            ProductVariant.id == item_in.variant_id,
            ProductVariant.product_id == item_in.product_id
        ).first()
    else:
        variant = variant_query.filter(
            ProductVariant.product_id == item_in.product_id
        ).order_by(ProductVariant.is_default.desc(), ProductVariant.id.asc()).first()

    if not variant or not variant.product or not variant.product.is_active:
        raise HTTPException(status_code=404, detail="Product variant not found or currently unavailable.")

    if variant.stock < item_in.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Only {variant.stock} units available in stock."
        )

    cart = get_or_create_cart(db, user, x_session_id)

    # Check existing item
    cart_item = db.query(CartItem).filter(
        CartItem.cart_id == cart.id,
        CartItem.product_id == item_in.product_id,
        CartItem.variant_id == variant.id
    ).first()

    if cart_item:
        new_qty = cart_item.quantity + item_in.quantity
        if variant.stock < new_qty:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot add more. You have {cart_item.quantity} in cart and total stock is {variant.stock}."
            )
        cart_item.quantity = new_qty
    else:
        cart_item = CartItem(
            cart_id=cart.id,
            product_id=item_in.product_id,
            variant_id=variant.id,
            quantity=item_in.quantity
        )
        db.add(cart_item)

    db.commit()
    fresh_cart = get_or_create_cart(db, user, x_session_id)
    return compute_cart_details(fresh_cart, db)


@router.put("/items/{item_id}", response_model=CartOut)
def update_cart_item(
    item_id: int,
    item_in: CartItemUpdate,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    cart = get_or_create_cart(db, user, x_session_id)
    cart_item = db.query(CartItem).options(joinedload(CartItem.variant)).filter(
        CartItem.id == item_id,
        CartItem.cart_id == cart.id
    ).first()

    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found.")

    if item_in.quantity <= 0:
        db.delete(cart_item)
    else:
        if cart_item.variant and cart_item.variant.stock < item_in.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Only {cart_item.variant.stock} units available in stock."
            )
        cart_item.quantity = item_in.quantity

    db.commit()
    fresh_cart = get_or_create_cart(db, user, x_session_id)
    return compute_cart_details(fresh_cart, db)


@router.delete("/items/{item_id}", response_model=CartOut)
def remove_cart_item(
    item_id: int,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    cart = get_or_create_cart(db, user, x_session_id)
    cart_item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.cart_id == cart.id
    ).first()

    if cart_item:
        db.delete(cart_item)
        db.commit()

    fresh_cart = get_or_create_cart(db, user, x_session_id)
    return compute_cart_details(fresh_cart, db)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_cart(
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    cart = get_or_create_cart(db, user, x_session_id)
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
    db.commit()
    return None
