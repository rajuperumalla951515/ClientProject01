from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.database import get_db
from backend.app.models import Category, Product
from backend.app.schemas import CategoryOut, CategoryCreate, CategoryUpdate
from backend.app.deps import get_current_admin

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("", response_model=List[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    # Query categories with product counts
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
    category = db.query(Category).filter(Category.slug == slug.lower()).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")
    
    count = db.query(func.count(Product.id)).filter(Product.category_id == category.id, Product.is_active == True).scalar() or 0
    cat_out = CategoryOut.model_validate(category)
    cat_out.product_count = count
    return cat_out


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(cat_in: CategoryCreate, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
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

