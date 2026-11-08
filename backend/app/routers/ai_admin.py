"""
Sri Adithya Organics — AI Administration API Router
Exposes secure, authenticated admin endpoints for:
1. Provider Health & Zero-Cost Quota Monitoring
2. AI Content Studio (Titles, Descriptions, SEO, Bilingual Telugu)
3. Promotion Intelligence & Margin Guardrails
4. Conversational Business Intelligence Assistant
5. Two-Step Action Approval Workflows
"""
import ipaddress
from urllib.parse import urlparse
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Request, status
from backend.app.d1 import D1Database, get_d1
from backend.app.deps import get_current_admin
from backend.app.ai.config import ai_config
from backend.app.ai.router import ai_router
from backend.app.ai.http_client import http_client
from backend.app.ai.content_studio import content_studio
from backend.app.ai.promotions import promotion_intelligence
from backend.app.ai.assistant import bi_assistant
from backend.app.ai.approvals import action_approvals
from backend.app.ai_migrations import ensure_ai_tables

router = APIRouter(prefix="/ai", tags=["AI Administration"])

def is_safe_image_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False
        hostname_lower = hostname.lower()
        if hostname_lower in ("localhost", "127.0.0.1", "::1", "0.0.0.0", "internal", "metadata"):
            return False
        if hostname_lower.endswith((".local", ".internal", ".localhost")):
            return False
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local:
                return False
        except ValueError:
            pass
        return True
    except Exception:
        return False

# --- Request / Response Models ---

class TitleGenRequest(BaseModel):
    product_name: str
    category_name: str
    unit: str = ""

class DescriptionGenRequest(BaseModel):
    product_name: str
    category_name: str
    features: Optional[str] = None
    verified_ingredients: Optional[str] = None
    verified_storage: Optional[str] = None

class SEOGenRequest(BaseModel):
    product_name: str
    category_name: str
    description_summary: str

class ContentTransformRequest(BaseModel):
    content: str
    mode: str = Field(..., description="'rewrite', 'grammar', 'concise', 'expand', 'telugu', 'bilingual'")
    product_name: Optional[str] = None

class BulkContentRequest(BaseModel):
    product_ids: List[int]

class PromotionRecommendRequest(BaseModel):
    product_id: Optional[int] = None
    category_id: Optional[int] = None
    campaign_goal: str = "growth"
    min_margin_percent: float = 18.0

class AssistantChatRequest(BaseModel):
    question: str
    conversation_history: Optional[List[Dict[str, str]]] = None

class PricingOfferRequest(BaseModel):
    product_name: str
    selling_price: float
    mrp: Optional[float] = None
    cost_price: Optional[float] = None
    min_margin_percent: float = 18.0

class ImageUrlImportRequest(BaseModel):
    image_url: str

class CategorySuggestRequest(BaseModel):
    category_name: str

class StockApprovalProposalRequest(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    delta: int
    reason: str = "Seasonal demand adjustment"

class PriceApprovalProposalRequest(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    new_price: float
    reason: str = "Raw material procurement adjustment"

class ApprovalResolveRequest(BaseModel):
    approved: bool


# --- Provider Health & Quotas ---

@router.get("/providers")
async def get_providers(
    d1: D1Database = Depends(get_d1),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Returns real-time status, daily quotas, latency, and cooldowns for all AI providers."""
    await ensure_ai_tables(d1)
    configs = await ai_router.get_provider_configs(d1)
    status_info = ai_config.get_provider_status()

    enriched = []
    for c in configs:
        p_name = c["provider_name"]
        item = dict(c)
        meta = status_info.get(p_name, {})
        item["has_credentials"] = meta.get("has_credentials", False)
        item["provider_type"] = meta.get("provider_type", "fallback")
        enriched.append(item)

    return enriched


@router.post("/providers/{name}/toggle")
async def toggle_provider(
    name: str,
    d1: D1Database = Depends(get_d1),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Enables or pauses an AI provider."""
    row = await d1.fetch_one("SELECT is_enabled FROM ai_provider_config WHERE provider_name = ?", name)
    if not row:
        raise HTTPException(status_code=404, detail=f"Provider '{name}' not found.")

    new_state = 0 if row["is_enabled"] else 1
    await d1.execute(
        "UPDATE ai_provider_config SET is_enabled = ?, consecutive_errors = 0, cooldown_until = NULL WHERE provider_name = ?",
        new_state, name
    )
    return {"provider": name, "is_enabled": bool(new_state)}


@router.get("/usage")
async def get_usage_logs(
    limit: int = 50,
    d1: D1Database = Depends(get_d1),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Returns recent AI request audit logs and execution latencies."""
    await ensure_ai_tables(d1)
    logs = await d1.fetch_all(
        """SELECT * FROM ai_usage_logs
           ORDER BY created_at DESC
           LIMIT ?""",
        limit
    )
    return logs


# --- Content Studio Endpoints ---

@router.post("/content/title")
async def generate_title(
    payload: TitleGenRequest,
    d1: D1Database = Depends(get_d1),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Generates primary, short, SEO, and regional titles."""
    try:
        return await content_studio.generate_titles(
            d1=d1,
            product_name=payload.product_name,
            category_name=payload.category_name,
            unit=payload.unit,
            admin_id=current_admin["id"]
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/content/description")
async def generate_description(
    payload: DescriptionGenRequest,
    d1: D1Database = Depends(get_d1),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Generates short descriptions, detailed paragraphs, highlights, and FAQs."""
    try:
        return await content_studio.generate_description(
            d1=d1,
            product_name=payload.product_name,
            category_name=payload.category_name,
            features=payload.features,
            verified_ingredients=payload.verified_ingredients,
            verified_storage=payload.verified_storage,
            admin_id=current_admin["id"]
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/content/seo")
async def generate_seo(
    payload: SEOGenRequest,
    d1: D1Database = Depends(get_d1),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Generates SEO meta tags, title, and keywords."""
    try:
        return await content_studio.generate_seo(
            d1=d1,
            product_name=payload.product_name,
            category_name=payload.category_name,
            description_summary=payload.description_summary,
            admin_id=current_admin["id"]
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/content/transform")
async def transform_content(
    payload: ContentTransformRequest,
    d1: D1Database = Depends(get_d1),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Polishes, rewrites, or translates content to Telugu/Bilingual."""
    try:
        return await content_studio.transform_content(
            d1=d1,
            content=payload.content,
            mode=payload.mode,
            product_name=payload.product_name,
            admin_id=current_admin["id"]
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/content/bulk")
async def bulk_generate_content(
    payload: BulkContentRequest,
    d1: D1Database = Depends(get_d1),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Generates content for a batch of products, saving drafts safely."""
    try:
        return await content_studio.generate_bulk_batch(
            d1=d1,
            product_ids=payload.product_ids,
            admin_id=current_admin["id"]
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/content/apply/{draft_id}")
async def apply_content_draft(
    draft_id: int,
    d1: D1Database = Depends(get_d1),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """1-Click apply: copies approved draft description into the live product catalog."""
    draft = await d1.fetch_one("SELECT * FROM ai_generated_content WHERE id = ?", draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft content not found.")

    import json
    data = json.loads(draft["generated_content_json"])
    pid = draft["product_id"]

    short_desc = data.get("short_description")
    detailed_desc = data.get("detailed_description")

    if short_desc and detailed_desc:
        await d1.execute(
            """UPDATE products
               SET short_description = ?,
                   description = ?
               WHERE id = ?""",
            short_desc, detailed_desc, pid
        )

    await d1.execute(
        "UPDATE ai_generated_content SET status = 'applied' WHERE id = ?", draft_id
    )

    return {"status": "applied", "product_id": pid, "message": "Product catalog updated successfully."}


# --- Promotion Intelligence Endpoints ---

@router.post("/promotions/recommend")
async def recommend_promotion(
    payload: PromotionRecommendRequest,
    d1: D1Database = Depends(get_d1),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Generates a margin-safe promotional discount concept."""
    try:
        return await promotion_intelligence.recommend_promotion(
            d1=d1,
            product_id=payload.product_id,
            category_id=payload.category_id,
            campaign_goal=payload.campaign_goal,
            min_margin_percent=payload.min_margin_percent,
            admin_id=current_admin["id"]
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/promotions")
async def list_promotions(
    d1: D1Database = Depends(get_d1),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Lists all AI promotional recommendations and their statuses."""
    await ensure_ai_tables(d1)
    return await d1.fetch_all("SELECT * FROM ai_promotions ORDER BY created_at DESC LIMIT 50")


@router.post("/promotions/approve/{id}")
async def approve_promotion(
    id: int,
    d1: D1Database = Depends(get_d1),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Approves and publishes an AI promotion to the live coupons table."""
    try:
        return await promotion_intelligence.approve_and_publish_promotion(
            d1=d1, promo_id=id, admin_id=current_admin["id"]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- Conversational Business Intelligence Assistant ---

@router.post("/assistant/chat")
async def assistant_chat(
    payload: AssistantChatRequest,
    d1: D1Database = Depends(get_d1),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Executive conversational assistant with multi-turn memory and intent classification."""
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    try:
        return await bi_assistant.ask(
            d1=d1,
            question=payload.question.strip(),
            conversation_history=payload.conversation_history,
            admin_id=current_admin["id"]
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/pricing/suggest-offers")
async def suggest_pricing_offers(
    payload: PricingOfferRequest,
    d1: D1Database = Depends(get_d1),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """
    Deterministic margin-safe offer engine.
    Calculates exact prices, discounts, and gross margins ensuring min_margin_percent floor.
    """
    sp = round(float(payload.selling_price), 2)
    if sp <= 0:
        raise HTTPException(status_code=400, detail="Selling price must be greater than 0.")
    
    mrp = round(float(payload.mrp), 2) if payload.mrp and payload.mrp > sp else round(sp * 1.15, 2)
    cost = round(float(payload.cost_price), 2) if payload.cost_price and payload.cost_price > 0 else round(sp * 0.65, 2)
    min_margin = float(payload.min_margin_percent or 18.0)

    tiers = [
        {
            "id": "everyday",
            "name": "Everyday Value Saver",
            "target_pct": 6.0,
            "badge": "High Margin",
            "rationale": "Slight price incentive to drive daily cart additions while protecting peak gross margin."
        },
        {
            "id": "volume",
            "name": "Family Pack / Volume Saver",
            "target_pct": 12.0,
            "badge": "Popular",
            "rationale": "Encourages multi-pack or repeat customer orders with an attractive household discount."
        },
        {
            "id": "festival",
            "name": "Harvest Festival Special",
            "target_pct": 18.0,
            "badge": "Festive Deal",
            "rationale": "High-conversion promotional pricing calibrated strictly to the minimum permissible profit margin."
        }
    ]

    offers = []
    for tier in tiers:
        target_pct = tier["target_pct"]
        raw_discount = round(sp * (target_pct / 100.0), 2)
        candidate_price = round(sp - raw_discount, 2)

        current_margin = round(((candidate_price - cost) / candidate_price) * 100.0, 1) if candidate_price > 0 else 0.0

        if current_margin < min_margin and cost > 0:
            candidate_price = round(cost / (1.0 - (min_margin / 100.0)), 2)
            if candidate_price > sp:
                candidate_price = sp
            raw_discount = max(0.0, round(sp - candidate_price, 2))
            current_margin = round(((candidate_price - cost) / candidate_price) * 100.0, 1) if candidate_price > 0 else 0.0

        actual_discount_pct = round((raw_discount / sp) * 100.0, 1) if sp > 0 else 0.0

        offers.append({
            "id": tier["id"],
            "name": tier["name"],
            "badge": tier["badge"],
            "original_price": sp,
            "mrp": mrp,
            "offer_price": candidate_price,
            "discount_amount": raw_discount,
            "discount_percent": actual_discount_pct,
            "cost_price": cost,
            "gross_margin_percent": current_margin,
            "is_margin_safe": current_margin >= min_margin,
            "rationale": tier["rationale"]
        })

    return {
        "product_name": payload.product_name,
        "selling_price": sp,
        "mrp": mrp,
        "cost_price": cost,
        "min_margin_percent": min_margin,
        "offers": offers
    }


@router.post("/images/validate-import")
async def validate_image_import(
    payload: ImageUrlImportRequest,
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """
    Validates external image URL with SSRF protection and checks format/size.
    Accepts: JPG, PNG, WebP, GIF (max 5MB).
    """
    url = payload.image_url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="Image URL is required.")
    
    if not is_safe_image_url(url):
        raise HTTPException(status_code=400, detail="Invalid or unsafe image URL. Private IP addresses and local endpoints are forbidden.")

    try:
        status_code, headers, size_bytes = await http_client.fetch_head_or_get(url, timeout_seconds=8.0)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch image: {str(e)}")

    if status_code not in (200, 206):
        raise HTTPException(status_code=400, detail=f"Image server responded with HTTP {status_code}.")

    content_type = headers.get("content-type", "").lower()
    valid_types = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]
    if not any(t in content_type for t in valid_types) and not any(url.lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp", ".gif"]):
        raise HTTPException(status_code=400, detail=f"URL does not point to a valid image format. Received Content-Type: '{content_type}'.")

    max_bytes = 5 * 1024 * 1024
    if size_bytes > max_bytes:
        raise HTTPException(status_code=400, detail=f"Image size exceeds maximum allowed 5MB limit.")

    size_kb = round(size_bytes / 1024.0, 1) if size_bytes > 0 else 0

    return {
        "valid": True,
        "image_url": url,
        "content_type": content_type or "image/jpeg",
        "size_kb": size_kb,
        "message": "Image verified successfully."
    }


@router.post("/categories/suggest")
async def suggest_category(
    payload: CategorySuggestRequest,
    d1: D1Database = Depends(get_d1),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Generates rich description, short summary, slug, and SEO metadata for a category."""
    cat_name = payload.category_name.strip()
    if not cat_name:
        raise HTTPException(status_code=400, detail="Category name cannot be empty.")

    prompt = f"""Generate marketing copy and SEO for an organic grocery category:
Category Name: {cat_name}
Brand: Sri Adithya Organics (Traditional wood-pressed oils & natural farm produce)

Respond ONLY with a JSON object in this exact schema:
{{
    "description": "2-3 informative sentences describing this category, traditional production, and purity",
    "short_summary": "1 punchy summary sentence for header card",
    "slug": "kebab-case-slug",
    "seo_title": "SEO title under 60 chars",
    "seo_description": "Meta description under 155 chars",
    "keywords": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}}
"""
    try:
        res = await ai_router.route_request(
            d1=d1,
            task_type="category_generator",
            prompt=prompt,
            system_prompt="You are a senior organic food ecommerce specialist. Output strictly valid JSON.",
            json_mode=True,
            admin_id=current_admin["id"]
        )
        from backend.app.ai.content_studio import _safe_json_loads
        data = _safe_json_loads(res["content"])
        data["provider"] = res["provider"]
        data["model"] = res["model"]
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/assistant/system-overview")
async def get_system_overview(
    d1: D1Database = Depends(get_d1),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Direct API endpoint returning complete application details, database metrics, logistics, and AI telemetry."""
    try:
        return await bi_assistant.get_application_overview(d1)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


# --- Action Approvals Queue ---

@router.get("/approvals")
async def get_pending_approvals(
    d1: D1Database = Depends(get_d1),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Lists pending sensitive action proposals awaiting administrator approval."""
    await ensure_ai_tables(d1)
    return await action_approvals.list_pending_approvals(d1)


@router.post("/approvals/propose/stock")
async def propose_stock(
    payload: StockApprovalProposalRequest,
    d1: D1Database = Depends(get_d1),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Proposes a stock adjustment with diff preview."""
    try:
        return await action_approvals.propose_stock_adjustment(
            d1=d1,
            product_id=payload.product_id,
            variant_id=payload.variant_id,
            delta=payload.delta,
            reason=payload.reason,
            admin_id=current_admin["id"]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/approvals/propose/price")
async def propose_price(
    payload: PriceApprovalProposalRequest,
    d1: D1Database = Depends(get_d1),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Proposes a retail price change with diff preview."""
    try:
        return await action_approvals.propose_price_update(
            d1=d1,
            product_id=payload.product_id,
            variant_id=payload.variant_id,
            new_price=payload.new_price,
            reason=payload.reason,
            admin_id=current_admin["id"]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/approvals/{id}/resolve")
async def resolve_approval(
    id: int,
    payload: ApprovalResolveRequest,
    request: Request,
    d1: D1Database = Depends(get_d1),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Approves or rejects an action proposal and executes it if approved."""
    client_ip = request.client.host if request.client else "unknown"
    try:
        return await action_approvals.resolve_approval(
            d1=d1,
            approval_id=id,
            approved=payload.approved,
            admin_id=current_admin["id"],
            ip_address=client_ip
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
