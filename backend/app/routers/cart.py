import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session, selectinload
from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models import Cart, CartItem, Product, ProductVariant, DeliverySetting, User
from backend.app.schemas import CartOut, CartItemAdd, CartItemUpdate, CartItemOut, ProductOut, VariantOut
from backend.app.routers.products import enrich_product_out
from backend.app.deps import get_optional_user
from backend.app.pricing import compute_financials

router = APIRouter(prefix="/cart", tags=["Shopping Cart"])

def get_or_create_cart(db: Session, user: Optional[User], session_id: Optional[str]) -> Cart:
    """
    Get or create active shopping cart for authenticated user or anonymous guest.
    Guest carts are strictly isolated using unique session UUIDs.
    """
    if user and user.id:
        cart = db.query(Cart).filter(Cart.user_id == user.id).first()
        if not cart:
            cart = Cart(user_id=user.id)
            db.add(cart)
            db.commit()
            db.refresh(cart)
    elif session_id and session_id.strip():
        clean_sid = session_id.strip()
        cart = db.query(Cart).filter(Cart.session_id == clean_sid).first()
        if not cart:
            cart = Cart(session_id=clean_sid)
            db.add(cart)
            db.commit()
            db.refresh(cart)
    else:
        # Generate isolated UUID for guest to prevent session collision
        unique_guest_id = f"guest_{uuid.uuid4().hex}"
        cart = Cart(session_id=unique_guest_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


def compute_cart_details(cart: Cart, db: Session) -> CartOut:
    settings_rec = db.query(DeliverySetting).first()
    free_threshold = settings_rec.free_delivery_threshold if settings_rec else 499.0
    standard_delivery = settings_rec.standard_delivery_fee if settings_rec else 39.0

    # Load items with product, images, and variant using non-blocking selectinload
    items = db.query(CartItem).options(
        selectinload(CartItem.product).selectinload(Product.images),
        selectinload(CartItem.product).selectinload(Product.variants),
        selectinload(CartItem.product).selectinload(Product.category),
        selectinload(CartItem.variant)
    ).filter(CartItem.cart_id == cart.id).all()

    items_out = []
    raw_fin_items = []

    for item in items:
        if not item.product or not item.variant or not item.product.is_active:
            continue
        
        p_out = enrich_product_out(item.product)
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
    # Verify product and variant
    product = db.query(Product).filter(Product.id == item_in.product_id, Product.is_active == True).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or currently unavailable.")

    variant = None
    if item_in.variant_id:
        variant = db.query(ProductVariant).filter(
            ProductVariant.id == item_in.variant_id,
            ProductVariant.product_id == item_in.product_id
        ).first()
    
    if not variant:
        # Fallback to primary/first variant
        variant = db.query(ProductVariant).filter(
            ProductVariant.product_id == item_in.product_id
        ).order_by(ProductVariant.is_default.desc()).first()

    if not variant:
        raise HTTPException(status_code=400, detail="Product variant not configured.")

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
    return compute_cart_details(cart, db)


@router.put("/items/{item_id}", response_model=CartOut)
def update_cart_item(
    item_id: int,
    item_in: CartItemUpdate,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    cart = get_or_create_cart(db, user, x_session_id)
    cart_item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.cart_id == cart.id
    ).first()

    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found.")

    if item_in.quantity <= 0:
        db.delete(cart_item)
    else:
        variant = db.query(ProductVariant).filter(ProductVariant.id == cart_item.variant_id).first()
        if variant and variant.stock < item_in.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Only {variant.stock} units available in stock."
            )
        cart_item.quantity = item_in.quantity

    db.commit()
    return compute_cart_details(cart, db)


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

    return compute_cart_details(cart, db)


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
