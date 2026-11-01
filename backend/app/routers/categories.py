from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.config import settings
from backend.app.database import get_db, check_db_connection
from backend.app.models import Category, Product
from backend.app.schemas import CategoryOut, CategoryCreate, CategoryUpdate
from backend.app.deps import get_current_admin
from backend.app.sheets.service import sheets_service

router = APIRouter(prefix="/categories", tags=["Categories"])

def is_sheets_storage() -> bool:
    return settings.STORAGE_BACKEND == "sheets" or not check_db_connection()[0]

@router.get("", response_model=List[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    # 1. Google Sheets Storage Mode
    if is_sheets_storage():
        categories = sheets_service.get_categories(only_active=True)
        products = sheets_service.get_all_products()
        counts_by_cat = {}
        for p in products:
            c_id = p.get("category_id")
            counts_by_cat[c_id] = counts_by_cat.get(c_id, 0) + 1

        results = []
        for cat in categories:
            cat_out = CategoryOut(
                id=cat["id"],
                name=cat["name"],
                slug=cat["slug"],
                description=cat.get("description"),
                image_url=cat.get("image_url"),
                icon=cat.get("icon"),
                display_order=cat.get("display_order", 0),
                is_active=cat.get("is_active", True),
                product_count=counts_by_cat.get(cat["id"], 0)
            )
            results.append(cat_out)
        return results

    # 2. Relational Database Mode
    if db.query(Category).count() == 0:
        try:
            from backend.app.seed import seed_database
            seed_database()
        except Exception as exc:
            print(f"Auto-seed categories notice: {exc}")

    categories = db.query(Category).filter(Category.is_active == True).order_by(Category.display_order.asc(), Category.name.asc()).all()
    results = []
    for cat in categories:
        count = db.query(func.count(Product.id)).filter(Product.category_id == cat.id, Product.is_active == True).scalar() or 0
        cat_out = CategoryOut.model_validate(cat)
        cat_out.product_count = count
        results.append(cat_out)
    return results


@router.get("/{slug}", response_model=CategoryOut)
def get_category_by_slug(slug: str, db: Session = Depends(get_db)):
    if is_sheets_storage():
        cat = sheets_service.get_category_by_slug(slug)
        if not cat:
            raise HTTPException(status_code=404, detail="Category not found.")
        products = sheets_service.get_all_products()
        count = sum(1 for p in products if p.get("category_id") == cat["id"])
        return CategoryOut(
            id=cat["id"],
            name=cat["name"],
            slug=cat["slug"],
            description=cat.get("description"),
            image_url=cat.get("image_url"),
            icon=cat.get("icon"),
            display_order=cat.get("display_order", 0),
            is_active=cat.get("is_active", True),
            product_count=count
        )

    category = db.query(Category).filter(Category.slug == slug.lower()).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")
    
    count = db.query(func.count(Product.id)).filter(Product.category_id == category.id, Product.is_active == True).scalar() or 0
    cat_out = CategoryOut.model_validate(category)
    cat_out.product_count = count
    return cat_out


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(cat_in: CategoryCreate, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    if is_sheets_storage():
        created = sheets_service.create_category(cat_in.model_dump())
        return CategoryOut(
            id=created["id"],
            name=created["name"],
            slug=created["slug"],
            description=created.get("description"),
            image_url=created.get("image_url"),
            icon=None,
            display_order=created.get("display_order", 0),
            is_active=created.get("is_active", True),
            product_count=0
        )

    existing = db.query(Category).filter(Category.slug == cat_in.slug.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category slug already exists.")
    
    category = Category(**cat_in.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    cat_out = CategoryOut.model_validate(category)
    cat_out.product_count = 0
    return cat_out


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(category_id: int, cat_in: CategoryUpdate, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")
    
    update_data = cat_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(cat, field, value)
    
    db.commit()
    db.refresh(cat)
    count = db.query(func.count(Product.id)).filter(Product.category_id == cat.id).scalar() or 0
    cat_out = CategoryOut.model_validate(cat)
    cat_out.product_count = count
    return cat_out


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")
    
    # Soft delete / toggle active
    cat.is_active = False
    db.commit()
    return None

