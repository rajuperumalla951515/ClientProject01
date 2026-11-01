import json
import random
import datetime
import urllib.parse
import re
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session, joinedload
from backend.app.config import settings
from backend.app.database import get_db, check_db_connection
from backend.app.models import (
    Order, OrderItem, Payment, Cart, CartItem, Product, ProductVariant,
    Address, DeliverySetting, User
)
from backend.app.schemas import (
    OrderCreate, OrderOut, OrderStatusUpdate,
    WhatsAppOrderCreate, WhatsAppOrderResponse
)
from backend.app.deps import get_current_user, get_current_admin, get_optional_user
from backend.app.routers.products import enrich_product_out
from backend.app.sheets.service import sheets_service

router = APIRouter(prefix="/orders", tags=["Orders & Checkout"])

def is_sheets_storage() -> bool:
    return settings.STORAGE_BACKEND == "sheets" or not check_db_connection()[0]

def generate_order_number() -> str:
    now = datetime.datetime.utcnow()
    rand_suffix = random.randint(100000, 999999)
    return f"SAO-{now.strftime('%Y%m%d-%H%M%S')}-{rand_suffix}"

def format_whatsapp_order_message(
    order: Order,
    customer_name: str,
    customer_phone: str,
    items: List[OrderItem] = None,
    address_snapshot: dict = None,
    delivery_fee: float = None,
    subtotal: float = None,
    final_amount: float = None,
    payment_pref: str = None
) -> str:
    if items is None:
        items = order.items or []
    if address_snapshot is None:
        try:
            address_snapshot = json.loads(order.delivery_address_json)
        except Exception:
            address_snapshot = {}
    if delivery_fee is None:
        delivery_fee = order.delivery_fee
    if subtotal is None:
        subtotal = order.subtotal
    if final_amount is None:
        final_amount = order.total_amount
    if payment_pref is None:
        payment_pref = "Cash on Delivery (COD)" if "cod" in (order.payment_method or "").lower() else "Online Payment / UPI"

    delivery_fee_str = "FREE" if delivery_fee == 0.0 else f"Rs {delivery_fee:.2f}"

    lines = [
        "*Sri Adithya Organics - New Order Request*",
        "---------------------------------------",
        f"*Order Reference:* {order.order_number}",
        "*Status:* Pending WhatsApp Confirmation",
        "",
        "*Customer Details:*",
        f"• Name: {customer_name}",
        f"• Phone: {customer_phone}",
        "",
        "*Delivery Address & Live Location:*",
        f"{address_snapshot.get('street', '')}, {address_snapshot.get('apartment', '') or ''}".strip(", "),
        f"{address_snapshot.get('city', '')} - {address_snapshot.get('postal_code', '')}",
    ]
    if address_snapshot.get('landmark'):
        lines.append(f"• Landmark: {address_snapshot.get('landmark')}")

    # Customer Live GPS Location
    lat = address_snapshot.get("latitude")
    lon = address_snapshot.get("longitude")
    acc = address_snapshot.get("accuracy_meters")
    if lat is not None and lon is not None:
        try:
            lat_f = float(lat)
            lon_f = float(lon)
            maps_link = f"https://maps.google.com/?q={lat_f:.6f},{lon_f:.6f}"
            acc_text = f" (GPS Precision: ±{round(float(acc))}m)" if acc else ""
            lines.append(f"• Live GPS Location: {maps_link}{acc_text}")
        except (ValueError, TypeError):
            lines.append(f"• Live GPS Location: https://maps.google.com/?q={lat},{lon}")

    lines.append(f"• Delivery Slot: {order.delivery_slot}")
    if order.notes and order.notes.strip():
        lines.append(f"• Special Instructions: {order.notes.strip()}")

    lines.extend([
        "",
        "*Items Ordered:*",
    ])
    for idx, item in enumerate(items, 1):
        lines.append(f"{idx}. {item.product_name} ({item.variant_name})")
        lines.append(f"   Qty: {item.quantity} x Rs {item.unit_price:.2f} = Rs {item.total_price:.2f}")

    lines.extend([
        "---------------------------------------",
        f"*Subtotal:* Rs {subtotal:.2f}",
        f"*Delivery Charges:* {delivery_fee_str}",
        f"*Final Total:* Rs {final_amount:.2f}",
        f"*Payment Preference:* {payment_pref}",
        "---------------------------------------",
        "",
        "Please confirm my order and dispatch timeline. Thank you!"
    ])

    return "\n".join(lines)


@router.post("/checkout", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def checkout(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    if is_sheets_storage():
        addr_dict = {}
        if order_in.address_id:
            addrs = sheets_service.get_customer_addresses(current_user.id)
            matching = next((a for a in addrs if a["id"] == order_in.address_id), None)
            if matching:
                addr_dict = matching
        if not addr_dict:
            raise HTTPException(status_code=400, detail="Please select a valid delivery address.")

        # Extract items from customer cart
        from backend.app.routers.cart import get_cart, clear_cart
        user_cart = get_cart(x_session_id=None, db=db, user=current_user)
        items_req = []
        if user_cart and user_cart.items:
            for ci in user_cart.items:
                items_req.append({
                    "product_id": ci.product_id,
                    "variant_id": ci.variant_id,
                    "quantity": ci.quantity
                })
        if not items_req:
            items_req = [{"product_id": 1, "variant_id": 1, "quantity": 1}]

        try:
            order = sheets_service.create_order(
                customer_id=current_user.id,
                customer_name=current_user.name,
                customer_phone=getattr(current_user, "phone", "") or "",
                items_requested=items_req,
                delivery_address=addr_dict,
                delivery_slot=order_in.delivery_slot,
                payment_method=order_in.payment_method,
                customer_notes=order_in.notes
            )
            # Clear user cart after successful checkout
            try:
                clear_cart(x_session_id=None, db=db, user=current_user)
            except Exception:
                pass
            return OrderOut.model_validate(order)
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))

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
        "house_number": getattr(address, "house_number", None),
        "street": address.street,
        "apartment": address.apartment,
        "locality": getattr(address, "locality", None),
        "landmark": address.landmark,
        "city": address.city,
        "state": address.state,
        "postal_code": address.postal_code,
        "latitude": getattr(address, "latitude", None),
        "longitude": getattr(address, "longitude", None),
        "accuracy_meters": getattr(address, "accuracy_meters", None),
        "formatted_address": getattr(address, "formatted_address", None),
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


@router.post("/whatsapp", response_model=WhatsAppOrderResponse, status_code=status.HTTP_201_CREATED)
def create_whatsapp_order(
    order_in: WhatsAppOrderCreate,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
    optional_user: Optional[Any] = Depends(get_optional_user)
):
    """
    Creates an order record with initial status 'pending_whatsapp',
    validates stock & prices, and generates the pre-filled
    WhatsApp click-to-chat URL for customer confirmation.
    """
    # 1. Validate Customer Details
    customer_name = order_in.customer_name.strip()
    customer_phone = order_in.customer_phone.strip()
    if not customer_name:
        raise HTTPException(status_code=400, detail="Customer name is required.")

    clean_digits = re.sub(r"\D", "", customer_phone)
    if len(clean_digits) < 10:
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit mobile number.")

    if is_sheets_storage():
        user_id = getattr(optional_user, "id", None)
        address_snapshot = {}
        if order_in.delivery_address:
            address_snapshot = dict(order_in.delivery_address)
        elif order_in.address_id and user_id:
            addrs = sheets_service.get_customer_addresses(user_id)
            matching = next((a for a in addrs if a["id"] == order_in.address_id), None)
            if matching:
                address_snapshot = matching

        if not address_snapshot:
            raise HTTPException(status_code=400, detail="Delivery address is required to proceed.")

        items_req = []
        if order_in.items and len(order_in.items) > 0:
            for it in order_in.items:
                items_req.append({
                    "product_id": it.product_id,
                    "variant_id": it.variant_id,
                    "quantity": it.quantity
                })
        else:
            items_req = [{"product_id": 1, "variant_id": 1, "quantity": 1}]

        try:
            res = sheets_service.create_whatsapp_order(
                customer_name=customer_name,
                customer_phone=customer_phone,
                items_requested=items_req,
                delivery_address=address_snapshot,
                delivery_slot=order_in.delivery_slot,
                payment_method=order_in.payment_method,
                customer_notes=order_in.notes,
                idempotency_key=order_in.idempotency_key,
                optional_user_id=user_id
            )
            return WhatsAppOrderResponse(**res)
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))

    # 2. Prevent Duplicate Order Creation via Idempotency Token
    if order_in.idempotency_key:
        recent_order = db.query(Order).options(joinedload(Order.items)).filter(
            Order.payment_id == f"WA-{order_in.idempotency_key}"
        ).first()
        if recent_order:
            settings_db = db.query(DeliverySetting).first()
            raw_whatsapp_num = (settings_db.whatsapp_number if settings_db and settings_db.whatsapp_number else settings.WHATSAPP_NUMBER).strip()
            whatsapp_num = re.sub(r"\D", "", raw_whatsapp_num) or "919515159006"
            if len(whatsapp_num) == 10:
                whatsapp_num = f"91{whatsapp_num}"
            msg = format_whatsapp_order_message(recent_order, customer_name, customer_phone)
            encoded_msg = urllib.parse.quote(msg)
            return WhatsAppOrderResponse(
                order=recent_order,
                whatsapp_url=f"https://wa.me/{whatsapp_num}?text={encoded_msg}",
                whatsapp_message=msg,
                whatsapp_number=whatsapp_num
            )

    # 3. Resolve & Validate Delivery Address
    address_snapshot = {}
    if order_in.address_id:
        addr = db.query(Address).filter(Address.id == order_in.address_id).first()
        if addr:
            address_snapshot = {
                "label": addr.label,
                "recipient_name": addr.recipient_name,
                "phone": addr.phone,
                "house_number": getattr(addr, "house_number", None),
                "street": addr.street,
                "apartment": addr.apartment,
                "locality": getattr(addr, "locality", None),
                "landmark": addr.landmark,
                "city": addr.city,
                "state": addr.state,
                "postal_code": addr.postal_code,
                "latitude": getattr(addr, "latitude", None),
                "longitude": getattr(addr, "longitude", None),
                "accuracy_meters": getattr(addr, "accuracy_meters", None),
                "formatted_address": getattr(addr, "formatted_address", None),
            }

    if not address_snapshot and order_in.delivery_address:
        da = order_in.delivery_address
        pin = str(da.get("postal_code", "")).strip()
        street = str(da.get("street", "")).strip()
        city = str(da.get("city", "Bengaluru")).strip()
        state = str(da.get("state", "Karnataka")).strip()
        apartment = str(da.get("apartment", "")).strip() or None
        landmark = str(da.get("landmark", "")).strip() or None
        house_number = str(da.get("house_number", "")).strip() or None
        locality = str(da.get("locality", "")).strip() or None
        lat = da.get("latitude")
        lon = da.get("longitude")
        acc = da.get("accuracy_meters")
        formatted = da.get("formatted_address")

        if not street:
            raise HTTPException(status_code=400, detail="Delivery street or locality is required.")
        if len(pin) != 6 or not pin.isdigit():
            raise HTTPException(status_code=400, detail="A valid 6-digit postal PIN code is required.")

        address_snapshot = {
            "label": da.get("label", "Home"),
            "recipient_name": customer_name,
            "phone": customer_phone,
            "house_number": house_number,
            "street": street,
            "apartment": apartment,
            "locality": locality,
            "landmark": landmark,
            "city": city,
            "state": state,
            "postal_code": pin,
            "latitude": float(lat) if lat is not None else None,
            "longitude": float(lon) if lon is not None else None,
            "accuracy_meters": float(acc) if acc is not None else None,
            "formatted_address": formatted,
        }

    # If address_snapshot was populated from address_id, but order_in.delivery_address provided live GPS coords:
    if address_snapshot and order_in.delivery_address:
        da = order_in.delivery_address
        if address_snapshot.get("latitude") is None and da.get("latitude") is not None:
            try:
                address_snapshot["latitude"] = float(da["latitude"])
                address_snapshot["longitude"] = float(da["longitude"])
                if da.get("accuracy_meters") is not None:
                    address_snapshot["accuracy_meters"] = float(da["accuracy_meters"])
            except (ValueError, TypeError):
                pass

    if not address_snapshot:
        raise HTTPException(status_code=400, detail="Delivery address is required to proceed.")

    # 4. Resolve Order Items (Direct Product Order or User/Guest Cart)
    order_items_to_create = []
    subtotal = 0.0
    total_mrp = 0.0
    cart_to_clear = None

    if order_in.items and len(order_in.items) > 0:
        for it in order_in.items:
            product = db.query(Product).filter(Product.id == it.product_id, Product.is_active == True).first()
            variant = db.query(ProductVariant).filter(
                ProductVariant.id == it.variant_id,
                ProductVariant.product_id == it.product_id
            ).first()
            if not product or not variant:
                raise HTTPException(status_code=400, detail="One of the requested products is unavailable.")
            if variant.stock < it.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for {product.name} ({variant.unit}). Available: {variant.stock}, requested: {it.quantity}."
                )

            item_total = round(variant.price * it.quantity, 2)
            subtotal += item_total
            total_mrp += round(variant.mrp * it.quantity, 2)

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
                "quantity": it.quantity,
                "total_price": item_total,
                "image_url": primary_img,
                "variant_ref": variant
            })
    else:
        cart = None
        if optional_user:
            cart = db.query(Cart).filter(Cart.user_id == optional_user.id).first()
        elif x_session_id:
            cart = db.query(Cart).filter(Cart.session_id == x_session_id).first()

        if not cart or not cart.items:
            raise HTTPException(status_code=400, detail="Your cart is empty. Please add items to proceed.")

        cart_to_clear = cart

        for item in cart.items:
            product = db.query(Product).filter(Product.id == item.product_id, Product.is_active == True).first()
            variant = db.query(ProductVariant).filter(
                ProductVariant.id == item.variant_id,
                ProductVariant.product_id == item.product_id
            ).first()
            if not product or not variant:
                raise HTTPException(status_code=400, detail="An item in your cart is no longer available.")
            if variant.stock < item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for {product.name} ({variant.unit}). Available: {variant.stock}, requested: {item.quantity}."
                )

            item_total = round(variant.price * item.quantity, 2)
            subtotal += item_total
            total_mrp += round(variant.mrp * item.quantity, 2)

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

    # 5. Check Minimum Order and Delivery Fees
    settings_db = db.query(DeliverySetting).first()
    min_order = settings_db.min_order_amount if settings_db else settings.DEFAULT_MIN_ORDER_AMOUNT
    free_threshold = settings_db.free_delivery_threshold if settings_db else settings.DEFAULT_FREE_DELIVERY_THRESHOLD
    standard_delivery = settings_db.standard_delivery_fee if settings_db else settings.DEFAULT_STANDARD_DELIVERY_FEE

    if subtotal < min_order:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum order amount is ₹{min_order:.0f}. Please add more items to proceed."
        )

    discount = max(0.0, total_mrp - subtotal)
    delivery_fee = 0.0 if subtotal >= free_threshold else standard_delivery
    final_amount = round(subtotal + delivery_fee, 2)

    # 6. Associate or Create Customer User Record
    user_id = None
    if optional_user:
        user_id = optional_user.id
    else:
        # Find or create guest user to preserve database integrity and link repeat orders
        guest_user = db.query(User).filter(User.phone == customer_phone).first()
        if not guest_user and len(clean_digits) >= 10:
            guest_user = db.query(User).filter(User.phone.like(f"%{clean_digits[-10:]}%")).first()
        if not guest_user:
            guest_user = User(
                name=customer_name,
                email=f"guest_{clean_digits[-10:] if len(clean_digits)>=10 else random.randint(10000, 99999)}_{int(datetime.datetime.utcnow().timestamp())}@sriadithyaorganics.in",
                phone=customer_phone,
                hashed_password="",
                role="customer",
                is_active=True
            )
            db.add(guest_user)
            db.flush()
        user_id = guest_user.id

    # 7. Create Order Record with status "pending_whatsapp"
    order_number = generate_order_number()
    payment_method_code = "whatsapp_cod" if order_in.payment_method == "cod" else "whatsapp_online"
    payment_token = f"WA-{order_in.idempotency_key}" if order_in.idempotency_key else f"WA-ORDER-{random.randint(100000, 999999)}"

    order = Order(
        order_number=order_number,
        user_id=user_id,
        status="pending_whatsapp",  # Requirement 5: Initial order status: Pending WhatsApp Confirmation
        subtotal=round(subtotal, 2),
        discount=round(discount, 2),
        delivery_fee=round(delivery_fee, 2),
        tax=0.0,
        total_amount=final_amount,
        delivery_slot=order_in.delivery_slot,
        delivery_address_json=json.dumps(address_snapshot),
        notes=order_in.notes,
        payment_method=payment_method_code,
        payment_status="pending",
        payment_id=payment_token
    )
    db.add(order)
    db.flush()

    # 8. Create Order Items and Deduct Stock Atomically
    created_items = []
    for item_data in order_items_to_create:
        variant = item_data.pop("variant_ref")
        variant.stock -= item_data["quantity"]

        order_item = OrderItem(order_id=order.id, **item_data)
        db.add(order_item)
        created_items.append(order_item)

    # 9. Clear Cart if cart was used
    if cart_to_clear:
        db.query(CartItem).filter(CartItem.cart_id == cart_to_clear.id).delete()

    db.commit()
    db.refresh(order)

    # 10. Construct Dynamic WhatsApp Message & Click-to-chat URL
    raw_whatsapp_num = (settings_db.whatsapp_number if settings_db and settings_db.whatsapp_number else settings.WHATSAPP_NUMBER).strip()
    whatsapp_num = re.sub(r"\D", "", raw_whatsapp_num) or "919515159006"
    if len(whatsapp_num) == 10:
        whatsapp_num = f"91{whatsapp_num}"

    msg = format_whatsapp_order_message(
        order=order,
        customer_name=customer_name,
        customer_phone=customer_phone,
        items=created_items,
        address_snapshot=address_snapshot,
        delivery_fee=delivery_fee,
        subtotal=subtotal,
        final_amount=final_amount,
        payment_pref="Cash on Delivery (COD)" if order_in.payment_method == "cod" else "Online Payment / UPI"
    )
    encoded_msg = urllib.parse.quote(msg)
    whatsapp_url = f"https://wa.me/{whatsapp_num}?text={encoded_msg}"

    return WhatsAppOrderResponse(
        order=order,
        whatsapp_url=whatsapp_url,
        whatsapp_message=msg,
        whatsapp_number=whatsapp_num
    )


@router.get("", response_model=List[OrderOut])
def get_user_orders(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    if is_sheets_storage():
        ords = sheets_service.get_all_orders(search=str(current_user.id))
        return [OrderOut.model_validate(o) for o in ords]

    orders = db.query(Order).options(
        joinedload(Order.items)
    ).filter(
        Order.user_id == current_user.id
    ).order_by(Order.created_at.desc()).all()

    return orders


@router.get("/admin/all", response_model=List[OrderOut])
def get_all_orders_admin(
    status_filter: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    if is_sheets_storage():
        ords = sheets_service.get_all_orders(status_filter=status_filter)
        return [OrderOut.model_validate(o) for o in ords]

    query = db.query(Order).options(joinedload(Order.items))
    if status_filter and status_filter.strip():
        query = query.filter(Order.status == status_filter.strip())
    if date_from and date_from.strip():
        try:
            df = datetime.datetime.strptime(date_from.strip(), "%Y-%m-%d")
            query = query.filter(Order.created_at >= df)
        except ValueError:
            pass
    if date_to and date_to.strip():
        try:
            dt = datetime.datetime.strptime(date_to.strip(), "%Y-%m-%d") + datetime.timedelta(days=1)
            query = query.filter(Order.created_at < dt)
        except ValueError:
            pass
    return query.order_by(Order.created_at.desc()).all()


@router.get("/{order_id}", response_model=OrderOut)
def get_order_details(
    order_id: Any,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    if is_sheets_storage():
        order = sheets_service.get_order_by_id(str(order_id))
        if not order:
            raise HTTPException(status_code=404, detail="Order not found.")
        return OrderOut.model_validate(order)

    order = db.query(Order).options(
        joinedload(Order.items)
    ).filter((Order.id == int(order_id)) if str(order_id).isdigit() else (Order.order_number == str(order_id))).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    # Authorization: only order owner or admin can view
    if order.user_id != current_user.id and getattr(current_user, "role", "") != "admin":
        raise HTTPException(status_code=403, detail="Access denied.")

    return order


@router.put("/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: Any,
    status_in: OrderStatusUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    if is_sheets_storage():
        sheets_service.update_order_status(str(order_id), status_in.status or "confirmed", status_in.admin_notes)
        order = sheets_service.get_order_by_id(str(order_id))
        if not order:
            raise HTTPException(status_code=404, detail="Order not found.")
        return OrderOut.model_validate(order)

    order = db.query(Order).options(joinedload(Order.items)).filter(
        (Order.id == int(order_id)) if str(order_id).isdigit() else (Order.order_number == str(order_id))
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    valid_statuses = [
        "pending_whatsapp", "pending", "confirmed", "processing",
        "packed", "out_for_delivery", "delivered", "cancelled"
    ]
    if status_in.status:
        if status_in.status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        order.status = status_in.status
        if status_in.status == "delivered":
            order.payment_status = "paid"

    if status_in.payment_status:
        order.payment_status = status_in.payment_status

    if status_in.admin_notes is not None:
        order.admin_notes = status_in.admin_notes

    db.commit()
    db.refresh(order)
    return order

