import re
import json
import urllib.parse
import datetime
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import or_, desc, asc
from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models import Order, OrderItem, Cart, CartItem, Product, ProductVariant, Address, User, DeliverySetting, InventoryLog
from backend.app.schemas import (
    OrderCreate, OrderOut, OrderStatusUpdate,
    WhatsAppOrderCreate, WhatsAppOrderResponse, WhatsAppOrderItemInput
)
from backend.app.deps import get_current_user, get_optional_user, get_current_admin
from backend.app.pricing import compute_financials, to_decimal
from backend.app.events import broadcaster

router = APIRouter(prefix="/orders", tags=["Orders & Checkout"])

def generate_order_number() -> str:
    """Generate professional Sri Adithya Organics order number, e.g., SA-20261105-XXXX"""
    now = datetime.datetime.utcnow()
    rand_suffix = f"{int(now.timestamp() * 1000) % 10000:04d}"
    return f"SA-{now.strftime('%Y%m%d')}-{rand_suffix}"


def format_whatsapp_order_message(
    order: Order,
    customer_name: str,
    customer_phone: str,
    address_dict: Optional[dict] = None
) -> str:
    """Format rich, professional WhatsApp checkout confirmation message."""
    addr_line = "Delivery Address Provided"
    if address_dict:
        parts = [
            address_dict.get("house_number"),
            address_dict.get("apartment"),
            address_dict.get("street"),
            address_dict.get("locality"),
            address_dict.get("landmark"),
            address_dict.get("city"),
            address_dict.get("state"),
            f"PIN: {address_dict.get('postal_code')}" if address_dict.get('postal_code') else None
        ]
        addr_line = ", ".join([str(p).strip() for p in parts if p and str(p).strip()])
    elif order.delivery_address_json:
        try:
            parsed = json.loads(order.delivery_address_json)
            parts = [
                parsed.get("house_number"),
                parsed.get("apartment"),
                parsed.get("street"),
                parsed.get("locality"),
                parsed.get("landmark"),
                parsed.get("city"),
                parsed.get("state"),
                f"PIN: {parsed.get('postal_code')}" if parsed.get('postal_code') else None
            ]
            addr_line = ", ".join([str(p).strip() for p in parts if p and str(p).strip()])
        except Exception:
            addr_line = str(order.delivery_address_json)

    item_lines = []
    if hasattr(order, "items") and order.items:
        for it in order.items:
            item_lines.append(f"• {it.product_name} ({it.variant_name or 'Standard Pack'}) x {it.quantity} = ₹{it.total_price:.2f}")

    items_block = "\n".join(item_lines) if item_lines else "• Fresh Wood-Pressed Produce / Certified Organics"

    msg = (
        f"🌿 *SRI ADITHYA ORGANICS — ORDER CONFIRMATION* 🌿\n\n"
        f"Namaste! Thank you for choosing pure, chemical-free cold-pressed produce.\n\n"
        f"*Order Number:* #{order.order_number}\n"
        f"*Customer Name:* {customer_name}\n"
        f"*Phone:* {customer_phone}\n\n"
        f"*Items Ordered:*\n{items_block}\n\n"
        f"*Subtotal:* ₹{order.subtotal:.2f}\n"
        f"*Delivery Fee:* ₹{order.delivery_fee:.2f}\n"
        f"*Total Payable:* ₹{order.total_amount:.2f}\n"
        f"*Delivery Slot:* {order.delivery_slot or 'Standard Express Delivery'}\n"
        f"*Payment Method:* Cash on Delivery / UPI upon arrival\n\n"
        f"*Delivery Destination:*\n{addr_line}\n\n"
        f"Please reply to this message to confirm dispatch. Our fulfillment team is preparing your fresh order!"
    )
    return msg


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def checkout(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Idempotency Protection: If order was already submitted with this idempotency key, return it immediately
    if order_in.idempotency_key:
        existing_order = db.query(Order).options(selectinload(Order.items)).filter(
            Order.payment_id == f"IDEM-{order_in.idempotency_key}"
        ).first()
        if existing_order:
            return existing_order

    # 1. Validate Address with strict ownership check
    address = db.query(Address).filter(
        Address.id == order_in.address_id,
        Address.user_id == current_user.id
    ).first()
    if not address:
        raise HTTPException(status_code=400, detail="Please select a valid delivery address belonging to your account.")

    address_snapshot = {
        "label": address.label,
        "recipient_name": address.recipient_name,
        "phone": address.phone,
        "house_number": address.house_number,
        "street": address.street,
        "apartment": address.apartment,
        "locality": address.locality,
        "landmark": address.landmark,
        "city": address.city,
        "state": address.state,
        "postal_code": address.postal_code,
        "latitude": address.latitude,
        "longitude": address.longitude,
        "accuracy_meters": address.accuracy_meters,
        "formatted_address": address.formatted_address,
    }

    # 2. Get User Cart with items and products in single query
    cart = db.query(Cart).options(
        joinedload(Cart.items).joinedload(CartItem.variant).joinedload(ProductVariant.product)
    ).filter(Cart.user_id == current_user.id).first()

    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Your cart is empty. Add items before checking out.")

    # 3. Check delivery settings
    from backend.app.routers.cart import get_cached_delivery_settings
    free_threshold, standard_delivery = get_cached_delivery_settings(db)

    # 4. Atomic Row Lock & Stock validation in a single batch
    variant_ids = [item.variant_id for item in cart.items]
    locked_variants = db.query(ProductVariant).options(
        joinedload(ProductVariant.product)
    ).filter(
        ProductVariant.id.in_(variant_ids)
    ).with_for_update().all()
    locked_variant_map = {v.id: v for v in locked_variants}

    raw_fin_items = []
    for item in cart.items:
        variant = locked_variant_map.get(item.variant_id)
        if not variant or not variant.product or not variant.product.is_active:
            raise HTTPException(
                status_code=400,
                detail="An item in your cart is no longer available."
            )

        if variant.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {variant.product.name}. Only {variant.stock} available."
            )

        raw_fin_items.append({
            "product_id": variant.product.id,
            "variant_id": variant.id,
            "product_name": variant.product.name,
            "variant_name": variant.pack_size or variant.unit or "Standard Pack",
            "unit_price": variant.price,
            "mrp": variant.mrp,
            "quantity": item.quantity
        })

    fin = compute_financials(
        raw_fin_items,
        free_delivery_threshold=free_threshold,
        standard_delivery_fee=standard_delivery
    )

    # 5. Create Order
    payment_token = f"IDEM-{order_in.idempotency_key}" if order_in.idempotency_key else order_in.payment_id
    new_order = Order(
        order_number=generate_order_number(),
        user_id=current_user.id,
        status="pending",
        subtotal=fin.subtotal,
        discount=fin.discount,
        delivery_fee=fin.delivery_fee,
        tax=fin.tax,
        total_amount=fin.total_amount,
        delivery_slot=order_in.delivery_slot or "Standard Delivery",
        delivery_address_json=json.dumps(address_snapshot),
        notes=order_in.notes,
        payment_method=order_in.payment_method or "cod",
        payment_status="pending",
        payment_id=payment_token
    )
    db.add(new_order)
    db.flush()

    # 6. Create Order Items & Decrement Stock atomically without secondary re-queries
    for calc_item in fin.items:
        order_item = OrderItem(
            order_id=new_order.id,
            product_id=calc_item.product_id,
            variant_id=calc_item.variant_id,
            product_name=calc_item.product_name,
            variant_name=calc_item.variant_name,
            unit_price=calc_item.unit_price,
            mrp=calc_item.mrp,
            quantity=calc_item.quantity,
            total_price=calc_item.total_price
        )
        db.add(order_item)

        variant = locked_variant_map.get(calc_item.variant_id)
        if variant:
            prev_stock = variant.stock
            variant.stock = max(0, variant.stock - calc_item.quantity)
            log_entry = InventoryLog(
                product_id=calc_item.product_id,
                previous_stock=prev_stock,
                changed_stock=-calc_item.quantity,
                new_stock=variant.stock,
                reason=f"Order #{new_order.order_number}"
            )
            db.add(log_entry)

    # 7. Clear User Cart & Commit
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
    db.commit()
    db.refresh(new_order)

    # Real-Time Event Broadcast
    broadcaster.publish("ORDER_CREATED", {"order_id": new_order.id, "order_number": new_order.order_number})
    broadcaster.publish("INVENTORY_UPDATED")

    return new_order


@router.post("/whatsapp", response_model=WhatsAppOrderResponse)
def create_whatsapp_order(
    order_in: WhatsAppOrderCreate,
    db: Session = Depends(get_db),
    optional_user: Optional[User] = Depends(get_optional_user)
):
    # 1. Validate Customer Details
    customer_name = order_in.customer_name.strip()
    customer_phone = order_in.customer_phone.strip()
    if not customer_name:
        raise HTTPException(status_code=400, detail="Customer name is required.")

    clean_digits = re.sub(r"\D", "", customer_phone)
    if len(clean_digits) < 10:
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit mobile number.")

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

    # 3. Resolve & Validate Delivery Address with strict IDOR prevention
    address_snapshot = {}
    if order_in.address_id:
        if not optional_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to use a saved account address. Or provide delivery address inline."
            )
        addr = db.query(Address).filter(
            Address.id == order_in.address_id,
            Address.user_id == optional_user.id
        ).first()
        if not addr:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected saved address not found in your account."
            )
        address_snapshot = {
            "label": addr.label,
            "recipient_name": addr.recipient_name,
            "phone": addr.phone,
            "house_number": addr.house_number,
            "street": addr.street,
            "apartment": addr.apartment,
            "locality": addr.locality,
            "landmark": addr.landmark,
            "city": addr.city,
            "state": addr.state,
            "postal_code": addr.postal_code,
            "latitude": addr.latitude,
            "longitude": addr.longitude,
            "accuracy_meters": addr.accuracy_meters,
            "formatted_address": addr.formatted_address,
        }

    if not address_snapshot and order_in.delivery_address:
        da = order_in.delivery_address
        pin = str(da.get("postal_code", "")).strip()
        street = str(da.get("street", "")).strip()
        city = str(da.get("city", "Bengaluru")).strip()
        state = str(da.get("state", "Karnataka")).strip()

        if not street:
            raise HTTPException(status_code=400, detail="Delivery street or locality is required.")
        if len(pin) != 6 or not pin.isdigit():
            raise HTTPException(status_code=400, detail="A valid 6-digit postal PIN code is required.")

        address_snapshot = {
            "label": da.get("label", "Home"),
            "recipient_name": customer_name,
            "phone": customer_phone,
            "house_number": da.get("house_number"),
            "street": street,
            "apartment": da.get("apartment"),
            "locality": da.get("locality"),
            "landmark": da.get("landmark"),
            "city": city,
            "state": state,
            "postal_code": pin,
            "latitude": da.get("latitude"),
            "longitude": da.get("longitude"),
            "accuracy_meters": da.get("accuracy_meters"),
            "formatted_address": da.get("formatted_address"),
        }

    if not address_snapshot:
        raise HTTPException(status_code=400, detail="Delivery address is required to proceed with order.")

    # 4. Resolve Items & Validate Stock
    items_to_process = list(order_in.items) if order_in.items else []
    if not items_to_process and optional_user:
        user_cart = db.query(Cart).filter(Cart.user_id == optional_user.id).first()
        if user_cart and user_cart.items:
            items_to_process = [
                WhatsAppOrderItemInput(
                    product_id=ci.product_id,
                    variant_id=ci.variant_id,
                    quantity=ci.quantity
                ) for ci in user_cart.items
            ]

    if not items_to_process:
        raise HTTPException(status_code=400, detail="Please select at least one organic product.")

    # 4. Atomic Row Lock & Stock validation in a single batch
    variant_ids = [it.variant_id for it in items_to_process if it.variant_id]
    product_ids_no_var = [it.product_id for it in items_to_process if not it.variant_id]

    if product_ids_no_var:
        def_vars = db.query(ProductVariant).filter(
            ProductVariant.product_id.in_(product_ids_no_var),
            ProductVariant.is_default == True
        ).all()
        for dv in def_vars:
            variant_ids.append(dv.id)

    locked_variants = db.query(ProductVariant).options(
        joinedload(ProductVariant.product)
    ).filter(
        ProductVariant.id.in_(variant_ids)
    ).with_for_update().all()
    locked_variant_map = {v.id: v for v in locked_variants}

    raw_fin_items = []
    for item_req in items_to_process:
        vid = item_req.variant_id
        if not vid:
            for v in locked_variants:
                if v.product_id == item_req.product_id:
                    vid = v.id
                    break
        if not vid or vid not in locked_variant_map:
            continue

        variant = locked_variant_map[vid]
        product = variant.product
        if not product or not product.is_active:
            continue

        qty = max(1, item_req.quantity)
        if variant.stock < qty:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.name}. Only {variant.stock} available."
            )

        raw_fin_items.append({
            "product_id": product.id,
            "variant_id": variant.id,
            "product_name": product.name,
            "variant_name": variant.pack_size or variant.unit or "Standard Pack",
            "unit_price": variant.price,
            "mrp": variant.mrp,
            "quantity": qty
        })

    if not raw_fin_items:
        raise HTTPException(status_code=400, detail="Could not resolve any valid items for this order.")

    # 5. Pricing & Delivery Fee (via central Decimal arithmetic & cached settings)
    from backend.app.routers.cart import get_cached_delivery_settings
    free_threshold, standard_delivery = get_cached_delivery_settings(db)

    fin = compute_financials(
        raw_fin_items,
        free_delivery_threshold=free_threshold,
        standard_delivery_fee=standard_delivery
    )

    # 6. Create WhatsApp Order
    user_id = optional_user.id if optional_user else None
    new_order = Order(
        order_number=generate_order_number(),
        user_id=user_id,
        status="pending_whatsapp",
        subtotal=fin.subtotal,
        discount=fin.discount,
        delivery_fee=fin.delivery_fee,
        tax=fin.tax,
        total_amount=fin.total_amount,
        delivery_slot=order_in.delivery_slot or "Standard Express Delivery",
        delivery_address_json=json.dumps(address_snapshot),
        notes=f"Customer: {customer_name} ({customer_phone})" + (f" | {order_in.notes}" if order_in.notes else ""),
        payment_method="whatsapp_cod",
        payment_status="pending",
        payment_id=f"WA-{order_in.idempotency_key}" if order_in.idempotency_key else None
    )
    db.add(new_order)
    db.flush()

    for calc_it in fin.items:
        oi = OrderItem(
            order_id=new_order.id,
            product_id=calc_it.product_id,
            variant_id=calc_it.variant_id,
            product_name=calc_it.product_name,
            variant_name=calc_it.variant_name,
            unit_price=calc_it.unit_price,
            mrp=calc_it.mrp,
            quantity=calc_it.quantity,
            total_price=calc_it.total_price
        )
        db.add(oi)

        # Atomic inventory deduction on already locked variant object
        variant = locked_variant_map.get(calc_it.variant_id)
        if variant:
            prev = variant.stock
            variant.stock = max(0, variant.stock - calc_it.quantity)
            log_entry = InventoryLog(
                product_id=calc_it.product_id,
                previous_stock=prev,
                changed_stock=-calc_it.quantity,
                new_stock=variant.stock,
                reason=f"WhatsApp Order #{new_order.order_number}"
            )
            db.add(log_entry)

    db.commit()
    db.refresh(new_order)

    # Real-Time Event Broadcast
    broadcaster.publish("ORDER_CREATED", {"order_id": new_order.id, "order_number": new_order.order_number})
    broadcaster.publish("INVENTORY_UPDATED")

    # WhatsApp Redirection
    settings_rec = db.query(DeliverySetting).first()
    raw_whatsapp_num = (settings_rec.whatsapp_number if settings_rec and settings_rec.whatsapp_number else settings.WHATSAPP_NUMBER).strip()
    whatsapp_num = re.sub(r"\D", "", raw_whatsapp_num) or "919515159006"
    if len(whatsapp_num) == 10:
        whatsapp_num = f"91{whatsapp_num}"

    msg = format_whatsapp_order_message(new_order, customer_name, customer_phone, address_snapshot)
    encoded_msg = urllib.parse.quote(msg)
    wa_url = f"https://wa.me/{whatsapp_num}?text={encoded_msg}"

    return WhatsAppOrderResponse(
        order=new_order,
        whatsapp_url=wa_url,
        whatsapp_message=msg,
        whatsapp_number=whatsapp_num
    )


@router.get("", response_model=List[OrderOut])
def get_user_orders(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Order).options(
        selectinload(Order.items)
    ).filter(
        Order.user_id == current_user.id
    )

    if status_filter and status_filter.strip() and status_filter != "all":
        query = query.filter(Order.status == status_filter.strip())

    orders = query.order_by(Order.created_at.desc()).offset(offset).limit(limit).all()
    return orders


@router.get("/admin/all", response_model=List[OrderOut])
def get_all_orders_admin(
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    query = db.query(Order).options(selectinload(Order.items))
    
    if status_filter and status_filter.strip() and status_filter != "all":
        query = query.filter(Order.status == status_filter.strip())
        
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                Order.order_number.ilike(term),
                Order.delivery_address_json.ilike(term),
                Order.notes.ilike(term),
                Order.payment_id.ilike(term)
            )
        )
        
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
            
    query = query.order_by(Order.created_at.desc()).offset(offset).limit(limit)
    return query.all()


@router.get("/{order_id}", response_model=OrderOut)
def get_order_details(
    order_id: Any,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).options(
        selectinload(Order.items)
    ).filter(
        (Order.id == int(order_id)) if str(order_id).isdigit() else (Order.order_number == str(order_id))
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    # Authorization: only order owner or admin can view
    if order.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied.")

    return order


@router.put("/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: Any,
    status_in: OrderStatusUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    order = db.query(Order).options(
        joinedload(Order.items)
    ).filter(
        (Order.id == int(order_id)) if str(order_id).isdigit() else (Order.order_number == str(order_id))
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    old_status = order.status
    if status_in.status:
        order.status = status_in.status
    if status_in.admin_notes:
        order.admin_notes = status_in.admin_notes

    # If cancelling, restock inventory and log audit
    if status_in.status == "cancelled" and old_status != "cancelled":
        for it in order.items:
            variant = db.query(ProductVariant).filter(ProductVariant.id == it.variant_id).first()
            if variant:
                prev_stk = variant.stock
                variant.stock += it.quantity
                log_entry = InventoryLog(
                    product_id=it.product_id,
                    previous_stock=prev_stk,
                    changed_stock=it.quantity,
                    new_stock=variant.stock,
                    reason=f"Status Cancelled #{order.order_number}"
                )
                db.add(log_entry)

    db.commit()
    db.refresh(order)

    # Real-time event broadcasting
    broadcaster.publish("ORDER_UPDATED", {
        "order_id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "payment_status": order.payment_status
    })
    if status_in.status == "cancelled" and old_status != "cancelled":
        broadcaster.publish("INVENTORY_UPDATED")

    return order
