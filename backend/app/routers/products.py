from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, asc
from backend.app.config import settings
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

    # Category Filtering
    if category_id:
        query = query.filter(Product.category_id == category_id)
    elif category_slug:
        cat = db.query(Category).filter(Category.slug == category_slug.lower()).first()
        if cat:
            query = query.filter(Product.category_id == cat.id)
        else:
            return []

    # Collection Filtering
    if collection == "best_sellers":
        query = query.filter(Product.is_best_seller == True)
    elif collection == "fresh_today":
        query = query.filter(Product.is_fresh_today == True)
    elif collection == "featured":
        query = query.filter(Product.is_featured == True)

    # Search with PostgreSQL ILIKE
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Product.name.ilike(term),
                Product.description.ilike(term),
                Product.brand.ilike(term)
            )
        )

    # Price Filtering
    if min_price is not None:
        query = query.join(Product.variants).filter(ProductVariant.price >= min_price)
    if max_price is not None:
        query = query.join(Product.variants).filter(ProductVariant.price <= max_price)

    # In Stock Filtering
    if in_stock_only:
        query = query.join(Product.variants).filter(ProductVariant.stock > 0)

    # Sorting
    if sort == "newest":
        query = query.order_by(desc(Product.created_at))
    elif sort == "price_asc":
        query = query.join(Product.variants).order_by(asc(ProductVariant.price))
    elif sort == "price_desc":
        query = query.join(Product.variants).order_by(desc(ProductVariant.price))
    else:  # popular
        query = query.order_by(desc(Product.is_featured), desc(Product.is_best_seller), desc(Product.id))

    products = query.distinct().offset(offset).limit(limit).all()
    return [enrich_product_out(p) for p in products]


@router.get("/search/suggestions")
def get_search_suggestions(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db)
):
    term = f"%{q.strip()}%"
    prods = db.query(Product).filter(
        Product.name.ilike(term),
        Product.is_active == True
    ).limit(5).all()

    cats = db.query(Category).filter(
        Category.name.ilike(term),
        Category.is_active == True
    ).limit(3).all()

    return {
        "products": [{"name": p.name, "slug": p.slug} for p in prods],
        "categories": [{"name": c.name, "slug": c.slug} for c in cats]
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
def get_related_products(
    id_or_slug: str,
    limit: int = 4,
    db: Session = Depends(get_db)
):
    current = None
    if id_or_slug.isdigit():
        current = db.query(Product).filter(Product.id == int(id_or_slug)).first()
    else:
        current = db.query(Product).filter(Product.slug == id_or_slug.lower()).first()

    if not current:
        return []

    related = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.variants),
        joinedload(Product.images)
    ).filter(
        Product.category_id == current.category_id,
        Product.id != current.id,
        Product.is_active == True
    ).limit(limit).all()

    return [enrich_product_out(p) for p in related]


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    clean_slug = (product_in.slug or product_in.name.lower().replace(" ", "-")).strip()
    existing = db.query(Product).filter(Product.slug == clean_slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="A product with this slug already exists.")

    new_prod = Product(
        name=product_in.name.strip(),
        slug=clean_slug,
        category_id=product_in.category_id,
        description=product_in.description,
        short_description=product_in.short_description,
        brand=product_in.brand or "Sri Adithya Organics",
        is_featured=product_in.is_featured,
        is_best_seller=product_in.is_best_seller,
        is_fresh_today=product_in.is_fresh_today,
        is_active=product_in.is_active
    )
    db.add(new_prod)
    db.flush()

    # Add variants
    if product_in.variants:
        for idx, v in enumerate(product_in.variants):
            new_v = ProductVariant(
                product_id=new_prod.id,
                unit=v.unit,
                pack_size=v.pack_size,
                price=v.price,
                mrp=v.mrp,
                stock=v.stock,
                is_default=(idx == 0)
            )
            db.add(new_v)

    # Add primary image
    if product_in.images:
        for idx, img_url in enumerate(product_in.images):
            new_img = ProductImage(
                product_id=new_prod.id,
                image_url=img_url,
                alt_text=new_prod.name,
                is_primary=(idx == 0),
                display_order=idx
            )
            db.add(new_img)

    db.commit()
    db.refresh(new_prod)
    return enrich_product_out(new_prod)


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
    images = update_data.pop("images", None)

    for field, val in update_data.items():
        setattr(product, field, val)

    if images is not None:
        db.query(ProductImage).filter(ProductImage.product_id == product.id).delete()
        for idx, img_url in enumerate(images):
            new_img = ProductImage(
                product_id=product.id,
                image_url=img_url,
                alt_text=product.name,
                is_primary=(idx == 0),
                display_order=idx
            )
            db.add(new_img)

    db.commit()
    db.refresh(product)
    return enrich_product_out(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    product.is_active = False
    db.commit()
    return None


@router.put("/{product_id}/variants/{variant_id}", response_model=ProductOut)
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
    for field, val in update_data.items():
        setattr(variant, field, val)

    db.commit()
    product = db.query(Product).filter(Product.id == product_id).first()
    return enrich_product_out(product)
