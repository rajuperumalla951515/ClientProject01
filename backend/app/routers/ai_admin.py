"""
Sri Adithya Organics — AI Administration API Router
Exposes secure, authenticated admin endpoints for:
1. Provider Health & Zero-Cost Quota Monitoring
2. AI Content Studio (Titles, Descriptions, SEO, Bilingual Telugu)
3. Promotion Intelligence & Margin Guardrails
4. Conversational Business Intelligence Assistant
5. Two-Step Action Approval Workflows
"""
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Request, status
from backend.app.d1 import D1Database, get_d1
from backend.app.deps import get_current_admin
from backend.app.ai.config import ai_config
from backend.app.ai.router import ai_router
from backend.app.ai.content_studio import content_studio
from backend.app.ai.promotions import promotion_intelligence
from backend.app.ai.assistant import bi_assistant
from backend.app.ai.approvals import action_approvals
from backend.app.ai_migrations import ensure_ai_tables

router = APIRouter(prefix="/ai", tags=["AI Administration"])

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
    """Executive conversational assistant backed strictly by parameterized D1 tools."""
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    try:
        return await bi_assistant.ask(
            d1=d1, question=payload.question.strip(), admin_id=current_admin["id"]
        )
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
