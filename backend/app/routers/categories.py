from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from backend.app.d1 import D1Database, get_d1
from backend.app.schemas import CategoryOut, CategoryCreate, CategoryUpdate
from backend.app.deps import get_current_admin
from backend.app.events import broadcaster

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("", response_model=List[CategoryOut])
async def list_categories(d1: D1Database = Depends(get_d1)):
    """
    Optimized category list with single-query LEFT JOIN and GROUP BY against Cloudflare D1.
    """
    rows = await d1.fetch_all("""
        SELECT c.*, COALESCE(COUNT(p.id), 0) AS product_count
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
        WHERE c.is_active = 1
        GROUP BY c.id
        ORDER BY c.display_order ASC, c.name ASC
    """)
    return [CategoryOut.model_validate(r) for r in rows]


@router.get("/{slug}", response_model=CategoryOut)
async def get_category_by_slug(slug: str, d1: D1Database = Depends(get_d1)):
    row = await d1.fetch_one("""
        SELECT c.*, COALESCE(COUNT(p.id), 0) AS product_count
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
        WHERE c.slug = ?
        GROUP BY c.id
    """, slug.lower().strip())
    if not row:
        raise HTTPException(status_code=404, detail="Category not found.")
    return CategoryOut.model_validate(row)


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(cat_in: CategoryCreate, d1: D1Database = Depends(get_d1), admin=Depends(get_current_admin)):
    import re, time
    slug_base = (cat_in.slug or cat_in.name).strip().lower()
    clean_slug = re.sub(r'[^a-z0-9]+', '-', slug_base).strip('-')
    if not clean_slug:
        clean_slug = f"category-{int(time.time())}"
    
    existing = await d1.fetch_one("SELECT id FROM categories WHERE slug = ?", clean_slug)
    if existing:
        clean_slug = f"{clean_slug}-{int(time.time())}"

    cat_id = await d1.execute_insert("""
        INSERT INTO categories (name, slug, description, image_url, icon, display_order, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, cat_in.name.strip(), clean_slug, cat_in.description, cat_in.image_url, cat_in.icon, cat_in.display_order, 1 if cat_in.is_active else 0)
    
    broadcaster.publish("CATEGORY_CREATED", {"category_id": cat_id, "slug": clean_slug})
    cat = await d1.fetch_one("SELECT * FROM categories WHERE id = ?", cat_id)
    cat_out = CategoryOut.model_validate(cat)
    cat_out.product_count = 0
    return cat_out


@router.put("/{category_id}", response_model=CategoryOut)
async def update_category(
    category_id: int,
    cat_in: CategoryUpdate,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    category = await d1.fetch_one("SELECT * FROM categories WHERE id = ?", category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")

    update_data = cat_in.model_dump(exclude_unset=True)
    if "slug" in update_data and update_data["slug"]:
        update_data["slug"] = update_data["slug"].strip().lower()

    fields = []
    params = []
    for f, v in update_data.items():
        fields.append(f"{f} = ?")
        params.append(1 if v is True else (0 if v is False else v))
    if fields:
        params.append(category_id)
        await d1.execute(f"UPDATE categories SET {', '.join(fields)} WHERE id = ?", *params)

    broadcaster.publish("CATEGORY_UPDATED", {"category_id": category_id, "slug": update_data.get("slug", category["slug"])})
    
    row = await d1.fetch_one("""
        SELECT c.*, COALESCE(COUNT(p.id), 0) AS product_count
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
        WHERE c.id = ?
        GROUP BY c.id
    """, category_id)
    return CategoryOut.model_validate(row)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    d1: D1Database = Depends(get_d1),
    admin=Depends(get_current_admin)
):
    category = await d1.fetch_one("SELECT id FROM categories WHERE id = ?", category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")

    await d1.execute("UPDATE categories SET is_active = 0 WHERE id = ?", category_id)
    broadcaster.publish("CATEGORY_DELETED", {"category_id": category_id})
    return None
