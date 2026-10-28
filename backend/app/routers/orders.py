import json
import random
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from backend.app.database import get_db
from backend.app.models import (
    Order, OrderItem, Payment, Cart, CartItem, Product, ProductVariant,
    Address, DeliverySetting, User
)
from backend.app.schemas import OrderCreate, OrderOut, OrderStatusUpdate
from backend.app.deps import get_current_user, get_current_admin
from backend.app.routers.products import enrich_product_out

router = APIRouter(prefix="/orders", tags=["Orders & Checkout"])

def generate_order_number() -> str:
    now = datetime.datetime.utcnow()
    rand_suffix = random.randint(100000, 999999)
    return f"SAO-{now.strftime('%Y%m%d-%H%M%S')}-{rand_suffix}"


@router.post("/checkout", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def checkout(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Validate Address
    address = db.query(Address).filter(
        Address.id == order_in.address_id,
        Address.user_id == current_user.id
    ).first()
    if not address:
        raise HTTPException(status_code=400, detail="Please select a valid delivery address.")

    address_snapshot = {
        "label": address.label,
        "recipient_name": address.recipient_name,
        "phone": address.phone,
        "street": address.street,
        "apartment": address.apartment,
        "landmark": address.landmark,
        "city": address.city,
        "state": address.state,
        "postal_code": address.postal_code,
    }

    # 2. Get User Cart
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Your cart is empty. Add items before checking out.")

    # 3. Check delivery settings
    settings = db.query(DeliverySetting).first()
    min_order = settings.min_order_amount if settings else 99.0
    free_threshold = settings.free_delivery_threshold if settings else 499.0
    standard_delivery = settings.standard_delivery_fee if settings else 39.0

    # 4. Stock validation & Subtotal calculation
    subtotal = 0.0
    total_mrp = 0.0
    order_items_to_create = []

    for item in cart.items:
        variant = db.query(ProductVariant).filter(ProductVariant.id == item.variant_id).first()
        product = db.query(Product).filter(Product.id == item.product_id).first()

        if not product or not variant or not product.is_active:
            raise HTTPException(
                status_code=400,
                detail=f"An item in your cart is no longer available."
            )

        if variant.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.name} ({variant.unit}). Available: {variant.stock}, requested: {item.quantity}."
            )

        item_total = round(variant.price * item.quantity, 2)
        subtotal += item_total
        total_mrp += round(variant.mrp * item.quantity, 2)

        # Image preview
        primary_img = None
        if product.images:
            sorted_imgs = sorted(product.images, key=lambda x: (not x.is_primary, x.display_order))
            primary_img = sorted_imgs[0].image_url

        order_items_to_create.append({
            "product_id": product.id,
            "variant_id": variant.id,
            "product_name": product.name,
            "variant_name": variant.unit,
            "unit_price": variant.price,
            "mrp": variant.mrp,
            "quantity": item.quantity,
            "total_price": item_total,
            "image_url": primary_img,
            "variant_ref": variant
        })

    # Validate minimum order amount
    if subtotal < min_order:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum order amount is ₹{min_order:.0f}. Please add more items to proceed."
        )

    # Calculate delivery fee & discount
    discount = max(0.0, total_mrp - subtotal)
    delivery_fee = 0.0 if subtotal >= free_threshold else standard_delivery
    final_amount = round(subtotal + delivery_fee, 2)

    # 5. Create Order
    order_number = generate_order_number()
    payment_status = "paid" if order_in.payment_method in ["upi", "card", "netbanking"] else "pending"

    order = Order(
        order_number=order_number,
        user_id=current_user.id,
        status="confirmed",
        subtotal=round(subtotal, 2),
        discount=round(discount, 2),
        delivery_fee=round(delivery_fee, 2),
        tax=0.0,
        total_amount=final_amount,
        delivery_slot=order_in.delivery_slot,
        delivery_address_json=json.dumps(address_snapshot),
        notes=order_in.notes,
        payment_method=order_in.payment_method,
        payment_status=payment_status,
        payment_id=(
            f"{order_in.payment_id}_{random.randint(1000, 9999)}"
            if order_in.payment_id and db.query(Payment).filter(Payment.transaction_id == order_in.payment_id).first()
            else (order_in.payment_id or f"PAY-TEST-{random.randint(100000, 999999)}")
        )
    )
    db.add(order)
    db.flush()

    # 6. Add order items & deduct stock atomically
    for item_data in order_items_to_create:
        variant = item_data.pop("variant_ref")
        variant.stock -= item_data["quantity"]  # Stock reduction

        order_item = OrderItem(order_id=order.id, **item_data)
        db.add(order_item)

    # 7. Record Payment
    payment = Payment(
        order_id=order.id,
        user_id=current_user.id,
        amount=final_amount,
        currency="INR",
        payment_gateway="Razorpay Test Mode" if order_in.payment_method != "cod" else "Cash On Delivery",
        transaction_id=order.payment_id,
        status="success" if payment_status == "paid" else "pending",
        raw_response=json.dumps({"method": order_in.payment_method, "verified": True, "mode": "test"})
    )
    db.add(payment)

    # 8. Clear user cart
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()

    db.commit()
    db.refresh(order)
    return order


@router.get("", response_model=List[OrderOut])
def get_user_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    orders = db.query(Order).options(
        joinedload(Order.items)
    ).filter(
        Order.user_id == current_user.id
    ).order_by(Order.created_at.desc()).all()

    return orders


@router.get("/admin/all", response_model=List[OrderOut])
def get_all_orders_admin(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    query = db.query(Order).options(joinedload(Order.items))
    if status_filter:
        query = query.filter(Order.status == status_filter)
    return query.order_by(Order.created_at.desc()).all()


@router.get("/{order_id}", response_model=OrderOut)
def get_order_details(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).options(
        joinedload(Order.items)
    ).filter(Order.id == order_id).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    # Authorization: only order owner or admin can view
    if order.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied.")

    return order


@router.put("/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: int,
    status_in: OrderStatusUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    valid_statuses = ["pending", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled"]
    if status_in.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

    order.status = status_in.status
    if status_in.payment_status:
        order.payment_status = status_in.payment_status
    if status_in.status == "delivered":
        order.payment_status = "paid"

    db.commit()
    db.refresh(order)
    return order

