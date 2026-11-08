"""
Sri Adithya Organics — AI Unsplash Image Curation & Retrieval Engine
Provides curated, verified, high-resolution organic farm and wood-pressed oil imagery
sourced directly from Unsplash with automatic keyword mapping and relevance scoring.
"""
from typing import List, Dict, Any, Optional

VERIFIED_UNSPLASH_CATALOG: List[Dict[str, Any]] = [
    # --- Wood-Pressed & Cold-Pressed Oils ---
    {
        "id": "photo-1474979266404-7eaacbcd87c5",
        "title": "Pure Cold-Pressed Golden Oil in Glass Carafe",
        "category": "Wood-Pressed Oils",
        "tags": ["oil", "groundnut", "peanut", "cold pressed", "wood pressed", "marachekku", "kachi ghani", "cooking oil", "pure oil", "edible oil"]
    },
    {
        "id": "photo-1526947425960-945c6e72858f",
        "title": "Virgin Cold-Pressed Coconut Oil with Fresh Coconuts",
        "category": "Wood-Pressed Oils",
        "tags": ["coconut", "coconut oil", "virgin coconut oil", "wood pressed", "marachekku", "hair oil", "edible oil"]
    },
    {
        "id": "photo-1620706857370-e1b9770e8bb1",
        "title": "Traditional Raw Mustard Oil & Seeds",
        "category": "Wood-Pressed Oils",
        "tags": ["mustard", "mustard oil", "kachi ghani", "sarson", "pungent", "wood pressed", "cooking oil"]
    },
    {
        "id": "photo-1516253593875-bd7ba052fbc5",
        "title": "Organic Sesame Seeds & Til Oil Extraction",
        "category": "Wood-Pressed Oils",
        "tags": ["sesame", "gingelly", "til", "sesame oil", "black sesame", "wood pressed", "marachekku", "seeds"]
    },
    {
        "id": "photo-1608571423902-eed4a5ad8108",
        "title": "Pure Herbal & Castor Essential Oil Dropper",
        "category": "Wood-Pressed Oils",
        "tags": ["castor", "castor oil", "herbal", "neem oil", "ayurvedic", "wellness", "hair oil"]
    },

    # --- Desi Cow Ghee & Dairy ---
    {
        "id": "photo-1589985270826-4b7bb135bc9d",
        "title": "Traditional Golden Bilona Cow Ghee & Butter",
        "category": "Dairy & Ghee",
        "tags": ["ghee", "cow ghee", "bilona", "a2 ghee", "gir cow", "desi ghee", "butter", "dairy"]
    },
    {
        "id": "photo-1528735602780-2552fd46c7af",
        "title": "Artisanal Jar of Pure Clarified Butter / Ghee",
        "category": "Dairy & Ghee",
        "tags": ["ghee", "clarified butter", "a2", "vedic ghee", "organic ghee", "dairy"]
    },
    {
        "id": "photo-1550583724-b2692b85b150",
        "title": "Farm Fresh Pure Organic Milk & Cream",
        "category": "Dairy & Ghee",
        "tags": ["milk", "dairy", "farm fresh", "organic milk", "curd", "paneer"]
    },
    {
        "id": "photo-1628088062854-d1870b4553da",
        "title": "Traditional Farm Dairy Cream in Clay Pot",
        "category": "Dairy & Ghee",
        "tags": ["curd", "buttermilk", "dairy", "clay pot", "traditional", "ghee"]
    },

    # --- Raw Forest Honey & Natural Sweeteners ---
    {
        "id": "photo-1587049352846-4a222e784d38",
        "title": "Raw Unfiltered Wild Forest Honey in Glass Jar",
        "category": "Natural Sweeteners",
        "tags": ["honey", "raw honey", "forest honey", "wild honey", "pure honey", "sweetener"]
    },
    {
        "id": "photo-1558642452-9d2a7deb7f62",
        "title": "Natural Raw Honeycomb & Dripping Nectar",
        "category": "Natural Sweeteners",
        "tags": ["honey", "honeycomb", "apiary", "bee", "nectar", "organic honey"]
    },
    {
        "id": "photo-1601004890684-d8cbf643f5f2",
        "title": "Organic Unrefined Jaggery & Palm Sugar Blocks",
        "category": "Natural Sweeteners",
        "tags": ["jaggery", "bellam", "gur", "cane sugar", "palm jaggery", "unrefined sugar"]
    },

    # --- Heirloom Millets, Grains & Unpolished Rice ---
    {
        "id": "photo-1586201375761-83865001e31c",
        "title": "Organic Unpolished Indigenous Grains & Rice",
        "category": "Rice & Millets",
        "tags": ["rice", "brown rice", "red rice", "sona masoori", "millets", "grains", "unpolished"]
    },
    {
        "id": "photo-1574323347407-f5e1ad6d020b",
        "title": "Golden Ripe Organic Wheat & Heirloom Grains",
        "category": "Rice & Millets",
        "tags": ["wheat", "atta", "grains", "harvest", "field", "millets", "ragi", "foxtail"]
    },
    {
        "id": "photo-1536304929831-ee1ca9d44906",
        "title": "Rustic Bowl of Whole Organic Millets & Seeds",
        "category": "Rice & Millets",
        "tags": ["millets", "foxtail", "ragi", "finger millet", "pearl millet", "bajra", "jowar", "sorghum"]
    },
    {
        "id": "photo-1509440159596-0249088772ff",
        "title": "Stone-Ground Whole Grain Wheat & Organic Flour",
        "category": "Rice & Millets",
        "tags": ["flour", "atta", "wheat", "stone ground", "chakki", "baking", "pantry"]
    },

    # --- Unpolished Pulses & Native Dals ---
    {
        "id": "photo-1596040033229-a9821ebd058d",
        "title": "Traditional Unpolished Lentils & Indigenous Dals",
        "category": "Pulses & Lentils",
        "tags": ["dal", "pulses", "lentils", "toor dal", "moong dal", "urad dal", "chana dal", "protein"]
    },
    {
        "id": "photo-1515543237350-b3eea1ec8082",
        "title": "Organic Chickpeas & Legumes in Natural Burlap",
        "category": "Pulses & Lentils",
        "tags": ["chickpeas", "chana", "kabuli chana", "beans", "legumes", "pulses"]
    },

    # --- Single-Origin Spices & Herbs ---
    {
        "id": "photo-1615485290382-441e4d049cb5",
        "title": "Fresh Organic Lakadong Turmeric Roots & Powder",
        "category": "Spices & Herbs",
        "tags": ["turmeric", "haldi", "lakadong", "curcumin", "spices", "herbs", "ayurvedic"]
    },
    {
        "id": "photo-1509358271058-acd22cc93898",
        "title": "Aromatic Whole Spices (Black Pepper, Cloves, Cardamom)",
        "category": "Spices & Herbs",
        "tags": ["spices", "black pepper", "cardamom", "cloves", "cinnamon", "masala", "aromatic"]
    },
    {
        "id": "photo-1543339308-43e59d6b73a6",
        "title": "Assorted Ground Organic Spices in Wooden Spoons",
        "category": "Spices & Herbs",
        "tags": ["spices", "chilli", "coriander", "cumin", "garam masala", "powder"]
    },

    # --- Farm Fresh Vegetables ---
    {
        "id": "photo-1540420773420-3366772f4999",
        "title": "Farm-Fresh Harvested Organic Vegetables Assortment",
        "category": "Fresh Vegetables",
        "tags": ["vegetables", "organic vegetables", "greens", "farm fresh", "tomatoes", "cabbage", "carrots"]
    },
    {
        "id": "photo-1592924357228-91a4daadcfea",
        "title": "Sun-Ripened Vine Organic Country Tomatoes",
        "category": "Fresh Vegetables",
        "tags": ["tomatoes", "tamata", "vegetables", "red", "farm fresh", "vine"]
    },
    {
        "id": "photo-1576045057995-568f588f82fb",
        "title": "Crisp Farm-Grown Spinach & Organic Leafy Greens",
        "category": "Fresh Vegetables",
        "tags": ["spinach", "palak", "leafy greens", "greens", "methi", "coriander", "herbs"]
    },
    {
        "id": "photo-1598170845058-32b9d6a5da37",
        "title": "Natural Organic Carrots with Fresh Tops",
        "category": "Fresh Vegetables",
        "tags": ["carrots", "root vegetables", "vegetables", "orange", "organic"]
    },

    # --- Fresh Seasonal Fruits ---
    {
        "id": "photo-1619566636858-adf3ef46400b",
        "title": "Tree-Ripened Organic Seasonal Fruits Basket",
        "category": "Fresh Fruits",
        "tags": ["fruits", "organic fruits", "seasonal", "fresh", "sweet", "vitamins"]
    },
    {
        "id": "photo-1604977042946-1eecc30f269e",
        "title": "Fresh Farm Organic Pomegranates & Berries",
        "category": "Fresh Fruits",
        "tags": ["pomegranate", "anar", "fruits", "ruby", "antioxidants", "healthy"]
    },
    {
        "id": "photo-1560806887-1e4cd0b6cbd6",
        "title": "Crisp Orchard Apples & Seasonal Harvest",
        "category": "Fresh Fruits",
        "tags": ["apples", "orchard", "fruits", "fresh", "sweet"]
    },
    {
        "id": "photo-1550258987-190a2d41a8ba",
        "title": "Tropical Organic Sweet Pineapples & Papaya",
        "category": "Fresh Fruits",
        "tags": ["pineapple", "papaya", "banana", "tropical", "fruits"]
    },

    # --- Raw Dry Fruits, Seeds & Nuts ---
    {
        "id": "photo-1599599810769-bcde5a160d32",
        "title": "Premium Assorted Sun-Dried Organic Nuts & Dry Fruits",
        "category": "Healthy Snacks",
        "tags": ["nuts", "dry fruits", "almonds", "cashews", "walnuts", "raisins", "snacks"]
    },
    {
        "id": "photo-1508061253366-f7da158b6d46",
        "title": "Single-Origin Raw California Organic Almonds (Badam)",
        "category": "Healthy Snacks",
        "tags": ["almonds", "badam", "nuts", "healthy", "snack", "protein"]
    },
    {
        "id": "photo-1514733670139-4d87a1941d55",
        "title": "Kashmiri Mountain Walnuts in Wooden Bowl",
        "category": "Healthy Snacks",
        "tags": ["walnuts", "akhrot", "nuts", "brain food", "omega 3"]
    },

    # --- Farm Landscape & Category Banners ---
    {
        "id": "photo-1500937386664-56d1dfef3854",
        "title": "Lush Green Organic Farmland & Horizon (Panorama)",
        "category": "Category Banner",
        "tags": ["farm", "field", "banner", "organic farm", "landscape", "nature", "agriculture", "panoramic"]
    },
    {
        "id": "photo-1595974482597-4b8da8879bc5",
        "title": "Morning Harvest on Traditional Eco-Farm",
        "category": "Category Banner",
        "tags": ["harvest", "banner", "farmers", "organic produce", "morning", "sunrise", "field"]
    },
    {
        "id": "photo-1464226184884-fa280b87c399",
        "title": "Golden Hour Sunlight over Rich Agricultural Fields",
        "category": "Category Banner",
        "tags": ["fields", "nature", "banner", "golden hour", "sustainability", "rural"]
    },
    {
        "id": "photo-1546069901-ba9599a7e63c",
        "title": "Wholesome Farm Bowl of Organic Harvest & Superfoods",
        "category": "Healthy Snacks",
        "tags": ["salad", "superfood", "bowl", "healthy", "wellness", "diet", "clean eating"]
    }
]

def search_unsplash_photos(
    query: str,
    category: Optional[str] = None,
    limit: int = 12
) -> List[Dict[str, Any]]:
    """
    Intelligently retrieves high-resolution Unsplash photos matching query and category.
    Scores relevance based on title, category, and semantic tags.
    """
    q_tokens = [t.lower().strip() for t in query.replace("-", " ").replace("_", " ").split() if len(t.strip()) > 1]
    cat_lower = (category or "").lower().strip()

    scored_items = []
    for item in VERIFIED_UNSPLASH_CATALOG:
        score = 0
        item_title = item["title"].lower()
        item_cat = item["category"].lower()
        item_tags = [t.lower() for t in item["tags"]]

        # Category match boost
        if cat_lower:
            if cat_lower in item_cat or item_cat in cat_lower:
                score += 15
            if "banner" in cat_lower and "banner" in item_cat:
                score += 25

        # Query token matches
        for tok in q_tokens:
            if tok in ("sri", "adithya", "organics", "traditional", "pure", "best", "and", "the", "for", "with", "item"):
                continue # Skip generic brand words

            # Exact tag match
            if tok in item_tags:
                score += 20
            # Partial tag match
            elif any(tok in tag for tag in item_tags):
                score += 10
            # Title match
            if tok in item_title:
                score += 12
            # Category match
            if tok in item_cat:
                score += 8

        # Base score to include relevant organic items if no exact token matched
        if score == 0 and not q_tokens:
            score = 1

        scored_items.append((score, item))

    # Sort descending by score
    scored_items.sort(key=lambda x: x[0], reverse=True)

    # Take top items (fallback to high quality general organic items if score is low)
    selected = []
    for score, item in scored_items:
        if len(selected) >= limit:
            break
        # Build production image URLs with auto-format, quality, and crop
        img_id = item["id"]
        selected.append({
            "id": img_id,
            "title": item["title"],
            "category": item["category"],
            "image_url": f"https://images.unsplash.com/{img_id}?auto=format&fit=crop&q=80&w=800",
            "thumbnail_url": f"https://images.unsplash.com/{img_id}?auto=format&fit=crop&q=80&w=300",
            "banner_url": f"https://images.unsplash.com/{img_id}?auto=format&fit=crop&q=80&w=1200",
            "tags": item["tags"][:5],
            "alt_text": item["title"],
            "score": score
        })

    return selected
