from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session, joinedload
from backend.app.database import get_db
from backend.app.models import Cart, CartItem, Product, ProductVariant, DeliverySetting, User
from backend.app.schemas import CartOut, CartItemAdd, CartItemUpdate, CartItemOut, ProductOut, VariantOut
from backend.app.routers.products import enrich_product_out
from backend.app.deps import get_optional_user

router = APIRouter(prefix="/cart", tags=["Shopping Cart"])

def get_or_create_cart(db: Session, user: Optional[User], session_id: Optional[str]) -> Cart:
    cart = None
    if user:
        cart = db.query(Cart).filter(Cart.user_id == user.id).first()
        if not cart:
            cart = Cart(user_id=user.id)
            db.add(cart)
            db.commit()
            db.refresh(cart)
    elif session_id:
        cart = db.query(Cart).filter(Cart.session_id == session_id).first()
        if not cart:
            cart = Cart(session_id=session_id)
            db.add(cart)
            db.commit()
            db.refresh(cart)
    else:
        # Fallback session cart
        cart = Cart(session_id="guest_default")
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart

def compute_cart_details(cart: Cart, db: Session) -> CartOut:
    settings = db.query(DeliverySetting).first()
    free_threshold = settings.free_delivery_threshold if settings else 499.0
    standard_delivery = settings.standard_delivery_fee if settings else 39.0

    items_out = []
    subtotal = 0.0
    total_mrp = 0.0
    total_qty = 0

    # Load items with product and variant
    items = db.query(CartItem).options(
        joinedload(CartItem.product).joinedload(Product.images),
        joinedload(CartItem.product).joinedload(Product.variants),
        joinedload(CartItem.product).joinedload(Product.category),
        joinedload(CartItem.variant)
    ).filter(CartItem.cart_id == cart.id).all()

    for item in items:
        if not item.product or not item.variant or not item.product.is_active:
            continue
        
        item_subtotal = item.variant.price * item.quantity
        item_mrp_total = item.variant.mrp * item.quantity
        subtotal += item_subtotal
        total_mrp += item_mrp_total
        total_qty += item.quantity

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

    discount = max(0.0, total_mrp - subtotal)
    
    # Delivery fee logic
    if subtotal == 0:
        delivery_fee = 0.0
        free_progress = 0.0
        needed_for_free = free_threshold
    elif subtotal >= free_threshold:
        delivery_fee = 0.0
        free_progress = 100.0
        needed_for_free = 0.0
    else:
        delivery_fee = standard_delivery
        free_progress = min(100.0, round((subtotal / free_threshold) * 100, 1))
        needed_for_free = round(free_threshold - subtotal, 2)

    total_amount = round(subtotal + delivery_fee, 2)

    return CartOut(
        id=cart.id,
        items=items_out,
        item_count=total_qty,
        subtotal=round(subtotal, 2),
        discount=round(discount, 2),
        delivery_fee=round(delivery_fee, 2),
        taxes=0.0,  # Prices are inclusive of GST
        total_amount=total_amount,
        free_delivery_threshold=free_threshold,
        free_delivery_progress=free_progress,
        amount_needed_for_free_delivery=needed_for_free
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
def add_to_cart(
    item_in: CartItemAdd,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    # Verify product and variant
    product = db.query(Product).filter(Product.id == item_in.product_id, Product.is_active == True).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or unavailable.")

    variant = db.query(ProductVariant).filter(
        ProductVariant.id == item_in.variant_id,
        ProductVariant.product_id == item_in.product_id
    ).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Product variant not found.")

    if variant.stock < 1:
        raise HTTPException(status_code=400, detail=f"Sorry, {product.name} ({variant.unit}) is out of stock.")

    cart = get_or_create_cart(db, user, x_session_id)

    # Check existing item
    existing_item = db.query(CartItem).filter(
        CartItem.cart_id == cart.id,
        CartItem.product_id == item_in.product_id,
        CartItem.variant_id == item_in.variant_id
    ).first()

    requested_qty = item_in.quantity if not existing_item else existing_item.quantity + item_in.quantity
    if requested_qty > variant.stock:
        raise HTTPException(
            status_code=400,
            detail=f"Only {variant.stock} units available in stock."
        )

    if existing_item:
        existing_item.quantity = requested_qty
    else:
        new_item = CartItem(
            cart_id=cart.id,
            product_id=item_in.product_id,
            variant_id=item_in.variant_id,
            quantity=item_in.quantity
        )
        db.add(new_item)

    db.commit()
    db.refresh(cart)
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
        db.commit()
        return compute_cart_details(cart, db)

    variant = db.query(ProductVariant).filter(ProductVariant.id == cart_item.variant_id).first()
    if variant and item_in.quantity > variant.stock:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot order more than available stock ({variant.stock} units)."
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


@router.post("/clear", response_model=CartOut)
def clear_cart(
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    cart = get_or_create_cart(db, user, x_session_id)
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
    db.commit()
    return compute_cart_details(cart, db)

