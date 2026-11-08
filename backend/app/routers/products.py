from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from backend.app.d1 import D1Database, get_d1
from backend.app.schemas import (
    ProductOut, ProductCreate, ProductUpdate, VariantOut, ProductImageOut, CategoryOut, VariantUpdate
)
from backend.app.deps import get_current_admin
from backend.app.events import broadcaster

router = APIRouter(prefix="/products", tags=["Products"])

def parse_datetime(dt_val) -> datetime:
    if isinstance(dt_val, datetime):
        return dt_val
    if isinstance(dt_val, str):
        try:
            return datetime.fromisoformat(dt_val.replace("Z", "+00:00"))
        except Exception:
            pass
    return datetime.now(timezone.utc)

def build_product_out(p: dict, variants: list, images: list, category: dict = None) -> ProductOut:
    sorted_images = sorted(images, key=lambda x: (not x.get("is_primary"), x.get("display_order", 0)))
    primary_img = sorted_images[0]["image_url"] if sorted_images else "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800"
    
    if variants:
        prices = [float(v["price"]) for v in variants]
        mrps = [float(v["mrp"]) for v in variants]
        stocks = [int(v["stock"]) for v in variants]
        min_p = min(prices)
        max_p = max(prices)
        def_var = next((v for v in variants if v.get("is_default")), variants[0])
        def_mrp = float(def_var["mrp"])
        def_price = float(def_var["price"])
        discount = int(round(((def_mrp - def_price) / def_mrp) * 100)) if def_mrp > def_price and def_mrp > 0 else 0
        in_stock = any(s > 0 for s in stocks)
    else:
        min_p = max_p = def_mrp = 0.0
        discount = 0
        in_stock = False

    cat_out = CategoryOut.model_validate(category) if category else None
    var_outs = [VariantOut.model_validate(v) for v in variants]
    img_outs = [ProductImageOut.model_validate(img) for img in images]

    return ProductOut(
        id=p["id"],
        name=p["name"],
        slug=p["slug"],
        category_id=p["category_id"],
        description=p["description"],
        short_description=p.get("short_description"),
        brand=p.get("brand") or "Sri Adithya Organics",
        origin_farm=p.get("origin_farm"),
        certifications=p.get("certifications"),
        storage_instructions=p.get("storage_instructions"),
        allergens=p.get("allergens"),
        ingredients=p.get("ingredients"),
        is_featured=bool(p.get("is_featured")),
        is_fresh_today=bool(p.get("is_fresh_today")),
        is_deal=bool(p.get("is_deal")),
        is_best_seller=bool(p.get("is_best_seller")),
        is_active=bool(p.get("is_active")),
        created_at=parse_datetime(p.get("created_at")),
        category=cat_out,
        variants=var_outs,
        images=img_outs,
        primary_image=primary_img,
        min_price=min_p,
        max_price=max_p,
        mrp=def_mrp,
        discount_percentage=discount,
        in_stock=in_stock
    )

async def batch_load_relations(d1: D1Database, products: List[dict]) -> List[ProductOut]:
    if not products:
        return []
    
    prod_ids = [p["id"] for p in products]
    cat_ids = list({p["category_id"] for p in products if p.get("category_id")})
    
    # Placeholders for IN clauses
    p_placeholders = ",".join(["?"] * len(prod_ids))
    
    # Fetch variants and images in batch
    all_variants = await d1.fetch_all(f"SELECT * FROM product_variants WHERE product_id IN ({p_placeholders})", *prod_ids)
    all_images = await d1.fetch_all(f"SELECT * FROM product_images WHERE product_id IN ({p_placeholders})", *prod_ids)
    
    # Fetch categories in batch
    categories_by_id = {}
    if cat_ids:
        c_placeholders = ",".join(["?"] * len(cat_ids))
        cats = await d1.fetch_all(f"SELECT * FROM categories WHERE id IN ({c_placeholders})", *cat_ids)
        categories_by_id = {c["id"]: c for c in cats}
    
    # Group variants and images by product_id
    variants_by_prod = {}
    for v in all_variants:
        variants_by_prod.setdefault(v["product_id"], []).append(v)
        
    images_by_prod = {}
    for img in all_images:
        images_by_prod.setdefault(img["product_id"], []).append(img)
        
    results = []
    for p in products:
        cat = categories_by_id.get(p["category_id"])
        vars_ = variants_by_prod.get(p["id"], [])
        imgs = images_by_prod.get(p["id"], [])
        results.append(build_product_out(p, vars_, imgs, cat))
    return results


@router.get("", response_model=List[ProductOut])
async def list_products(
    category_id: Optional[int] = None,
    category_slug: Optional[str] = None,
    collection: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    in_stock_only: Optional[bool] = False,
    sort: Optional[str] = Query("popular", regex="^(popular|price_asc|price_desc|newest)$"),
    limit: int = 50,
    offset: int = 0,
    d1: D1Database = Depends(get_d1)
):
    where_clauses = ["p.is_active = 1"]
    params = []

    if category_id:
        where_clauses.append("p.category_id = ?")
        params.append(category_id)
    elif category_slug:
        cat = await d1.fetch_one("SELECT id FROM categories WHERE slug = ?", category_slug.lower())
        if not cat:
            return []
        where_clauses.append("p.category_id = ?")
        params.append(cat["id"])

    if collection == "best_sellers":
        where_clauses.append("p.is_best_seller = 1")
    elif collection == "fresh_today":
        where_clauses.append("p.is_fresh_today = 1")
    elif collection == "featured":
        where_clauses.append("p.is_featured = 1")

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        where_clauses.append("(LOWER(p.name) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(p.brand) LIKE ?)")
        params.extend([term, term, term])

    join_variants = False
    if min_price is not None:
        join_variants = True
        where_clauses.append("v.price >= ?")
        params.append(min_price)
    if max_price is not None:
        join_variants = True
        where_clauses.append("v.price <= ?")
        params.append(max_price)
    if in_stock_only:
        join_variants = True
        where_clauses.append("v.stock > 0")

    order_by = "p.is_featured DESC, p.is_best_seller DESC, p.id DESC"
    if sort == "newest":
        order_by = "p.created_at DESC"
    elif sort == "price_asc":
        join_variants = True
        order_by = "v.price ASC"
    elif sort == "price_desc":
        join_variants = True
        order_by = "v.price DESC"

    from_sql = "FROM products p"
    if join_variants:
        from_sql += " JOIN product_variants v ON v.product_id = p.id"

    where_sql = " WHERE " + " AND ".join(where_clauses)
    query = f"SELECT DISTINCT p.* {from_sql} {where_sql} ORDER BY {order_by} LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    prods = await d1.fetch_all(query, *params)
    return await batch_load_relations(d1, prods)


@router.get("/search/suggestions")
async def get_search_suggestions(
    q: str = Query(..., min_length=2),
    d1: D1Database = Depends(get_d1)
):
    term = f"%{q.strip().lower()}%"
    prods = await d1.fetch_all("SELECT name, slug FROM products WHERE is_active = 1 AND LOWER(name) LIKE ? LIMIT 5", term)
    cats = await d1.fetch_all("SELECT name, slug FROM categories WHERE is_active = 1 AND LOWER(name) LIKE ? LIMIT 3", term)
    return {
        "products": prods,
        "categories": cats
    }


@router.get("/{id_or_slug}", response_model=ProductOut)
async def get_product(id_or_slug: str, d1: D1Database = Depends(get_d1)):
    if id_or_slug.isdigit():
        prod = await d1.fetch_one("SELECT * FROM products WHERE id = ? AND is_active = 1", int(id_or_slug))
    else:
        prod = await d1.fetch_one("SELECT * FROM products WHERE slug = ? AND is_active = 1", id_or_slug.lower())

    if not prod:
        raise HTTPException(status_code=404, detail="Product not found.")

    res = await batch_load_relations(d1, [prod])
    return res[0]


@router.get("/{id_or_slug}/related", response_model=List[ProductOut])
async def get_related_products(
    id_or_slug: str,
    limit: int = 4,
    d1: D1Database = Depends(get_d1)
):
    if id_or_slug.isdigit():
        current = await d1.fetch_one("SELECT id, category_id FROM products WHERE id = ?", int(id_or_slug))
    else:
        current = await d1.fetch_one("SELECT id, category_id FROM products WHERE slug = ?", id_or_slug.lower())

    if not current:
        return []

    related = await d1.fetch_all(
        "SELECT * FROM products WHERE category_id = ? AND id != ? AND is_active = 1 LIMIT ?",
        current["category_id"], current["id"], limit
    )
    return await batch_load_relations(d1, related)


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_in: ProductCreate,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    import re, time
    slug_base = (product_in.slug or product_in.name).strip().lower()
    clean_slug = re.sub(r'[^a-z0-9]+', '-', slug_base).strip('-')
    if not clean_slug:
        clean_slug = f"product-{int(time.time())}"

    existing = await d1.fetch_one("SELECT id FROM products WHERE slug = ?", clean_slug)
    if existing:
        clean_slug = f"{clean_slug}-{int(time.time())}"

    prod_id = await d1.execute_insert("""
        INSERT INTO products (name, slug, category_id, description, short_description, brand, origin_farm,
                             certifications, storage_instructions, allergens, ingredients, is_featured, is_fresh_today, is_deal, is_best_seller, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, product_in.name.strip(), clean_slug, product_in.category_id, product_in.description,
        product_in.short_description, product_in.brand or "Sri Adithya Organics", product_in.origin_farm,
        product_in.certifications, product_in.storage_instructions, product_in.allergens,
        product_in.ingredients, 1 if product_in.is_featured else 0, 1 if product_in.is_fresh_today else 0,
        1 if product_in.is_deal else 0, 1 if product_in.is_best_seller else 0, 1 if product_in.is_active else 0)

    # Insert variants
    if product_in.variants:
        for idx, v in enumerate(product_in.variants):
            await d1.execute("""
                INSERT INTO product_variants (product_id, unit, pack_size, price, mrp, stock, is_default)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, prod_id, v.unit, v.pack_size, float(v.price), float(v.mrp), v.stock, 1 if idx == 0 else 0)

    # Insert images
    if product_in.images:
        for idx, img in enumerate(product_in.images):
            await d1.execute("""
                INSERT INTO product_images (product_id, image_url, alt_text, is_primary, display_order)
                VALUES (?, ?, ?, ?, ?)
            """, prod_id, img.image_url, img.alt_text or product_in.name, 1 if idx == 0 else 0, idx)

    broadcaster.publish("PRODUCT_CREATED", {"product_id": prod_id, "slug": clean_slug})
    prod = await d1.fetch_one("SELECT * FROM products WHERE id = ?", prod_id)
    res = await batch_load_relations(d1, [prod])
    return res[0]


@router.put("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: int,
    product_in: ProductUpdate,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    product = await d1.fetch_one("SELECT * FROM products WHERE id = ?", product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    update_data = product_in.model_dump(exclude_unset=True)
    images = update_data.pop("images", None)

    fields = []
    params = []
    for f, v in update_data.items():
        fields.append(f"{f} = ?")
        params.append(1 if v is True else (0 if v is False else v))
    if fields:
        params.append(product_id)
        await d1.execute(f"UPDATE products SET {', '.join(fields)} WHERE id = ?", *params)

    if images is not None:
        await d1.execute("DELETE FROM product_images WHERE product_id = ?", product_id)
        for idx, img_url in enumerate(images):
            await d1.execute("""
                INSERT INTO product_images (product_id, image_url, alt_text, is_primary, display_order)
                VALUES (?, ?, ?, ?, ?)
            """, product_id, img_url, product["name"], 1 if idx == 0 else 0, idx)

    broadcaster.publish("PRODUCT_UPDATED", {"product_id": product_id})
    prod = await d1.fetch_one("SELECT * FROM products WHERE id = ?", product_id)
    res = await batch_load_relations(d1, [prod])
    return res[0]


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    product = await d1.fetch_one("SELECT id FROM products WHERE id = ?", product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    await d1.execute("UPDATE products SET is_active = 0 WHERE id = ?", product_id)
    broadcaster.publish("PRODUCT_DELETED", {"product_id": product_id})
    return None


@router.put("/{product_id}/variants/{variant_id}", response_model=ProductOut)
async def update_variant(
    product_id: int,
    variant_id: int,
    variant_in: VariantUpdate,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    variant = await d1.fetch_one("SELECT * FROM product_variants WHERE id = ? AND product_id = ?", variant_id, product_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found.")

    update_data = variant_in.model_dump(exclude_unset=True)
    fields = []
    params = []
    for f, v in update_data.items():
        fields.append(f"{f} = ?")
        params.append(1 if v is True else (0 if v is False else v))
    if fields:
        params.extend([variant_id, product_id])
        await d1.execute(f"UPDATE product_variants SET {', '.join(fields)} WHERE id = ? AND product_id = ?", *params)

    broadcaster.publish("STOCK_UPDATED", {"product_id": product_id, "variant_id": variant_id})
    prod = await d1.fetch_one("SELECT * FROM products WHERE id = ?", product_id)
    res = await batch_load_relations(d1, [prod])
    return res[0]


@router.post("/{product_id}/variants", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_variant(
    product_id: int,
    variant_in: VariantUpdate,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    product = await d1.fetch_one("SELECT id FROM products WHERE id = ?", product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    unit = variant_in.unit or "1 Unit"
    pack_size = variant_in.pack_size or "Standard Pack"
    price = float(variant_in.price or 99.0)
    mrp = float(variant_in.mrp or price)
    stock = int(variant_in.stock or 50)
    is_def = 1 if variant_in.is_default else 0

    if is_def:
        await d1.execute("UPDATE product_variants SET is_default = 0 WHERE product_id = ?", product_id)

    await d1.execute("""
        INSERT INTO product_variants (product_id, unit, pack_size, price, mrp, stock, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, product_id, unit, pack_size, price, mrp, stock, is_def)

    broadcaster.publish("STOCK_UPDATED", {"product_id": product_id})
    prod = await d1.fetch_one("SELECT * FROM products WHERE id = ?", product_id)
    res = await batch_load_relations(d1, [prod])
    return res[0]


@router.delete("/{product_id}/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_variant(
    product_id: int,
    variant_id: int,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    await d1.execute("DELETE FROM product_variants WHERE id = ? AND product_id = ?", variant_id, product_id)
    broadcaster.publish("STOCK_UPDATED", {"product_id": product_id})
    return Response(status_code=status.HTTP_204_NO_CONTENT)

