import re
import json
import urllib.parse
import datetime
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query
from backend.app.config import settings
from backend.app.d1 import D1Database, get_d1
from backend.app.schemas import (
    OrderCreate, OrderOut, OrderItemOut, OrderStatusUpdate,
    WhatsAppOrderCreate, WhatsAppOrderResponse, WhatsAppOrderItemInput
)
from backend.app.deps import get_current_user, get_optional_user, get_current_admin
from backend.app.pricing import compute_financials
from backend.app.events import broadcaster
from backend.app.phone_utils import (
    validate_and_normalize_indian_phone,
    format_display_indian_phone,
    get_whatsapp_number_digits
)

router = APIRouter(prefix="/orders", tags=["Orders & Checkout"])

def generate_order_number() -> str:
    """Generate professional Sri Adithya Organics order number, e.g., SA-20261105-XXXX"""
    now = datetime.datetime.utcnow()
    rand_suffix = f"{int(now.timestamp() * 1000) % 10000:04d}"
    return f"SA-{now.strftime('%Y%m%d')}-{rand_suffix}"


def format_whatsapp_order_message(
    order_dict: Dict[str, Any],
    items: List[Dict[str, Any]],
    customer_name: str,
    customer_phone: str,
    address_dict: Optional[dict] = None
) -> str:
    """
    Format WhatsApp checkout confirmation message strictly in the customer's own voice.
    This message is sent by the customer from their personal WhatsApp to Sri Adithya Organics.
    """
    addr_line = "Delivery address provided"
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
    elif order_dict.get("delivery_address_json"):
        try:
            parsed = json.loads(order_dict["delivery_address_json"])
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
            addr_line = str(order_dict.get("delivery_address_json"))

    item_lines = []
    for it in items:
        p_name = it.get("product_name") or "Organic Item"
        v_name = it.get("variant_name") or "Standard Pack"
        qty = it.get("quantity") or 1
        tot = float(it.get("total_price") or 0.0)
        item_lines.append(f"- Product: {p_name} ({v_name})\n  Quantity: {qty}\n  Price: ₹{tot:.2f}")

    items_block = "\n".join(item_lines) if item_lines else "- Sri Adithya Organic Products"

    subtotal = float(order_dict.get("subtotal") or 0.0)
    del_fee = float(order_dict.get("delivery_fee") or 0.0)
    tot_amt = float(order_dict.get("total_amount") or 0.0)
    slot = order_dict.get("delivery_slot") or "Standard Express Delivery"
    payment_pref = "Cash on Delivery / UPI upon arrival"
    order_num = order_dict.get("order_number")
    order_ref = f" (Order #{order_num})" if order_num else ""
    formatted_phone = format_display_indian_phone(customer_phone)

    msg = (
        f"Hello Sri Adithya Organics,\n\n"
        f"I would like to place an order{order_ref}.\n\n"
        f"Order Details:\n{items_block}\n\n"
        f"Delivery Address:\n{addr_line}\n\n"
        f"Customer Name: {customer_name}\n"
        f"Phone Number: {formatted_phone}\n\n"
        f"Delivery Slot: {slot}\n"
        f"Payment Preference: {payment_pref}\n"
        f"Total Amount: ₹{tot_amt:.2f}\n\n"
        f"Please confirm my order and delivery availability.\n\n"
        f"Thank you!"
    )
    return msg


async def load_order_with_items(d1: D1Database, order_id_or_number: Any) -> Optional[OrderOut]:
    if str(order_id_or_number).isdigit():
        order = await d1.fetch_one("SELECT * FROM orders WHERE id = ?", int(order_id_or_number))
    else:
        order = await d1.fetch_one("SELECT * FROM orders WHERE order_number = ?", str(order_id_or_number))
    
    if not order:
        return None
        
    items = await d1.fetch_all("SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC", order["id"])
    return OrderOut(
        id=order["id"],
        order_number=order["order_number"],
        user_id=order.get("user_id"),
        status=order["status"],
        subtotal=float(order["subtotal"]),
        discount=float(order.get("discount") or 0.0),
        delivery_fee=float(order.get("delivery_fee") or 0.0),
        tax=float(order.get("tax") or 0.0),
        total_amount=float(order["total_amount"]),
        delivery_slot=order.get("delivery_slot") or "Standard Delivery",
        delivery_address_json=order.get("delivery_address_json") or "{}",
        notes=order.get("notes"),
        admin_notes=order.get("admin_notes"),
        payment_method=order.get("payment_method") or "cod",
        payment_status=order.get("payment_status") or "pending",
        payment_id=order.get("payment_id"),
        created_at=order["created_at"],
        updated_at=order["updated_at"],
        items=[
            OrderItemOut(
                id=it["id"],
                product_id=it["product_id"],
                variant_id=it["variant_id"],
                product_name=it["product_name"],
                variant_name=it.get("variant_name") or "Standard Pack",
                unit_price=float(it["unit_price"]),
                mrp=float(it.get("mrp") or it["unit_price"]),
                quantity=it["quantity"],
                total_price=float(it["total_price"]),
                image_url=None
            ) for it in items
        ]
    )


async def load_orders_with_items(d1: D1Database, orders: List[Dict[str, Any]]) -> List[OrderOut]:
    if not orders:
        return []
    order_ids = [o["id"] for o in orders]
    placeholders = ",".join("?" * len(order_ids))
    items = await d1.fetch_all(f"SELECT * FROM order_items WHERE order_id IN ({placeholders}) ORDER BY id ASC", *order_ids)
    items_by_order: Dict[int, List[Dict[str, Any]]] = {}
    for it in items:
        items_by_order.setdefault(it["order_id"], []).append(it)
    
    res = []
    for order in orders:
        order_items = items_by_order.get(order["id"], [])
        res.append(OrderOut(
            id=order["id"],
            order_number=order["order_number"],
            user_id=order.get("user_id"),
            status=order["status"],
            subtotal=float(order["subtotal"]),
            discount=float(order.get("discount") or 0.0),
            delivery_fee=float(order.get("delivery_fee") or 0.0),
            tax=float(order.get("tax") or 0.0),
            total_amount=float(order["total_amount"]),
            delivery_slot=order.get("delivery_slot") or "Standard Delivery",
            delivery_address_json=order.get("delivery_address_json") or "{}",
            notes=order.get("notes"),
            admin_notes=order.get("admin_notes"),
            payment_method=order.get("payment_method") or "cod",
            payment_status=order.get("payment_status") or "pending",
            payment_id=order.get("payment_id"),
            created_at=order["created_at"],
            updated_at=order["updated_at"],
            items=[
                OrderItemOut(
                    id=it["id"],
                    product_id=it["product_id"],
                    variant_id=it["variant_id"],
                    product_name=it["product_name"],
                    variant_name=it.get("variant_name") or "Standard Pack",
                    unit_price=float(it["unit_price"]),
                    mrp=float(it.get("mrp") or it["unit_price"]),
                    quantity=it["quantity"],
                    total_price=float(it["total_price"]),
                    image_url=None
                ) for it in order_items
            ]
        ))
    return res


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def checkout(
    order_in: OrderCreate,
    d1: D1Database = Depends(get_d1),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = current_user["id"]
    # Idempotency Protection
    if order_in.idempotency_key:
        idem_token = f"IDEM-{order_in.idempotency_key}"
        existing = await d1.fetch_one("SELECT id FROM orders WHERE payment_id = ?", idem_token)
        if existing:
            return await load_order_with_items(d1, existing["id"])

    # 1. Validate Address
    address = await d1.fetch_one(
        "SELECT * FROM addresses WHERE id = ? AND user_id = ?",
        order_in.address_id, user_id
    )
    if not address:
        raise HTTPException(status_code=400, detail="Please select a valid delivery address belonging to your account.")

    address_snapshot = {
        "label": address.get("label"),
        "recipient_name": address.get("recipient_name"),
        "phone": address.get("phone"),
        "house_number": address.get("house_number"),
        "street": address.get("street"),
        "apartment": address.get("apartment"),
        "locality": address.get("locality"),
        "landmark": address.get("landmark"),
        "city": address.get("city"),
        "state": address.get("state"),
        "postal_code": address.get("postal_code"),
        "latitude": address.get("latitude"),
        "longitude": address.get("longitude"),
        "accuracy_meters": address.get("accuracy_meters"),
        "formatted_address": address.get("formatted_address"),
    }

    # 2. Get User Cart & Items
    cart = await d1.fetch_one("SELECT id FROM carts WHERE user_id = ?", user_id)
    if not cart:
        raise HTTPException(status_code=400, detail="Your cart is empty. Add items before checking out.")

    cart_items = await d1.fetch_all("SELECT * FROM cart_items WHERE cart_id = ?", cart["id"])
    if not cart_items:
        raise HTTPException(status_code=400, detail="Your cart is empty. Add items before checking out.")

    # 3. Delivery Settings
    from backend.app.routers.cart import get_cached_delivery_settings
    free_threshold, standard_delivery = await get_cached_delivery_settings(d1)

    # 4. Validate Variants & Stock
    variant_ids = [it["variant_id"] for it in cart_items]
    v_ph = ",".join("?" * len(variant_ids))
    variants = await d1.fetch_all(f"SELECT * FROM product_variants WHERE id IN ({v_ph})", *variant_ids)
    var_map = {v["id"]: v for v in variants}

    product_ids = [it["product_id"] for it in cart_items]
    p_ph = ",".join("?" * len(product_ids))
    products = await d1.fetch_all(f"SELECT * FROM products WHERE id IN ({p_ph})", *product_ids)
    prod_map = {p["id"]: p for p in products}

    raw_fin_items = []
    for it in cart_items:
        v = var_map.get(it["variant_id"])
        p = prod_map.get(it["product_id"])
        if not v or not p or not p.get("is_active"):
            raise HTTPException(status_code=400, detail="An item in your cart is no longer available.")

        if v["stock"] < it["quantity"]:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {p['name']}. Only {v['stock']} available."
            )

        raw_fin_items.append({
            "product_id": p["id"],
            "variant_id": v["id"],
            "product_name": p["name"],
            "variant_name": v.get("pack_size") or v.get("unit") or "Standard Pack",
            "unit_price": v["price"],
            "mrp": v.get("mrp"),
            "quantity": it["quantity"]
        })

    fin = compute_financials(
        raw_fin_items,
        free_delivery_threshold=free_threshold,
        standard_delivery_fee=standard_delivery
    )

    # 5. Create Order
    now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    payment_token = f"IDEM-{order_in.idempotency_key}" if order_in.idempotency_key else order_in.payment_id
    order_num = generate_order_number()

    sql_order = """
        INSERT INTO orders (
            order_number, user_id, status, subtotal, discount, delivery_fee,
            tax, total_amount, delivery_slot, delivery_address_json, notes,
            payment_method, payment_status, payment_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    new_order_id = await d1.execute_insert(
        sql_order,
        order_num,
        user_id,
        "pending",
        fin.subtotal,
        fin.discount,
        fin.delivery_fee,
        fin.tax,
        fin.total_amount,
        order_in.delivery_slot or "Standard Delivery",
        json.dumps(address_snapshot),
        order_in.notes,
        order_in.payment_method or "cod",
        "pending",
        payment_token,
        now,
        now
    )

    # 6. Insert Order Items & Decrement Stock
    for item in fin.items:
        await d1.execute_insert(
            """
            INSERT INTO order_items (
                order_id, product_id, variant_id, product_name, variant_name,
                unit_price, mrp, quantity, total_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            new_order_id, item.product_id, item.variant_id, item.product_name, item.variant_name,
            item.unit_price, item.mrp, item.quantity, item.total_price
        )

        v = var_map.get(item.variant_id)
        if v:
            prev_stock = v["stock"]
            new_stock = max(0, prev_stock - item.quantity)
            await d1.execute("UPDATE product_variants SET stock = ? WHERE id = ?", new_stock, v["id"])
            await d1.execute_insert(
                """
                INSERT INTO inventory_logs (product_id, previous_stock, changed_stock, new_stock, reason, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                item.product_id, prev_stock, -item.quantity, new_stock, f"Order #{order_num}", now
            )

    # 7. Clear User Cart
    await d1.execute("DELETE FROM cart_items WHERE cart_id = ?", cart["id"])

    # Real-Time Event Broadcast
    broadcaster.publish("ORDER_CREATED", {"order_id": new_order_id, "order_number": order_num})
    broadcaster.publish("INVENTORY_UPDATED")

    return await load_order_with_items(d1, new_order_id)


@router.post("/whatsapp", response_model=WhatsAppOrderResponse)
async def create_whatsapp_order(
    order_in: WhatsAppOrderCreate,
    d1: D1Database = Depends(get_d1),
    optional_user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    customer_name = order_in.customer_name.strip()
    customer_phone_raw = order_in.customer_phone.strip()
    if not customer_name:
        raise HTTPException(status_code=400, detail="Customer name is required.")

    is_phone_valid, normalized_phone, phone_err = validate_and_normalize_indian_phone(customer_phone_raw)
    if not is_phone_valid or not normalized_phone:
        raise HTTPException(status_code=400, detail=phone_err or "Please enter a valid 10-digit Indian mobile number.")

    customer_phone = normalized_phone

    # Idempotency Token
    if order_in.idempotency_key:
        idem_key = f"WA-{order_in.idempotency_key}"
        recent = await d1.fetch_one("SELECT * FROM orders WHERE payment_id = ?", idem_key)
        if recent:
            items = await d1.fetch_all("SELECT * FROM order_items WHERE order_id = ?", recent["id"])
            settings_db = await d1.fetch_one("SELECT whatsapp_number FROM delivery_settings LIMIT 1")
            raw_whatsapp_num = (settings_db.get("whatsapp_number") if settings_db and settings_db.get("whatsapp_number") else settings.WHATSAPP_NUMBER)
            store_wa = get_whatsapp_number_digits(raw_whatsapp_num) or "919515159006"
            msg = format_whatsapp_order_message(recent, items, customer_name, customer_phone)
            encoded_msg = urllib.parse.quote(msg)
            order_out = await load_order_with_items(d1, recent["id"])
            return WhatsAppOrderResponse(
                order=order_out,
                whatsapp_url=f"https://wa.me/{store_wa}?text={encoded_msg}",
                whatsapp_message=msg,
                whatsapp_number=store_wa
            )

    # Address snapshot
    address_snapshot = {}
    if order_in.address_id:
        if not optional_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to use a saved account address. Or provide delivery address inline."
            )
        addr = await d1.fetch_one("SELECT * FROM addresses WHERE id = ? AND user_id = ?", order_in.address_id, optional_user["id"])
        if not addr:
            raise HTTPException(status_code=404, detail="Selected saved address not found in your account.")
        address_snapshot = {
            "label": addr.get("label"),
            "recipient_name": addr.get("recipient_name"),
            "phone": addr.get("phone"),
            "house_number": addr.get("house_number"),
            "street": addr.get("street"),
            "apartment": addr.get("apartment"),
            "locality": addr.get("locality"),
            "landmark": addr.get("landmark"),
            "city": addr.get("city"),
            "state": addr.get("state"),
            "postal_code": addr.get("postal_code"),
            "latitude": addr.get("latitude"),
            "longitude": addr.get("longitude"),
            "accuracy_meters": addr.get("accuracy_meters"),
            "formatted_address": addr.get("formatted_address"),
        }

    if not address_snapshot and order_in.delivery_address:
        da = order_in.delivery_address
        pin = str(da.get("postal_code", "")).strip()
        street = str(da.get("street", "")).strip()
        city = str(da.get("city", "Hyderabad")).strip()
        state = str(da.get("state", "Telangana")).strip()

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

    items_to_process = list(order_in.items) if order_in.items else []
    if not items_to_process and optional_user:
        cart = await d1.fetch_one("SELECT id FROM carts WHERE user_id = ?", optional_user["id"])
        if cart:
            c_items = await d1.fetch_all("SELECT * FROM cart_items WHERE cart_id = ?", cart["id"])
            items_to_process = [
                WhatsAppOrderItemInput(
                    product_id=ci["product_id"],
                    variant_id=ci["variant_id"],
                    quantity=ci["quantity"]
                ) for ci in c_items
            ]

    if not items_to_process:
        raise HTTPException(status_code=400, detail="Please select at least one organic product.")

    variant_ids = [it.variant_id for it in items_to_process if it.variant_id]
    product_ids_no_var = [it.product_id for it in items_to_process if not it.variant_id]

    if product_ids_no_var:
        p_ph = ",".join("?" * len(product_ids_no_var))
        def_vars = await d1.fetch_all(f"SELECT * FROM product_variants WHERE product_id IN ({p_ph}) AND is_default = 1", *product_ids_no_var)
        for dv in def_vars:
            variant_ids.append(dv["id"])

    v_ph = ",".join("?" * len(variant_ids))
    variants = await d1.fetch_all(f"SELECT * FROM product_variants WHERE id IN ({v_ph})", *variant_ids)
    var_map = {v["id"]: v for v in variants}

    all_prod_ids = list({v["product_id"] for v in variants})
    ap_ph = ",".join("?" * len(all_prod_ids))
    products = await d1.fetch_all(f"SELECT * FROM products WHERE id IN ({ap_ph})", *all_prod_ids)
    prod_map = {p["id"]: p for p in products}

    raw_fin_items = []
    for item_req in items_to_process:
        vid = item_req.variant_id
        if not vid:
            for v in variants:
                if v["product_id"] == item_req.product_id:
                    vid = v["id"]
                    break
        if not vid or vid not in var_map:
            continue

        variant = var_map[vid]
        product = prod_map.get(variant["product_id"])
        if not product or not product.get("is_active"):
            continue

        qty = max(1, item_req.quantity)
        if variant["stock"] < qty:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product['name']}. Only {variant['stock']} available."
            )

        raw_fin_items.append({
            "product_id": product["id"],
            "variant_id": variant["id"],
            "product_name": product["name"],
            "variant_name": variant.get("pack_size") or variant.get("unit") or "Standard Pack",
            "unit_price": variant["price"],
            "mrp": variant.get("mrp"),
            "quantity": qty
        })

    if not raw_fin_items:
        raise HTTPException(status_code=400, detail="Could not resolve any valid items for this order.")

    from backend.app.routers.cart import get_cached_delivery_settings
    free_threshold, standard_delivery = await get_cached_delivery_settings(d1)

    fin = compute_financials(
        raw_fin_items,
        free_delivery_threshold=free_threshold,
        standard_delivery_fee=standard_delivery
    )

    now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    order_num = generate_order_number()
    user_id = optional_user["id"] if optional_user else None

    sql_order = """
        INSERT INTO orders (
            order_number, user_id, status, subtotal, discount, delivery_fee,
            tax, total_amount, delivery_slot, delivery_address_json, notes,
            payment_method, payment_status, payment_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    new_order_id = await d1.execute_insert(
        sql_order,
        order_num,
        user_id,
        "pending_whatsapp",
        fin.subtotal,
        fin.discount,
        fin.delivery_fee,
        fin.tax,
        fin.total_amount,
        order_in.delivery_slot or "Standard Express Delivery",
        json.dumps(address_snapshot),
        f"Customer: {customer_name} ({customer_phone})" + (f" | {order_in.notes}" if order_in.notes else ""),
        "whatsapp_cod",
        "pending",
        f"WA-{order_in.idempotency_key}" if order_in.idempotency_key else None,
        now,
        now
    )

    for calc_it in fin.items:
        await d1.execute_insert(
            """
            INSERT INTO order_items (
                order_id, product_id, variant_id, product_name, variant_name,
                unit_price, mrp, quantity, total_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            new_order_id, calc_it.product_id, calc_it.variant_id, calc_it.product_name, calc_it.variant_name,
            calc_it.unit_price, calc_it.mrp, calc_it.quantity, calc_it.total_price
        )

        v = var_map.get(calc_it.variant_id)
        if v:
            prev = v["stock"]
            new_stock = max(0, prev - calc_it.quantity)
            await d1.execute("UPDATE product_variants SET stock = ? WHERE id = ?", new_stock, v["id"])
            await d1.execute_insert(
                """
                INSERT INTO inventory_logs (product_id, previous_stock, changed_stock, new_stock, reason, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                calc_it.product_id, prev, -calc_it.quantity, new_stock, f"WhatsApp Order #{order_num}", now
            )

    broadcaster.publish("ORDER_CREATED", {"order_id": new_order_id, "order_number": order_num})
    broadcaster.publish("INVENTORY_UPDATED")

    settings_rec = await d1.fetch_one("SELECT whatsapp_number FROM delivery_settings LIMIT 1")
    raw_whatsapp_num = (settings_rec.get("whatsapp_number") if settings_rec and settings_rec.get("whatsapp_number") else settings.WHATSAPP_NUMBER)
    whatsapp_num = get_whatsapp_number_digits(raw_whatsapp_num) or "919515159006"

    created_order = await d1.fetch_one("SELECT * FROM orders WHERE id = ?", new_order_id)
    created_items = await d1.fetch_all("SELECT * FROM order_items WHERE order_id = ?", new_order_id)
    msg = format_whatsapp_order_message(created_order, created_items, customer_name, customer_phone, address_snapshot)
    encoded_msg = urllib.parse.quote(msg)
    wa_url = f"https://wa.me/{whatsapp_num}?text={encoded_msg}"

    order_out = await load_order_with_items(d1, new_order_id)
    return WhatsAppOrderResponse(
        order=order_out,
        whatsapp_url=wa_url,
        whatsapp_message=msg,
        whatsapp_number=whatsapp_num
    )


@router.get("", response_model=List[OrderOut])
async def get_user_orders(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status_filter: Optional[str] = None,
    d1: D1Database = Depends(get_d1),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = current_user["id"]
    if status_filter and status_filter.strip() and status_filter != "all":
        orders = await d1.fetch_all(
            "SELECT * FROM orders WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
            user_id, status_filter.strip(), limit, offset
        )
    else:
        orders = await d1.fetch_all(
            "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
            user_id, limit, offset
        )
    return await load_orders_with_items(d1, orders)


@router.get("/admin/all", response_model=List[OrderOut])
async def get_all_orders_admin(
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    clauses = ["1=1"]
    params = []

    if status_filter and status_filter.strip() and status_filter != "all":
        clauses.append("status = ?")
        params.append(status_filter.strip())

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        clauses.append("(LOWER(order_number) LIKE ? OR LOWER(delivery_address_json) LIKE ? OR LOWER(notes) LIKE ? OR LOWER(payment_id) LIKE ?)")
        params.extend([term, term, term, term])

    if date_from and date_from.strip():
        clauses.append("created_at >= ?")
        params.append(f"{date_from.strip()} 00:00:00")

    if date_to and date_to.strip():
        clauses.append("created_at <= ?")
        params.append(f"{date_to.strip()} 23:59:59")

    sql = f"SELECT * FROM orders WHERE {' AND '.join(clauses)} ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    orders = await d1.fetch_all(sql, *params)
    return await load_orders_with_items(d1, orders)


@router.get("/{order_id}", response_model=OrderOut)
async def get_order_details(
    order_id: Any,
    d1: D1Database = Depends(get_d1),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    order = await load_order_with_items(d1, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if order.user_id != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied.")

    return order


@router.put("/{order_id}/status", response_model=OrderOut)
async def update_order_status(
    order_id: Any,
    status_in: OrderStatusUpdate,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    if str(order_id).isdigit():
        order = await d1.fetch_one("SELECT * FROM orders WHERE id = ?", int(order_id))
    else:
        order = await d1.fetch_one("SELECT * FROM orders WHERE order_number = ?", str(order_id))

    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    old_status = order["status"]
    new_status = status_in.status or old_status
    admin_notes = status_in.admin_notes if status_in.admin_notes is not None else order.get("admin_notes")
    payment_status = status_in.payment_status or order.get("payment_status", "pending")

    # If cancelling, restock inventory
    if new_status == "cancelled" and old_status != "cancelled":
        items = await d1.fetch_all("SELECT * FROM order_items WHERE order_id = ?", order["id"])
        for it in items:
            v = await d1.fetch_one("SELECT * FROM product_variants WHERE id = ?", it["variant_id"])
            if v:
                prev_stk = v["stock"]
                new_stk = prev_stk + it["quantity"]
                await d1.execute("UPDATE product_variants SET stock = ? WHERE id = ?", new_stk, v["id"])
                await d1.execute_insert(
                    """
                    INSERT INTO inventory_logs (product_id, previous_stock, changed_stock, new_stock, reason, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    it["product_id"], prev_stk, it["quantity"], new_stk, f"Status Cancelled #{order['order_number']}", now
                )

    await d1.execute(
        "UPDATE orders SET status = ?, admin_notes = ?, payment_status = ?, updated_at = ? WHERE id = ?",
        new_status, admin_notes, payment_status, now, order["id"]
    )

    broadcaster.publish("ORDER_UPDATED", {
        "order_id": order["id"],
        "order_number": order["order_number"],
        "status": new_status,
        "payment_status": payment_status
    })
    if new_status == "cancelled" and old_status != "cancelled":
        broadcaster.publish("INVENTORY_UPDATED")

    return await load_order_with_items(d1, order["id"])
