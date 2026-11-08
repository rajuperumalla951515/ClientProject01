"""
Sri Adithya Organics — AI Content Studio Engine
Generates brand-aligned titles, descriptions, SEO metadata, and bilingual (English/Telugu)
harvest copy, strictly preserving data safety with draft saves.
"""
import json
from typing import Dict, Any, List, Optional
from backend.app.ai.router import ai_router

ORGANIC_BRAND_SYSTEM_PROMPT = """You are the Senior Organic Product Copywriter for Sri Adithya Organics.
Brand Core: Traditional Wood-Pressed Oils, Cold-Pressed Kachi Ghani Oils, Heirloom Millets,
Desi Cow A2 Ghee, Raw Forest Honey, and Certified Chemical-Free Farm Produce.
Tone: Warm, authentic, premium, trustworthy, traditional, health-conscious, and informative.
Strict Guidelines:
1. NEVER invent medical cure claims or false certifications.
2. Highlight artisanal methods: wood-churned (Marachekku / Vaagai wood), single-origin, stone-ground, raw unpasteurized.
3. Keep SEO titles within 60 characters and meta descriptions within 155-160 characters.
4. Output strictly valid JSON without markdown wrapping when JSON format is requested.
"""

def _safe_json_loads(content: Any) -> Dict[str, Any]:
    if isinstance(content, dict):
        return content
    cleaned = str(content).strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except Exception:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(cleaned[start:end+1])
        raise

class ContentStudio:

    @classmethod
    async def generate_titles(
        cls, d1, product_name: str, category_name: str, unit: str = "", admin_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Generates title variations and SEO titles for organic produce."""
        prompt = f"""Generate product titles for Sri Adithya Organics:
Product Base: {product_name}
Category: {category_name}
Unit/Size: {unit}

Respond ONLY with a JSON object in this exact schema:
{{
    "primary_title": "Full descriptive title",
    "short_title": "Clean concise title (max 40 chars)",
    "seo_title": "SEO optimized title (max 60 chars)",
    "alternatives": ["Title option 1", "Title option 2", "Title option 3"],
    "traditional_name": "Regional/traditional name suggestion (e.g. Marachekku / Kachi Ghani)"
}}
"""
        res = await ai_router.route_request(
            d1=d1,
            task_type="title_generator",
            prompt=prompt,
            system_prompt=ORGANIC_BRAND_SYSTEM_PROMPT,
            json_mode=True,
            admin_id=admin_id
        )
        data = _safe_json_loads(res["content"])
        data["provider"] = res["provider"]
        data["model"] = res["model"]
        return data

    @classmethod
    async def generate_description(
        cls,
        d1,
        product_name: str,
        category_name: str,
        features: Optional[str] = None,
        verified_ingredients: Optional[str] = None,
        verified_storage: Optional[str] = None,
        admin_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Generates comprehensive product descriptions, highlights, and FAQs."""
        prompt = f"""Generate full product catalog copy for:
Product: {product_name}
Category: {category_name}
Special features/notes: {features or 'Pure, unadulterated traditional harvesting'}
Verified Ingredients: {verified_ingredients or '100% pure single ingredient, no additives'}
Storage notes: {verified_storage or 'Store in cool dry place away from direct sunlight'}

Respond ONLY with a JSON object in this exact schema:
{{
    "short_description": "1-2 sentence compelling summary for product card",
    "detailed_description": "2-3 informative paragraphs highlighting traditional extraction/farming",
    "highlights": ["Highlight bullet 1", "Highlight bullet 2", "Highlight bullet 3", "Highlight bullet 4"],
    "usage_instructions": "Culinary or daily wellness usage recommendations",
    "storage_instructions": "Storage and shelf-life guidance",
    "packaging_details": "Eco-friendly packaging information",
    "faqs": [
        {{"question": "FAQ 1?", "answer": "Answer 1"}},
        {{"question": "FAQ 2?", "answer": "Answer 2"}},
        {{"question": "FAQ 3?", "answer": "Answer 3"}}
    ]
}}
"""
        res = await ai_router.route_request(
            d1=d1,
            task_type="description_generator",
            prompt=prompt,
            system_prompt=ORGANIC_BRAND_SYSTEM_PROMPT,
            json_mode=True,
            admin_id=admin_id
        )
        data = _safe_json_loads(res["content"])
        data["provider"] = res["provider"]
        data["model"] = res["model"]
        return data

    @classmethod
    async def generate_seo(
        cls, d1, product_name: str, category_name: str, description_summary: str, admin_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Generates SEO metadata, meta tags, and organic search keywords."""
        prompt = f"""Generate search engine optimization (SEO) metadata for:
Product: {product_name}
Category: {category_name}
Summary: {description_summary}

Respond ONLY with a JSON object in this exact schema:
{{
    "meta_title": "SEO title under 60 characters with brand name",
    "meta_description": "Actionable meta description between 140 and 155 characters",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6"],
    "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
    "slug_suggestion": "seo-friendly-url-slug"
}}
"""
        res = await ai_router.route_request(
            d1=d1,
            task_type="seo_generator",
            prompt=prompt,
            system_prompt=ORGANIC_BRAND_SYSTEM_PROMPT,
            json_mode=True,
            admin_id=admin_id
        )
        data = _safe_json_loads(res["content"])
        data["provider"] = res["provider"]
        data["model"] = res["model"]
        return data

    @classmethod
    async def transform_content(
        cls,
        d1,
        content: str,
        mode: str,
        product_name: Optional[str] = None,
        admin_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Transforms existing text:
        Modes: 'rewrite', 'grammar', 'concise', 'expand', 'telugu', 'bilingual'
        """
        instructions = {
            "rewrite": "Rewrite this organic product text to sound more authentic, premium, and appetizing.",
            "grammar": "Correct all grammar, phrasing, and punctuation while preserving original meaning.",
            "concise": "Make this text concise and punchy for mobile ecommerce checkout cards.",
            "expand": "Expand this text with rich culinary, nutritional, and traditional farm harvesting context.",
            "telugu": "Translate this organic product description into authentic, natural, respectful Telugu script (తెలుగు).",
            "bilingual": "Produce a dual-language presentation: first English, followed by authentic Telugu (తెలుగు) translation."
        }

        instr = instructions.get(mode, "Improve this text for an organic grocery catalog.")
        prompt = f"""Task: {instr}
Target Product: {product_name or 'Organic Produce'}
Input Content:
{content}

Respond ONLY with a JSON object in this exact schema:
{{
    "transformed_text": "The updated output content",
    "mode": "{mode}",
    "notes": "Brief 1-sentence note of what was enhanced"
}}
"""
        res = await ai_router.route_request(
            d1=d1,
            task_type=f"transform_{mode}",
            prompt=prompt,
            system_prompt=ORGANIC_BRAND_SYSTEM_PROMPT,
            json_mode=True,
            admin_id=admin_id
        )
        data = _safe_json_loads(res["content"])
        data["provider"] = res["provider"]
        data["model"] = res["model"]
        return data

    @classmethod
    async def generate_bulk_batch(
        cls,
        d1,
        product_ids: List[int],
        admin_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Processes selected products in a bounded batch (max 5 per call).
        Saves drafts into `ai_generated_content` table.
        NEVER overwrites published products directly!
        """
        results: List[Dict[str, Any]] = []
        safe_ids = product_ids[:5]  # Enforce bounded concurrency to respect free-tier quotas

        for pid in safe_ids:
            try:
                prod = await d1.fetch_one(
                    """SELECT p.*, c.name as category_name
                       FROM products p
                       LEFT JOIN categories c ON p.category_id = c.id
                       WHERE p.id = ?""",
                    pid
                )
                if not prod:
                    continue

                p_name = prod["name"]
                c_name = prod.get("category_name", "Organic Produce")

                # Generate description package
                gen_data = await cls.generate_description(
                    d1=d1,
                    product_name=p_name,
                    category_name=c_name,
                    features=prod.get("short_description"),
                    admin_id=admin_id
                )

                # Save as draft in ai_generated_content
                content_json = json.dumps(gen_data)
                now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

                draft_id = await d1.execute_insert(
                    """INSERT INTO ai_generated_content (
                        product_id, task_type, generated_content_json, provider, model,
                        status, created_by, created_at
                    ) VALUES (?, 'bulk_package', ?, ?, ?, 'draft', ?, ?)""",
                    pid, content_json, gen_data.get("provider", ""), gen_data.get("model", ""),
                    admin_id, now_str
                )

                results.append({
                    "product_id": pid,
                    "product_name": p_name,
                    "draft_id": draft_id,
                    "status": "draft_saved",
                    "preview": gen_data.get("short_description", "")
                })

            except Exception as e:
                results.append({
                    "product_id": pid,
                    "status": "failed",
                    "error": str(e)
                })

        return results

content_studio = ContentStudio()
