from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, asc
from backend.app.database import get_db
from backend.app.models import Product, ProductVariant, ProductImage, Category
from backend.app.schemas import (
    ProductOut, ProductCreate, ProductUpdate, VariantCreate, VariantUpdate, VariantOut
)
from backend.app.deps import get_current_admin

router = APIRouter(prefix="/products", tags=["Products"])

def enrich_product_out(p: Product) -> ProductOut:
    """Enrich Product with computed fields like primary image, price range, discount."""
    p_out = ProductOut.model_validate(p)
    
    # Primary image
    primary_img = None
    if p.images:
        sorted_images = sorted(p.images, key=lambda x: (not x.is_primary, x.display_order))
        primary_img = sorted_images[0].image_url
    p_out.primary_image = primary_img or "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800"

    # Price & Stock calculation from variants
    if p.variants:
        prices = [v.price for v in p.variants]
        mrps = [v.mrp for v in p.variants]
        stocks = [v.stock for v in p.variants]
        p_out.min_price = min(prices)
        p_out.max_price = max(prices)
        
        # Default or first variant MRP
        default_variant = next((v for v in p.variants if v.is_default), p.variants[0])
        p_out.mrp = default_variant.mrp
        
        # Calculate discount
        if default_variant.mrp > default_variant.price:
            p_out.discount_percentage = int(round(((default_variant.mrp - default_variant.price) / default_variant.mrp) * 100))
        else:
            p_out.discount_percentage = 0
            
        p_out.in_stock = any(s > 0 for s in stocks)
    else:
        p_out.min_price = 0.0
        p_out.max_price = 0.0
        p_out.mrp = 0.0
        p_out.discount_percentage = 0
        p_out.in_stock = False

    return p_out


@router.get("", response_model=List[ProductOut])
def list_products(
    category_id: Optional[int] = None,
    category_slug: Optional[str] = None,
    collection: Optional[str] = None,  # "best_sellers", "fresh_today", "deals", "featured"
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    in_stock_only: Optional[bool] = False,
    sort: Optional[str] = Query("popular", regex="^(popular|price_asc|price_desc|newest)$"),
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.variants),
        joinedload(Product.images)
    ).filter(Product.is_active == True)

    # Category filters
    if category_slug:
        query = query.join(Category).filter(Category.slug == category_slug.lower())
    elif category_id:
        query = query.filter(Product.category_id == category_id)

    # Collection filters
    if collection == "best_sellers":
        query = query.filter(Product.is_best_seller == True)
    elif collection == "fresh_today":
        query = query.filter(Product.is_fresh_today == True)
    elif collection == "deals":
        query = query.filter(Product.is_deal == True)
    elif collection == "featured":
        query = query.filter(Product.is_featured == True)

    # Search filter (case-insensitive)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_term),
                Product.description.ilike(search_term),
                Product.short_description.ilike(search_term),
                Product.brand.ilike(search_term),
                Product.origin_farm.ilike(search_term),
                Product.ingredients.ilike(search_term)
            )
        )

    # Sorting
    if sort == "newest":
        query = query.order_by(desc(Product.created_at))
    elif sort == "popular":
        query = query.order_by(desc(Product.is_best_seller), desc(Product.is_featured), desc(Product.id))
    else:
        # Default order
        query = query.order_by(Product.id.asc())

    products = query.offset(offset).limit(limit).all()

    # Price and stock filtering in memory or with variants
    results = [enrich_product_out(p) for p in products]

    if min_price is not None:
        results = [p for p in results if p.min_price >= min_price]
    if max_price is not None:
        results = [p for p in results if p.min_price <= max_price]
    if in_stock_only:
        results = [p for p in results if p.in_stock]

    if sort == "price_asc":
        results.sort(key=lambda x: x.min_price or 0)
    elif sort == "price_desc":
        results.sort(key=lambda x: x.min_price or 0, reverse=True)

    return results


@router.get("/search-suggestions")
def get_search_suggestions(q: str = Query("", min_length=1), db: Session = Depends(get_db)):
    """Provides fast suggestions for autocomplete search."""
    search_term = f"%{q.strip()}%"
    
    # Matching product titles
    products = db.query(Product.name, Product.slug).filter(
        Product.is_active == True,
        Product.name.ilike(search_term)
    ).limit(6).all()

    # Matching categories
    categories = db.query(Category.name, Category.slug).filter(
        Category.is_active == True,
        Category.name.ilike(search_term)
    ).limit(3).all()

    return {
        "products": [{"name": p.name, "slug": p.slug} for p in products],
        "categories": [{"name": c.name, "slug": c.slug} for c in categories]
    }


@router.get("/{id_or_slug}", response_model=ProductOut)
def get_product(id_or_slug: str, db: Session = Depends(get_db)):
    query = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.variants),
        joinedload(Product.images)
    )

    if id_or_slug.isdigit():
        product = query.filter(Product.id == int(id_or_slug)).first()
    else:
        product = query.filter(Product.slug == id_or_slug.lower()).first()

    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found.")

    return enrich_product_out(product)


@router.get("/{id_or_slug}/related", response_model=List[ProductOut])
def get_related_products(id_or_slug: str, limit: int = 4, db: Session = Depends(get_db)):
    product = None
    if id_or_slug.isdigit():
        product = db.query(Product).filter(Product.id == int(id_or_slug)).first()
    else:
        product = db.query(Product).filter(Product.slug == id_or_slug.lower()).first()

    if not product:
        return []

    related = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.variants),
        joinedload(Product.images)
    ).filter(
        Product.category_id == product.category_id,
        Product.id != product.id,
        Product.is_active == True
    ).limit(limit).all()

    return [enrich_product_out(p) for p in related]


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(product_in: ProductCreate, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    existing = db.query(Product).filter(Product.slug == product_in.slug.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Product slug already exists.")

    product_data = product_in.model_dump(exclude={"variants", "images"})
    product = Product(**product_data)
    db.add(product)
    db.flush()

    # Add variants
    if product_in.variants:
        for v in product_in.variants:
            db_v = ProductVariant(product_id=product.id, **v.model_dump())
            db.add(db_v)
    else:
        # Default fallback variant
        default_v = ProductVariant(
            product_id=product.id,
            unit="1 pack",
            pack_size="Standard",
            price=99.0,
            mrp=120.0,
            stock=50,
            is_default=True
        )
        db.add(default_v)

    # Add images
    if product_in.images:
        for img in product_in.images:
            db_img = ProductImage(product_id=product.id, **img.model_dump())
            db.add(db_img)

    db.commit()
    db.refresh(product)
    return enrich_product_out(product)


@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    update_data = product_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return enrich_product_out(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    product.is_active = False
    db.commit()
    return None


@router.put("/{product_id}/variants/{variant_id}", response_model=VariantOut)
def update_variant(
    product_id: int,
    variant_id: int,
    variant_in: VariantUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    variant = db.query(ProductVariant).filter(
        ProductVariant.id == variant_id,
        ProductVariant.product_id == product_id
    ).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found.")

    update_data = variant_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(variant, field, value)

    db.commit()
    db.refresh(variant)
    return variant

