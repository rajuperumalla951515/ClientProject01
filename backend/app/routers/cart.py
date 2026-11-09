import time
import uuid
import datetime
from typing import Optional, List, Tuple, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header, status
from backend.app.config import settings
from backend.app.d1 import D1Database, get_d1
from backend.app.schemas import CartOut, CartItemAdd, CartItemUpdate, CartItemSetQuantity, CartItemOut, ProductOut, VariantOut, ProductImageOut
from backend.app.deps import get_optional_user
from backend.app.pricing import compute_financials

router = APIRouter(prefix="/cart", tags=["Shopping Cart"])

# In-memory TTL cache for delivery settings
_settings_cache: Optional[Tuple[float, float]] = None
_settings_cache_time: float = 0.0

async def get_cached_delivery_settings(d1: D1Database) -> Tuple[float, float]:
    global _settings_cache, _settings_cache_time
    now = time.time()
    if _settings_cache is None or (now - _settings_cache_time) > 60.0:
        setting = await d1.fetch_one("SELECT free_delivery_threshold, standard_delivery_fee FROM delivery_settings LIMIT 1")
        if setting:
            _settings_cache = (
                float(setting.get("free_delivery_threshold") if setting.get("free_delivery_threshold") is not None else 499.0),
                float(setting.get("standard_delivery_fee") if setting.get("standard_delivery_fee") is not None else 39.0)
            )
        else:
            _settings_cache = (499.0, 39.0)
        _settings_cache_time = now
    return _settings_cache


async def get_or_create_cart(d1: D1Database, user: Optional[Dict[str, Any]], session_id: Optional[str]) -> Dict[str, Any]:
    now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    if user and user.get("id"):
        user_id = user["id"]
        cart = await d1.fetch_one("SELECT * FROM carts WHERE user_id = ?", user_id)
        if not cart:
            cid = await d1.execute_insert("INSERT INTO carts (user_id, updated_at) VALUES (?, ?)", user_id, now)
            cart = await d1.fetch_one("SELECT * FROM carts WHERE id = ?", cid)
        return cart

    clean_sid = session_id.strip() if session_id else None
    if clean_sid:
        cart = await d1.fetch_one("SELECT * FROM carts WHERE session_id = ?", clean_sid)
        if not cart:
            cid = await d1.execute_insert("INSERT INTO carts (session_id, updated_at) VALUES (?, ?)", clean_sid, now)
            cart = await d1.fetch_one("SELECT * FROM carts WHERE id = ?", cid)
        return cart

    unique_guest_id = f"guest_{uuid.uuid4().hex}"
    cid = await d1.execute_insert("INSERT INTO carts (session_id, updated_at) VALUES (?, ?)", unique_guest_id, now)
    cart = await d1.fetch_one("SELECT * FROM carts WHERE id = ?", cid)
    return cart


async def compute_cart_details(cart: Dict[str, Any], d1: D1Database) -> CartOut:
    free_threshold, standard_delivery = await get_cached_delivery_settings(d1)
    cart_id = cart["id"]

    items = await d1.fetch_all("SELECT * FROM cart_items WHERE cart_id = ? ORDER BY id ASC", cart_id)
    if not items:
        fin = compute_financials([], free_delivery_threshold=free_threshold, standard_delivery_fee=standard_delivery)
        return CartOut(
            id=cart_id,
            items=[],
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

    product_ids = list({it["product_id"] for it in items})
    variant_ids = list({it["variant_id"] for it in items})

    p_placeholders = ",".join("?" * len(product_ids))
    products = await d1.fetch_all(f"SELECT * FROM products WHERE id IN ({p_placeholders})", *product_ids)
    product_map = {p["id"]: p for p in products}

    v_placeholders = ",".join("?" * len(variant_ids))
    variants = await d1.fetch_all(f"SELECT * FROM product_variants WHERE id IN ({v_placeholders})", *variant_ids)
    variant_map = {v["id"]: v for v in variants}

    images = await d1.fetch_all(
        f"SELECT * FROM product_images WHERE product_id IN ({p_placeholders}) ORDER BY is_primary DESC, display_order ASC",
        *product_ids
    )
    img_map: Dict[int, List[Dict[str, Any]]] = {}
    for img in images:
        img_map.setdefault(img["product_id"], []).append(img)

    items_out: List[CartItemOut] = []
    raw_fin_items = []

    for item in items:
        prod = product_map.get(item["product_id"])
        var = variant_map.get(item["variant_id"])
        if not prod or not var or not prod.get("is_active"):
            continue

        prod_imgs = img_map.get(prod["id"], [])
        primary_img = prod_imgs[0]["image_url"] if prod_imgs else "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800"

        var_price = float(var["price"])
        var_mrp = float(var.get("mrp") or var["price"])
        discount_pct = int(round(((var_mrp - var_price) / var_mrp) * 100)) if var_mrp > var_price and var_mrp > 0 else 0

        v_out = VariantOut(
            id=var["id"],
            product_id=var["product_id"],
            sku=var.get("sku"),
            pack_size=var.get("pack_size"),
            unit=var.get("unit"),
            price=var_price,
            mrp=var_mrp,
            stock=var["stock"],
            is_default=bool(var.get("is_default")),
            in_stock=var["stock"] > 0
        )

        p_out = ProductOut(
            id=prod["id"],
            name=prod["name"],
            slug=prod["slug"],
            category_id=prod["category_id"],
            description=prod.get("description") or "",
            short_description=prod.get("short_description"),
            brand=prod.get("brand") or "Sri Adithya Organics",
            is_featured=bool(prod.get("is_featured")),
            is_best_seller=bool(prod.get("is_best_seller")),
            is_fresh_today=bool(prod.get("is_fresh_today")),
            is_deal=bool(prod.get("is_deal")),
            is_active=bool(prod.get("is_active")),
            created_at=prod["created_at"],
            primary_image=primary_img,
            min_price=var_price,
            max_price=var_price,
            mrp=var_mrp,
            discount_percentage=discount_pct,
            in_stock=var["stock"] > 0,
            variants=[v_out],
            images=[ProductImageOut(
                id=img["id"],
                product_id=img["product_id"],
                image_url=img["image_url"],
                alt_text=img.get("alt_text"),
                is_primary=bool(img.get("is_primary")),
                display_order=img.get("display_order", 0)
            ) for img in prod_imgs]
        )

        items_out.append(CartItemOut(
            id=item["id"],
            product_id=item["product_id"],
            variant_id=item["variant_id"],
            quantity=item["quantity"],
            product=p_out,
            variant=v_out
        ))

        raw_fin_items.append({
            "product_id": item["product_id"],
            "variant_id": item["variant_id"],
            "unit_price": var["price"],
            "mrp": var.get("mrp"),
            "quantity": item["quantity"]
        })

    fin = compute_financials(
        raw_fin_items,
        free_delivery_threshold=free_threshold,
        standard_delivery_fee=standard_delivery
    )

    return CartOut(
        id=cart_id,
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
async def get_cart(
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    d1: D1Database = Depends(get_d1),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    cart = await get_or_create_cart(d1, user, x_session_id)
    return await compute_cart_details(cart, d1)


@router.post("/items", response_model=CartOut)
async def add_item_to_cart(
    item_in: CartItemAdd,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    d1: D1Database = Depends(get_d1),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    if item_in.variant_id:
        variant = await d1.fetch_one(
            "SELECT * FROM product_variants WHERE id = ? AND product_id = ?",
            item_in.variant_id, item_in.product_id
        )
    else:
        variant = await d1.fetch_one(
            "SELECT * FROM product_variants WHERE product_id = ? ORDER BY is_default DESC, id ASC LIMIT 1",
            item_in.product_id
        )

    if not variant:
        raise HTTPException(status_code=404, detail="Product variant not found or currently unavailable.")

    prod = await d1.fetch_one("SELECT * FROM products WHERE id = ?", item_in.product_id)
    if not prod or not prod.get("is_active"):
        raise HTTPException(status_code=404, detail="Product is not active or available.")

    if variant["stock"] < item_in.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Only {variant['stock']} units available in stock."
        )

    cart = await get_or_create_cart(d1, user, x_session_id)

    cart_item = await d1.fetch_one(
        "SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant_id = ?",
        cart["id"], item_in.product_id, variant["id"]
    )

    now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    if cart_item:
        new_qty = cart_item["quantity"] + item_in.quantity
        if variant["stock"] < new_qty:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot add more. You have {cart_item['quantity']} in cart and total stock is {variant['stock']}."
            )
        await d1.execute(
            "UPDATE cart_items SET quantity = ? WHERE id = ?",
            new_qty, cart_item["id"]
        )
    else:
        await d1.execute_insert(
            "INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, created_at) VALUES (?, ?, ?, ?, ?)",
            cart["id"], item_in.product_id, variant["id"], item_in.quantity, now
        )

    return await compute_cart_details(cart, d1)


@router.put("/items/{item_id}", response_model=CartOut)
async def update_cart_item(
    item_id: int,
    item_in: CartItemUpdate,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    d1: D1Database = Depends(get_d1),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    cart = await get_or_create_cart(d1, user, x_session_id)
    cart_item = await d1.fetch_one(
        "SELECT * FROM cart_items WHERE id = ? AND cart_id = ?",
        item_id, cart["id"]
    )
    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found.")

    if item_in.quantity <= 0:
        await d1.execute("DELETE FROM cart_items WHERE id = ?", item_id)
    else:
        variant = await d1.fetch_one("SELECT * FROM product_variants WHERE id = ?", cart_item["variant_id"])
        if variant and variant["stock"] < item_in.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Only {variant['stock']} units available in stock."
            )
        await d1.execute("UPDATE cart_items SET quantity = ? WHERE id = ?", item_in.quantity, item_id)

    return await compute_cart_details(cart, d1)


@router.delete("/items/{item_id}", response_model=CartOut)
async def remove_cart_item(
    item_id: int,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    d1: D1Database = Depends(get_d1),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    cart = await get_or_create_cart(d1, user, x_session_id)
    await d1.execute("DELETE FROM cart_items WHERE id = ? AND cart_id = ?", item_id, cart["id"])
    return await compute_cart_details(cart, d1)


@router.put("/set-quantity", response_model=CartOut)
async def set_cart_quantity_by_product_variant(
    payload: CartItemSetQuantity,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    d1: D1Database = Depends(get_d1),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """
    Atomic quantity setter by (product_id, variant_id).
    Prevents race conditions, avoids client-side temporary item IDs,
    and handles deletion automatically when quantity <= 0.
    """
    cart = await get_or_create_cart(d1, user, x_session_id)
    now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    if payload.quantity <= 0:
        await d1.execute(
            "DELETE FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant_id = ?",
            cart["id"], payload.product_id, payload.variant_id
        )
    else:
        variant = await d1.fetch_one(
            "SELECT * FROM product_variants WHERE id = ? AND product_id = ?",
            payload.variant_id, payload.product_id
        )
        if not variant:
            raise HTTPException(status_code=404, detail="Product variant not found.")
        if variant["stock"] < payload.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Only {variant['stock']} units available in stock."
            )

        cart_item = await d1.fetch_one(
            "SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant_id = ?",
            cart["id"], payload.product_id, payload.variant_id
        )
        if cart_item:
            await d1.execute(
                "UPDATE cart_items SET quantity = ? WHERE id = ?",
                payload.quantity, cart_item["id"]
            )
        else:
            await d1.execute_insert(
                "INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, created_at) VALUES (?, ?, ?, ?, ?)",
                cart["id"], payload.product_id, payload.variant_id, payload.quantity, now
            )

    return await compute_cart_details(cart, d1)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
@router.post("/clear", response_model=CartOut)
async def clear_cart(
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    d1: D1Database = Depends(get_d1),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    cart = await get_or_create_cart(d1, user, x_session_id)
    await d1.execute("DELETE FROM cart_items WHERE cart_id = ?", cart["id"])
    return await compute_cart_details(cart, d1)
