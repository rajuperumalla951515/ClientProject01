"""
Sri Adithya Organics — Smart Product Recognition & Categorization Engine
Intelligently recognizes product context (bakery, oils, grains, honey, pickles, spices, etc.)
and suggests context-appropriate categories, units, packaging, storage, and SEO copy.
Strictly zero-cost, with multi-model failover and fast heuristic safety fallback.
"""
import re
import json
from typing import Dict, Any, List, Optional
from backend.app.ai.router import ai_router
from backend.app.ai.content_studio import _safe_json_loads

# Curated domain knowledge for organic ecommerce products
PRODUCT_DOMAIN_RULES = [
    {
        "keywords": ["cake", "plum cake", "pastry", "muffin", "cookie", "biscuit", "bakery", "bread", "bun", "brownie"],
        "product_type": "Bakery / Confectionery",
        "category_slug_hint": "bakery-confectionery",
        "category_name_hint": "Bakery & Confectionery",
        "suggested_units": ["500 g Box", "250 g Box", "1 kg Box", "1 Piece"],
        "default_unit": "500 g Box",
        "packaging": "Food-Grade Cake Box",
        "veg_classification": "Vegetarian",
        "storage_instructions": "Store in a cool, dry place. Keep in an airtight container after opening; consume within 7-10 days.",
        "shelf_life": "7-10 Days",
        "certifications": "100% Natural & Preservative-Free",
    },
    {
        "keywords": ["oil", "groundnut oil", "sesame oil", "gingelly oil", "coconut oil", "mustard oil", "sunflower oil", "castor oil", "deepam oil", "kachi ghani", "wood pressed", "cold pressed"],
        "product_type": "Wood-Pressed Edible Oil",
        "category_slug_hint": "wood-pressed-oils",
        "category_name_hint": "Wood-Pressed Oils",
        "suggested_units": ["1 Litre Bottle", "500 ml Bottle", "5 Litre Tin"],
        "default_unit": "1 Litre Bottle",
        "packaging": "Recyclable Bottle / Tin",
        "veg_classification": "Vegetarian / Vegan",
        "storage_instructions": "Store in a cool, dark place away from direct heat and sunlight. Seal lid tightly after each use.",
        "shelf_life": "6 Months",
        "certifications": "100% Traditional Wood-Pressed (Marachekku)",
    },
    {
        "keywords": ["rice", "sona masoori", "basmati", "black rice", "brown rice", "red rice", "millet", "ragi", "foxtail", "jowar", "bajra", "wheat", "grain"],
        "product_type": "Heirloom Grains & Millets",
        "category_slug_hint": "millets-grains",
        "category_name_hint": "Millets & Grains",
        "suggested_units": ["1 kg Bag", "5 kg Bag", "25 kg Bag"],
        "default_unit": "1 kg Bag",
        "packaging": "Eco-Friendly Cloth / Jute Bag",
        "veg_classification": "Vegetarian / Vegan",
        "storage_instructions": "Store in an airtight container in a cool, dry place away from moisture and pests.",
        "shelf_life": "12 Months",
        "certifications": "100% Unpolished & Pesticide-Free",
    },
    {
        "keywords": ["honey", "raw honey", "wild honey", "forest honey", "neem honey", "acacia honey"],
        "product_type": "Raw Forest Honey",
        "category_slug_hint": "forest-honey",
        "category_name_hint": "Forest Honey",
        "suggested_units": ["500 g Glass Jar", "250 g Glass Jar", "1 kg Glass Jar"],
        "default_unit": "500 g Glass Jar",
        "packaging": "Food-Grade Glass Jar",
        "veg_classification": "Vegetarian",
        "storage_instructions": "Store at room temperature in a dry place. Do not refrigerate. Crystallization is natural in pure raw honey.",
        "shelf_life": "18 Months",
        "certifications": "100% Raw Unpasteurized Forest Honey",
    },
    {
        "keywords": ["pickle", "achar", "pachadi", "mango pickle", "lemon pickle", "gongura", "tomato pickle", "garlic pickle", "chutney"],
        "product_type": "Traditional Pickles & Chutneys",
        "category_slug_hint": "traditional-pickles",
        "category_name_hint": "Traditional Pickles",
        "suggested_units": ["300 g Glass Jar", "500 g Glass Jar", "1 kg Jar"],
        "default_unit": "300 g Glass Jar",
        "packaging": "Airtight Glass Jar",
        "veg_classification": "Vegetarian",
        "storage_instructions": "Store in a cool, dry place. Always use a clean, dry spoon. Refrigerate after opening for extended freshness.",
        "shelf_life": "9 Months",
        "certifications": "Handmade in Cold-Pressed Sesame Oil, Zero Chemical Preservatives",
    },
    {
        "keywords": ["ghee", "a2 ghee", "cow ghee", "desi ghee", "bilona ghee"],
        "product_type": "Desi Cow A2 Ghee",
        "category_slug_hint": "dairy-ghee",
        "category_name_hint": "Desi Cow Ghee",
        "suggested_units": ["500 ml Glass Jar", "1 Litre Tin", "250 ml Glass Jar"],
        "default_unit": "500 ml Glass Jar",
        "packaging": "Glass Jar / Traditional Tin",
        "veg_classification": "Vegetarian",
        "storage_instructions": "Store in an airtight jar in a cool, dry place at room temperature. Keep away from moisture.",
        "shelf_life": "12 Months",
        "certifications": "Traditional Bilona Churned A2 Cow Ghee",
    },
    {
        "keywords": ["spice", "turmeric", "haldi", "chilli", "mirchi", "coriander", "dhaniya", "cumin", "jeera", "pepper", "clove", "cardamom", "masala", "cinnamon"],
        "product_type": "Pure Spices & Masalas",
        "category_slug_hint": "spices-masalas",
        "category_name_hint": "Spices & Masalas",
        "suggested_units": ["100 g Pouch", "250 g Pouch", "500 g Pouch"],
        "default_unit": "100 g Pouch",
        "packaging": "Resealable Zipper Pouch",
        "veg_classification": "Vegetarian / Vegan",
        "storage_instructions": "Store in an airtight container in a cool, dark and dry place to retain natural aroma and essential oils.",
        "shelf_life": "12 Months",
        "certifications": "100% Pure, Unadulterated & Stone-Ground",
    },
    {
        "keywords": ["dal", "pulse", "toor dal", "moong dal", "chana dal", "urad dal", "rajma", "chickpeas", "lentils"],
        "product_type": "Organic Pulses & Dals",
        "category_slug_hint": "pulses-dals",
        "category_name_hint": "Pulses & Dals",
        "suggested_units": ["500 g Bag", "1 kg Bag", "2 kg Bag"],
        "default_unit": "1 kg Bag",
        "packaging": "Eco-Friendly Pouch / Cloth Bag",
        "veg_classification": "Vegetarian / Vegan",
        "storage_instructions": "Store in an airtight container in a dry place. Keep protected from moisture and insects.",
        "shelf_life": "12 Months",
        "certifications": "100% Organic Unpolished Dals",
    },
    {
        "keywords": ["almond", "badam", "cashew", "kaju", "walnut", "pista", "raisin", "kishmish", "fig", "anjeer", "dates", "dry fruits", "chia", "flax", "seeds"],
        "product_type": "Dry Fruits, Nuts & Seeds",
        "category_slug_hint": "dry-fruits-nuts",
        "category_name_hint": "Dry Fruits & Nuts",
        "suggested_units": ["250 g Pouch", "500 g Pouch", "1 kg Box"],
        "default_unit": "250 g Pouch",
        "packaging": "Vacuum Sealed Airtight Pouch",
        "veg_classification": "Vegetarian / Vegan",
        "storage_instructions": "Store in an airtight container in a cool, dry place. Refrigeration preserves crispness and natural oils.",
        "shelf_life": "9 Months",
        "certifications": "100% Natural, Grade A Premium",
    }
]

DEFAULT_FALLBACK_RULE = {
    "product_type": "Natural Farm Produce",
    "category_slug_hint": "general-organics",
    "category_name_hint": "Organic Groceries",
    "suggested_units": ["500 g Pack", "1 kg Pack", "Standard Pack", "1 Piece"],
    "default_unit": "Standard Pack",
    "packaging": "Eco-Friendly Packaging",
    "veg_classification": "Vegetarian",
    "storage_instructions": "Store in a cool, dry place away from direct sunlight.",
    "shelf_life": "6 Months",
    "certifications": "100% Natural & Chemical-Free",
}

def find_heuristic_profile(product_name: str) -> Dict[str, Any]:
    """Matches product name against domain knowledge profiles."""
    p_lower = product_name.lower()
    for rule in PRODUCT_DOMAIN_RULES:
        for kw in rule["keywords"]:
            # Match whole words or clean boundaries
            if re.search(rf"\b{re.escape(kw)}\b", p_lower):
                return rule
    return DEFAULT_FALLBACK_RULE

def match_existing_category(
    product_name: str,
    heuristic_profile: Dict[str, Any],
    existing_categories: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Checks if an existing category in D1 matches the product context.
    Returns matched category dict or None.
    """
    p_lower = product_name.lower()
    hint_slug = heuristic_profile.get("category_slug_hint", "")
    hint_name = heuristic_profile.get("category_name_hint", "").lower()

    # 1. Exact or strong slug match
    for cat in existing_categories:
        c_slug = cat.get("slug", "").lower()
        c_name = cat.get("name", "").lower()
        if c_slug == hint_slug or hint_slug in c_slug:
            return {"category_matched": True, "category": cat}
        if hint_name in c_name or c_name in hint_name:
            return {"category_matched": True, "category": cat}

    # 2. Check if product name explicitly mentions an existing category name
    for cat in existing_categories:
        c_name = cat.get("name", "").lower()
        # strip common suffixes like "s" or "products"
        core = re.sub(r"\b(products|organics|and|&)\b", "", c_name).strip()
        if len(core) >= 4 and core in p_lower:
            return {"category_matched": True, "category": cat}

    # 3. Not matched in current database
    return {
        "category_matched": False,
        "suggested_category_name": heuristic_profile["category_name_hint"],
        "suggested_category_slug": heuristic_profile["category_slug_hint"],
    }

class ProductRecognitionEngine:

    @classmethod
    async def recognize(
        cls,
        product_name: str,
        existing_categories: List[Dict[str, Any]],
        d1 = None,
        admin_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Intelligently recognizes product type, unit options, packaging, storage,
        and matches or suggests categories. Zero-cost with graceful failover.
        """
        clean_name = product_name.strip()
        if not clean_name:
            raise ValueError("Product name cannot be empty.")

        # 1. Evaluate baseline heuristic domain knowledge
        heuristic = find_heuristic_profile(clean_name)
        cat_match_info = match_existing_category(clean_name, heuristic, existing_categories)

        # Baseline response generated instantly
        clean_slug = re.sub(r'[^a-z0-9]+', '-', clean_name.lower()).strip('-')
        seo_title = f"{clean_name} | Sri Adithya Organics"[:60]
        meta_desc = f"Buy pure {clean_name} from Sri Adithya Organics. Authentic, chemical-free, farm fresh quality with doorstep delivery."[:155]

        base_result: Dict[str, Any] = {
            "product_name": clean_name,
            "product_type": heuristic["product_type"],
            "suggested_unit": heuristic["default_unit"],
            "suggested_units": heuristic["suggested_units"],
            "suggested_packaging": heuristic["packaging"],
            "veg_classification": heuristic["veg_classification"],
            "storage_instructions": heuristic["storage_instructions"],
            "shelf_life": heuristic["shelf_life"],
            "suggested_brand": "Sri Adithya Organics",
            "suggested_certifications": heuristic["certifications"],
            "short_description": f"Pure and authentic {clean_name}, prepared following traditional natural standards without artificial chemicals or preservatives.",
            "detailed_description": f"Sri Adithya Organics brings you premium {clean_name}, ethically sourced and prepared with traditional care. Packed fresh to retain natural nutrients, aroma, and rich authentic taste.",
            "highlights": [
                f"100% Pure & Authentic {clean_name}",
                "No artificial preservatives, additives, or synthetic colors",
                "Carefully packed for hygienic delivery and maximum freshness",
                "Directly supported by sustainable organic farm practices"
            ],
            "seo_title": seo_title,
            "meta_description": meta_desc,
            "keywords": [clean_name.lower(), "organic", "pure", "traditional", heuristic["product_type"].lower()],
            "category_matched": cat_match_info.get("category_matched", False),
            "matched_category": cat_match_info.get("category"),
            "suggested_category_name": cat_match_info.get("suggested_category_name"),
            "suggested_category_slug": cat_match_info.get("suggested_category_slug"),
            "source": "heuristic_baseline"
        }

        # 2. If D1 and AI Router are available, attempt multi-model AI enhancement
        if d1 is not None:
            try:
                category_names = [c.get("name", "") for c in existing_categories if c.get("name")]
                cats_context = ", ".join(category_names) if category_names else "None currently in database"

                prompt = f"""Analyze this organic grocery product for Sri Adithya Organics:
Product Name: "{clean_name}"
Existing Store Categories: [{cats_context}]

Task:
1. Identify product type (e.g. Bakery / Food, Wood-Pressed Edible Oil, Heirloom Grains, Raw Honey, Pickles).
2. Check if one of the Existing Store Categories matches. If yes, name it. If no existing category matches, suggest a new category name and slug.
3. Determine appropriate packaging container (e.g. Cake Box, Glass Bottle, Glass Jar, Cloth Bag, Pouch) and appropriate unit options (e.g. 500 g Box, 1 Litre Bottle, 1 kg Bag).
4. Provide factual, food-grade storage instructions and realistic shelf-life.
5. Generate an appetizing, brand-aligned short summary, detailed description, 4 highlights, SEO title (<=60 chars), meta description (<=155 chars), and keywords.
STRICT ACCURACY: Never invent unverified ingredients, medical cures, or certifications.

Respond ONLY with valid JSON in this exact schema:
{{
    "product_type": "string",
    "matching_category_name": "string or null if not found in existing categories",
    "suggested_category_name": "string if not found",
    "suggested_category_slug": "kebab-case-slug",
    "suggested_unit": "string",
    "suggested_units": ["unit1", "unit2", "unit3"],
    "packaging": "string",
    "veg_classification": "Vegetarian",
    "storage_instructions": "string",
    "shelf_life": "string",
    "short_description": "1-2 concise sentences",
    "detailed_description": "1 rich paragraph",
    "highlights": ["point 1", "point 2", "point 3", "point 4"],
    "seo_title": "string under 60 chars",
    "meta_description": "string under 155 chars",
    "keywords": ["tag1", "tag2", "tag3", "tag4"]
}}"""

                ai_res = await ai_router.route_request(
                    d1=d1,
                    task_type="product_recognition",
                    prompt=prompt,
                    system_prompt="You are a senior organic food ecommerce specialist. Output strictly valid JSON.",
                    json_mode=True,
                    admin_id=admin_id
                )

                parsed = _safe_json_loads(ai_res.get("content", "{}"))

                # Reconcile AI response with existing categories
                ai_match_name = (parsed.get("matching_category_name") or "").strip().lower()
                matched_cat = None
                if ai_match_name and ai_match_name != "null" and ai_match_name != "none":
                    for cat in existing_categories:
                        if cat.get("name", "").lower() == ai_match_name or ai_match_name in cat.get("name", "").lower():
                            matched_cat = cat
                            break

                # If LLM didn't match an existing cat, verify if our heuristic matched one
                if not matched_cat and cat_match_info.get("category_matched"):
                    matched_cat = cat_match_info.get("category")

                is_matched = matched_cat is not None

                # Merge AI enriched copy over baseline
                base_result.update({
                    "product_type": parsed.get("product_type") or base_result["product_type"],
                    "suggested_unit": parsed.get("suggested_unit") or base_result["suggested_unit"],
                    "suggested_units": parsed.get("suggested_units") or base_result["suggested_units"],
                    "suggested_packaging": parsed.get("packaging") or base_result["suggested_packaging"],
                    "veg_classification": parsed.get("veg_classification") or base_result["veg_classification"],
                    "storage_instructions": parsed.get("storage_instructions") or base_result["storage_instructions"],
                    "shelf_life": parsed.get("shelf_life") or base_result["shelf_life"],
                    "short_description": parsed.get("short_description") or base_result["short_description"],
                    "detailed_description": parsed.get("detailed_description") or base_result["detailed_description"],
                    "highlights": parsed.get("highlights") or base_result["highlights"],
                    "seo_title": parsed.get("seo_title") or base_result["seo_title"],
                    "meta_description": parsed.get("meta_description") or base_result["meta_description"],
                    "keywords": parsed.get("keywords") or base_result["keywords"],
                    "category_matched": is_matched,
                    "matched_category": matched_cat,
                    "suggested_category_name": parsed.get("suggested_category_name") or cat_match_info.get("suggested_category_name"),
                    "suggested_category_slug": parsed.get("suggested_category_slug") or cat_match_info.get("suggested_category_slug"),
                    "source": f"ai_enriched ({ai_res.get('provider')}/{ai_res.get('model')})"
                })
            except Exception:
                # If LLM failed or timed out, heuristic baseline is 100% valid and preserved!
                pass

        return base_result

product_recognition = ProductRecognitionEngine()
