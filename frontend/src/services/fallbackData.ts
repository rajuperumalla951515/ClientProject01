// Sri Adithya Organics - Instant fallback catalogue when backend is sleeping or spinning up
import { Category, Product } from '../types';

export const FALLBACK_CATEGORIES: Category[] = [
  {
    "id": 1,
    "name": "Fresh Vegetables",
    "slug": "fresh-vegetables",
    "description": "Daily harvested farm-fresh organic vegetables grown without synthetic chemicals.",
    "image_url": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=600",
    "is_active": true,
    "display_order": 1,
    "product_count": 4
  },
  {
    "id": 2,
    "name": "Fresh Fruits",
    "slug": "fresh-fruits",
    "description": "Tree-ripened, naturally sweet organic fruits bursting with authentic seasonal flavor.",
    "image_url": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&q=80&w=600",
    "is_active": true,
    "display_order": 2,
    "product_count": 3
  },
  {
    "id": 3,
    "name": "Organic Rice & Millets",
    "slug": "rice-millets",
    "description": "Ancient heirloom varieties, unpolished indigenous rice, and nutrient-dense millets.",
    "image_url": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600",
    "is_active": true,
    "display_order": 3,
    "product_count": 2
  },
  {
    "id": 4,
    "name": "Pulses & Lentils",
    "slug": "pulses-lentils",
    "description": "Unpolished, chemical-free native dals naturally high in digestible plant protein.",
    "image_url": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600",
    "is_active": true,
    "display_order": 4,
    "product_count": 2
  },
  {
    "id": 5,
    "name": "Cold-Pressed Oils",
    "slug": "cold-pressed-oils",
    "description": "Wood-churned (Kachi Ghani) pure unfiltered oils retaining natural aromas and nutrients.",
    "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=600",
    "is_active": true,
    "display_order": 5,
    "product_count": 4
  },
  {
    "id": 6,
    "name": "Dairy & Alternatives",
    "slug": "dairy-alternatives",
    "description": "Grass-fed A2 Gir cow ghee, organic farm milk, and artisanal almond/oat mylks.",
    "image_url": "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=600",
    "is_active": true,
    "display_order": 6,
    "product_count": 2
  },
  {
    "id": 7,
    "name": "Natural Sweeteners",
    "slug": "natural-sweeteners",
    "description": "Raw unpasteurized forest honey, organic unrefined jaggery, and coconut flower sugar.",
    "image_url": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=600",
    "is_active": true,
    "display_order": 7,
    "product_count": 2
  },
  {
    "id": 8,
    "name": "Healthy Snacks",
    "slug": "healthy-snacks",
    "description": "Wholesome roasted seeds, sun-dried organic nuts, and guilt-free millet crisps.",
    "image_url": "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=600",
    "is_active": true,
    "display_order": 8,
    "product_count": 2
  },
  {
    "id": 9,
    "name": "Spices & Herbs",
    "slug": "spices-herbs",
    "description": "Single-origin aromatic spices from Wayanad and organic herbs rich in essential oils.",
    "image_url": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600",
    "is_active": true,
    "display_order": 9,
    "product_count": 2
  },
  {
    "id": 10,
    "name": "Organic Pantry Essentials",
    "slug": "pantry-essentials",
    "description": "Stone-ground whole wheat flours, raw rock salts, and whole grain organic pastas.",
    "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600",
    "is_active": true,
    "display_order": 10,
    "product_count": 2
  }
];

export const FALLBACK_PRODUCTS: Product[] = [
  {
    "name": "Organic Desi Tomatoes",
    "slug": "organic-desi-tomatoes",
    "category_id": 1,
    "description": "Hand-picked country tomatoes grown in living soil without chemical pesticides. Rich in lycopene and vitamin C, these tart and flavorful tomatoes make rich gravies, rasam, and fresh salads.",
    "short_description": "Naturally ripened heritage country tomatoes with balanced acidity.",
    "brand": "Rootly Organics",
    "origin_farm": "Malur Natural Farming Cluster, Karnataka",
    "certifications": "Jaivik Bharat & NPOP Certified",
    "storage_instructions": "Store at cool room temperature away from direct sunlight. Refrigerate only once fully ripe.",
    "allergens": null,
    "ingredients": null,
    "is_featured": true,
    "is_fresh_today": true,
    "is_deal": false,
    "is_best_seller": true,
    "is_active": true,
    "id": 1,
    "created_at": "2026-10-28T14:53:47.066075",
    "category": {
      "name": "Fresh Vegetables",
      "slug": "fresh-vegetables",
      "description": "Daily harvested farm-fresh organic vegetables grown without synthetic chemicals.",
      "image_url": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=600",
      "icon": "Carrot",
      "display_order": 1,
      "is_active": true,
      "id": 1,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "500g",
        "pack_size": "Standard Pack",
        "price": 42.0,
        "mrp": 55.0,
        "stock": 45,
        "sku": null,
        "is_default": true,
        "id": 1,
        "product_id": 1
      },
      {
        "unit": "1 kg",
        "pack_size": "Standard Pack",
        "price": 78.0,
        "mrp": 105.0,
        "stock": 16,
        "sku": null,
        "is_default": false,
        "id": 2,
        "product_id": 1
      }
    ],
    "images": [
      {
        "id": 1,
        "image_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Organic Desi Tomatoes",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800",
    "min_price": 42.0,
    "max_price": 78.0,
    "mrp": 55.0,
    "discount_percentage": 24,
    "in_stock": true
  },
  {
    "name": "Farm Fresh Organic Spinach (Palak)",
    "slug": "organic-palak-spinach",
    "category_id": 1,
    "description": "Unsprayed, tender green spinach leaves harvested at daybreak. Cleaned with purified water and packed in breathable eco-bags to preserve crispness and vital iron content.",
    "short_description": "Crisp green tender leaves harvested early this morning.",
    "brand": "Rootly Organics",
    "origin_farm": "Doddaballapur Organic Farms, Karnataka",
    "certifications": "Jaivik Bharat Certified Organic",
    "storage_instructions": "Wrap in a dry cotton cloth or paper towel and store in the vegetable crisper drawer.",
    "allergens": null,
    "ingredients": null,
    "is_featured": true,
    "is_fresh_today": true,
    "is_deal": false,
    "is_best_seller": true,
    "is_active": true,
    "id": 2,
    "created_at": "2026-10-28T14:53:47.066075",
    "category": {
      "name": "Fresh Vegetables",
      "slug": "fresh-vegetables",
      "description": "Daily harvested farm-fresh organic vegetables grown without synthetic chemicals.",
      "image_url": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=600",
      "icon": "Carrot",
      "display_order": 1,
      "is_active": true,
      "id": 1,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "250g bunch",
        "pack_size": "Standard Pack",
        "price": 32.0,
        "mrp": 45.0,
        "stock": 40,
        "sku": null,
        "is_default": true,
        "id": 3,
        "product_id": 2
      },
      {
        "unit": "500g bunch",
        "pack_size": "Standard Pack",
        "price": 58.0,
        "mrp": 80.0,
        "stock": 25,
        "sku": null,
        "is_default": false,
        "id": 4,
        "product_id": 2
      }
    ],
    "images": [
      {
        "id": 2,
        "image_url": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Farm Fresh Organic Spinach (Palak)",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=800",
    "min_price": 32.0,
    "max_price": 58.0,
    "mrp": 45.0,
    "discount_percentage": 29,
    "in_stock": true
  },
  {
    "name": "Crunchy Organic Carrots (Ooty)",
    "slug": "organic-ooty-carrots",
    "category_id": 1,
    "description": "Sourced straight from terraced hills in Ooty. Sweet, crunchy and loaded with beta-carotene, perfect for fresh juicing, salads, or traditional halwa.",
    "short_description": "Sweet, vibrant orange root carrots grown in high-altitude volcanic soil.",
    "brand": "Rootly Organics",
    "origin_farm": "Nilgiris Regenerative Co-op, Ooty",
    "certifications": "NPOP & PGS-India Certified",
    "storage_instructions": "Snip green tops before refrigerating in a perforated bag.",
    "allergens": null,
    "ingredients": null,
    "is_featured": false,
    "is_fresh_today": true,
    "is_deal": true,
    "is_best_seller": false,
    "is_active": true,
    "id": 3,
    "created_at": "2026-10-28T14:53:47.068587",
    "category": {
      "name": "Fresh Vegetables",
      "slug": "fresh-vegetables",
      "description": "Daily harvested farm-fresh organic vegetables grown without synthetic chemicals.",
      "image_url": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=600",
      "icon": "Carrot",
      "display_order": 1,
      "is_active": true,
      "id": 1,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "500g",
        "pack_size": "Standard Pack",
        "price": 54.0,
        "mrp": 70.0,
        "stock": 50,
        "sku": null,
        "is_default": true,
        "id": 5,
        "product_id": 3
      },
      {
        "unit": "1 kg",
        "pack_size": "Standard Pack",
        "price": 98.0,
        "mrp": 135.0,
        "stock": 35,
        "sku": null,
        "is_default": false,
        "id": 6,
        "product_id": 3
      }
    ],
    "images": [
      {
        "id": 3,
        "image_url": "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Crunchy Organic Carrots (Ooty)",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&q=80&w=800",
    "min_price": 54.0,
    "max_price": 98.0,
    "mrp": 70.0,
    "discount_percentage": 23,
    "in_stock": true
  },
  {
    "name": "Fresh Organic English Cucumbers",
    "slug": "organic-english-cucumbers",
    "category_id": 1,
    "description": "Polyhouse grown without systemic insecticides. Hydrating, crisp, and never bitter.",
    "short_description": "Thin-skinned, seedless and refreshing green cucumbers.",
    "brand": "Rootly Organics",
    "origin_farm": "Chikkaballapur Green Collective",
    "certifications": "Jaivik Bharat Certified",
    "storage_instructions": "Refrigerate in vegetable drawer.",
    "allergens": null,
    "ingredients": null,
    "is_featured": false,
    "is_fresh_today": true,
    "is_deal": false,
    "is_best_seller": false,
    "is_active": true,
    "id": 4,
    "created_at": "2026-10-28T14:53:47.068587",
    "category": {
      "name": "Fresh Vegetables",
      "slug": "fresh-vegetables",
      "description": "Daily harvested farm-fresh organic vegetables grown without synthetic chemicals.",
      "image_url": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=600",
      "icon": "Carrot",
      "display_order": 1,
      "is_active": true,
      "id": 1,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "500g",
        "pack_size": "Standard Pack",
        "price": 45.0,
        "mrp": 60.0,
        "stock": 30,
        "sku": null,
        "is_default": true,
        "id": 7,
        "product_id": 4
      }
    ],
    "images": [
      {
        "id": 4,
        "image_url": "https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Fresh Organic English Cucumbers",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&q=80&w=800",
    "min_price": 45.0,
    "max_price": 45.0,
    "mrp": 60.0,
    "discount_percentage": 25,
    "in_stock": true
  },
  {
    "name": "Naturally Ripened Robusta Bananas",
    "slug": "organic-robusta-bananas",
    "category_id": 2,
    "description": "Sweet, potassium-dense bananas grown organically in the Cauvery basin. Zero calcium carbide or ethylene dipping used; gently cured using natural airflow.",
    "short_description": "Chemical carbide-free bananas naturally ripened with ambient chamber care.",
    "brand": "Rootly Organics",
    "origin_farm": "Cauvery Delta Eco Farmers, Tiruchirappalli",
    "certifications": "Jaivik Bharat Certified",
    "storage_instructions": "Keep at room temperature away from direct sun. Do not refrigerate.",
    "allergens": null,
    "ingredients": null,
    "is_featured": true,
    "is_fresh_today": true,
    "is_deal": false,
    "is_best_seller": true,
    "is_active": true,
    "id": 5,
    "created_at": "2026-10-28T14:53:47.069591",
    "category": {
      "name": "Fresh Fruits",
      "slug": "fresh-fruits",
      "description": "Tree-ripened, naturally sweet organic fruits bursting with authentic seasonal flavor.",
      "image_url": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&q=80&w=600",
      "icon": "Apple",
      "display_order": 2,
      "is_active": true,
      "id": 2,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "500g (3-4 pcs)",
        "pack_size": "Standard Pack",
        "price": 48.0,
        "mrp": 65.0,
        "stock": 60,
        "sku": null,
        "is_default": true,
        "id": 8,
        "product_id": 5
      },
      {
        "unit": "1 kg (7-8 pcs)",
        "pack_size": "Standard Pack",
        "price": 89.0,
        "mrp": 120.0,
        "stock": 40,
        "sku": null,
        "is_default": false,
        "id": 9,
        "product_id": 5
      }
    ],
    "images": [
      {
        "id": 5,
        "image_url": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Naturally Ripened Robusta Bananas",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=800",
    "min_price": 48.0,
    "max_price": 89.0,
    "mrp": 65.0,
    "discount_percentage": 26,
    "in_stock": true
  },
  {
    "name": "Crisp Royal Gala Organic Apples",
    "slug": "organic-royal-gala-apples",
    "category_id": 2,
    "description": "Tree-ripened organic apples harvested from pesticide-free orchards at 8,000 feet in Himachal Pradesh. Free from paraffin wax coatings.",
    "short_description": "Unwaxed, fragrant and juicy apples from Kinnaur high-altitude orchards.",
    "brand": "Rootly Organics",
    "origin_farm": "Kinnaur High-Altitude Organic Orchards, HP",
    "certifications": "NPOP & Demeter Biodynamic",
    "storage_instructions": "Store in the refrigerator to preserve crunch for up to 3 weeks.",
    "allergens": null,
    "ingredients": null,
    "is_featured": true,
    "is_fresh_today": false,
    "is_deal": true,
    "is_best_seller": true,
    "is_active": true,
    "id": 6,
    "created_at": "2026-10-28T14:53:47.070589",
    "category": {
      "name": "Fresh Fruits",
      "slug": "fresh-fruits",
      "description": "Tree-ripened, naturally sweet organic fruits bursting with authentic seasonal flavor.",
      "image_url": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&q=80&w=600",
      "icon": "Apple",
      "display_order": 2,
      "is_active": true,
      "id": 2,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "4 pcs (approx 600g)",
        "pack_size": "Standard Pack",
        "price": 185.0,
        "mrp": 240.0,
        "stock": 35,
        "sku": null,
        "is_default": true,
        "id": 10,
        "product_id": 6
      },
      {
        "unit": "1 kg pack",
        "pack_size": "Standard Pack",
        "price": 295.0,
        "mrp": 380.0,
        "stock": 25,
        "sku": null,
        "is_default": false,
        "id": 11,
        "product_id": 6
      }
    ],
    "images": [
      {
        "id": 6,
        "image_url": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Crisp Royal Gala Organic Apples",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&q=80&w=800",
    "min_price": 185.0,
    "max_price": 295.0,
    "mrp": 240.0,
    "discount_percentage": 23,
    "in_stock": true
  },
  {
    "name": "Sun-Kissed Organic Sweet Papaya",
    "slug": "organic-sweet-papaya",
    "category_id": 2,
    "description": "Naturally tree-ripened non-GMO red lady papaya. Melt-in-the-mouth sweet and smooth.",
    "short_description": "Sweet orange flesh rich in papain enzymes and Vitamin A.",
    "brand": "Rootly Organics",
    "origin_farm": "Hassan Bio-Farm, Karnataka",
    "certifications": "Jaivik Bharat Certified",
    "storage_instructions": "Ripen at room temperature; slice and chill once tender.",
    "allergens": null,
    "ingredients": null,
    "is_featured": false,
    "is_fresh_today": true,
    "is_deal": false,
    "is_best_seller": false,
    "is_active": true,
    "id": 7,
    "created_at": "2026-10-28T14:53:47.070589",
    "category": {
      "name": "Fresh Fruits",
      "slug": "fresh-fruits",
      "description": "Tree-ripened, naturally sweet organic fruits bursting with authentic seasonal flavor.",
      "image_url": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&q=80&w=600",
      "icon": "Apple",
      "display_order": 2,
      "is_active": true,
      "id": 2,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "1 piece (800g - 1kg)",
        "pack_size": "Standard Pack",
        "price": 79.0,
        "mrp": 110.0,
        "stock": 25,
        "sku": null,
        "is_default": true,
        "id": 12,
        "product_id": 7
      }
    ],
    "images": [
      {
        "id": 7,
        "image_url": "https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Sun-Kissed Organic Sweet Papaya",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?auto=format&fit=crop&q=80&w=800",
    "min_price": 79.0,
    "max_price": 79.0,
    "mrp": 110.0,
    "discount_percentage": 28,
    "in_stock": true
  },
  {
    "name": "Unpolished Brown Sona Masoori Rice",
    "slug": "unpolished-brown-sona-masoori-rice",
    "category_id": 3,
    "description": "Nutrient-dense single origin medium-grain rice. 100% whole grain with intact bran layer, giving it a delicious nutty flavor and low glycemic index.",
    "short_description": "Single-origin unpolished rice with natural bran and prebiotic fiber.",
    "brand": "Rootly Organics",
    "origin_farm": "Tungabhadra River Basin Co-op, Raichur",
    "certifications": "Jaivik Bharat & USDA Organic",
    "storage_instructions": "Store in an airtight container in a dry, cool pantry.",
    "allergens": null,
    "ingredients": null,
    "is_featured": true,
    "is_fresh_today": false,
    "is_deal": false,
    "is_best_seller": true,
    "is_active": true,
    "id": 8,
    "created_at": "2026-10-28T14:53:47.071588",
    "category": {
      "name": "Organic Rice & Millets",
      "slug": "rice-millets",
      "description": "Ancient heirloom varieties, unpolished indigenous rice, and nutrient-dense millets.",
      "image_url": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600",
      "icon": "Wheat",
      "display_order": 3,
      "is_active": true,
      "id": 3,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "1 kg",
        "pack_size": "Standard Pack",
        "price": 125.0,
        "mrp": 160.0,
        "stock": 80,
        "sku": null,
        "is_default": true,
        "id": 13,
        "product_id": 8
      },
      {
        "unit": "5 kg bag",
        "pack_size": "Standard Pack",
        "price": 575.0,
        "mrp": 750.0,
        "stock": 40,
        "sku": null,
        "is_default": false,
        "id": 14,
        "product_id": 8
      }
    ],
    "images": [
      {
        "id": 8,
        "image_url": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Unpolished Brown Sona Masoori Rice",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800",
    "min_price": 125.0,
    "max_price": 575.0,
    "mrp": 160.0,
    "discount_percentage": 22,
    "in_stock": true
  },
  {
    "name": "Ancient Foxtail Millet (Navane)",
    "slug": "organic-foxtail-millet",
    "category_id": 3,
    "description": "Drought-resilient heirloom millet farmed by indigenous tribal federations. Great healthy alternative to white rice for upma, khichdi, and idli batters.",
    "short_description": "Naturally gluten-free golden grain loaded with iron and low GI carbohydrates.",
    "brand": "Rootly Organics",
    "origin_farm": "Dryland Farming Collective, Bellary",
    "certifications": "PGS-India Certified Organic",
    "storage_instructions": "Keep sealed in a cool glass or steel tin.",
    "allergens": null,
    "ingredients": null,
    "is_featured": false,
    "is_fresh_today": false,
    "is_deal": true,
    "is_best_seller": false,
    "is_active": true,
    "id": 9,
    "created_at": "2026-10-28T14:53:47.071588",
    "category": {
      "name": "Organic Rice & Millets",
      "slug": "rice-millets",
      "description": "Ancient heirloom varieties, unpolished indigenous rice, and nutrient-dense millets.",
      "image_url": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600",
      "icon": "Wheat",
      "display_order": 3,
      "is_active": true,
      "id": 3,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "500g",
        "pack_size": "Standard Pack",
        "price": 68.0,
        "mrp": 90.0,
        "stock": 50,
        "sku": null,
        "is_default": true,
        "id": 15,
        "product_id": 9
      },
      {
        "unit": "1 kg",
        "pack_size": "Standard Pack",
        "price": 128.0,
        "mrp": 170.0,
        "stock": 35,
        "sku": null,
        "is_default": false,
        "id": 16,
        "product_id": 9
      }
    ],
    "images": [
      {
        "id": 9,
        "image_url": "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Ancient Foxtail Millet (Navane)",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&q=80&w=800",
    "min_price": 68.0,
    "max_price": 128.0,
    "mrp": 90.0,
    "discount_percentage": 24,
    "in_stock": true
  },
  {
    "name": "Unpolished Organic Toor Dal",
    "slug": "organic-unpolished-toor-dal",
    "category_id": 4,
    "description": "Traditional split pigeon peas sourced from rainfed organic soil in Gulbarga. High in plant protein and easy to digest, cooks into silky, aromatic sambar and dal tadka.",
    "short_description": "Pure arhar dal without chemical polish, artificial colors or oil coatings.",
    "brand": "Rootly Organics",
    "origin_farm": "Kalaburagi Pulses Growers Federation",
    "certifications": "Jaivik Bharat & NPOP Verified",
    "storage_instructions": "Keep in an airtight jar with a neem leaf or clove to preserve freshness.",
    "allergens": null,
    "ingredients": null,
    "is_featured": true,
    "is_fresh_today": false,
    "is_deal": false,
    "is_best_seller": true,
    "is_active": true,
    "id": 10,
    "created_at": "2026-10-28T14:53:47.072589",
    "category": {
      "name": "Pulses & Lentils",
      "slug": "pulses-lentils",
      "description": "Unpolished, chemical-free native dals naturally high in digestible plant protein.",
      "image_url": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600",
      "icon": "Soup",
      "display_order": 4,
      "is_active": true,
      "id": 4,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "500g",
        "pack_size": "Standard Pack",
        "price": 115.0,
        "mrp": 145.0,
        "stock": 70,
        "sku": null,
        "is_default": true,
        "id": 17,
        "product_id": 10
      },
      {
        "unit": "1 kg",
        "pack_size": "Standard Pack",
        "price": 219.0,
        "mrp": 280.0,
        "stock": 50,
        "sku": null,
        "is_default": false,
        "id": 18,
        "product_id": 10
      }
    ],
    "images": [
      {
        "id": 10,
        "image_url": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Unpolished Organic Toor Dal",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=800",
    "min_price": 115.0,
    "max_price": 219.0,
    "mrp": 145.0,
    "discount_percentage": 21,
    "in_stock": true
  },
  {
    "name": "Whole Green Organic Moong",
    "slug": "organic-green-moong-whole",
    "category_id": 4,
    "description": "Clean, unpolished whole green gram with high germination rate. Sprout overnight for living salads or cook slow with ginger and cumin.",
    "short_description": "Premium whole mung beans ideal for nutritious everyday sprouting.",
    "brand": "Rootly Organics",
    "origin_farm": "Vidarbha Organic Soil Initiative",
    "certifications": "NPOP Certified Organic",
    "storage_instructions": "Store dry in a sealed glass container.",
    "allergens": null,
    "ingredients": null,
    "is_featured": false,
    "is_fresh_today": false,
    "is_deal": false,
    "is_best_seller": false,
    "is_active": true,
    "id": 11,
    "created_at": "2026-10-28T14:53:47.072589",
    "category": {
      "name": "Pulses & Lentils",
      "slug": "pulses-lentils",
      "description": "Unpolished, chemical-free native dals naturally high in digestible plant protein.",
      "image_url": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600",
      "icon": "Soup",
      "display_order": 4,
      "is_active": true,
      "id": 4,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "500g",
        "pack_size": "Standard Pack",
        "price": 95.0,
        "mrp": 120.0,
        "stock": 55,
        "sku": null,
        "is_default": true,
        "id": 19,
        "product_id": 11
      },
      {
        "unit": "1 kg",
        "pack_size": "Standard Pack",
        "price": 180.0,
        "mrp": 235.0,
        "stock": 40,
        "sku": null,
        "is_default": false,
        "id": 20,
        "product_id": 11
      }
    ],
    "images": [
      {
        "id": 11,
        "image_url": "https://images.unsplash.com/photo-1585994192701-f1a505c817ea?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Whole Green Organic Moong",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1585994192701-f1a505c817ea?auto=format&fit=crop&q=80&w=800",
    "min_price": 95.0,
    "max_price": 180.0,
    "mrp": 120.0,
    "discount_percentage": 21,
    "in_stock": true
  },
  {
    "name": "Sri Adithya Wood-Pressed Pure Groundnut Oil (Marachekku)",
    "slug": "wood-pressed-groundnut-oil",
    "category_id": 5,
    "description": "Extracted at low temperatures below 40\u00b0C in traditional wooden presses (vaagai wood). Unrefined, zero solvents, chemical-free, and rich in natural vitamin E, phytosterols, and natural roasted peanut fragrance.",
    "short_description": "Authentic wooden ghani pressed golden oil from organic sun-dried native peanuts.",
    "brand": "Rootly Organics",
    "origin_farm": "Sri Adithya Organics Farm & Extraction Mill, Tamil Nadu",
    "certifications": "Jaivik Bharat, FSSAI & NPOP Certified Organic",
    "storage_instructions": "Store in a cool dark place away from heat. Keep tightly sealed.",
    "allergens": null,
    "ingredients": null,
    "is_featured": true,
    "is_fresh_today": false,
    "is_deal": false,
    "is_best_seller": true,
    "is_active": true,
    "id": 12,
    "created_at": "2026-10-28T14:53:47.073589",
    "category": {
      "name": "Cold-Pressed Oils",
      "slug": "cold-pressed-oils",
      "description": "Wood-churned (Kachi Ghani) pure unfiltered oils retaining natural aromas and nutrients.",
      "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=600",
      "icon": "Droplet",
      "display_order": 5,
      "is_active": true,
      "id": 5,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "1 Litre Bottle",
        "pack_size": "Standard Pack",
        "price": 380.0,
        "mrp": 460.0,
        "stock": 21,
        "sku": null,
        "is_default": true,
        "id": 21,
        "product_id": 12
      },
      {
        "unit": "500 ml Bottle",
        "pack_size": "Standard Pack",
        "price": 205.0,
        "mrp": 250.0,
        "stock": 35,
        "sku": null,
        "is_default": false,
        "id": 22,
        "product_id": 12
      },
      {
        "unit": "5 Litre Family Can",
        "pack_size": "Standard Pack",
        "price": 1820.0,
        "mrp": 2250.0,
        "stock": 20,
        "sku": null,
        "is_default": false,
        "id": 23,
        "product_id": 12
      }
    ],
    "images": [
      {
        "id": 12,
        "image_url": "/products/sri-adithya-wood-pressed-groundnut-oil.jpg",
        "alt_text": "Sri Adithya Wood-Pressed Pure Groundnut Oil (Marachekku)",
        "is_primary": true,
        "display_order": 0
      },
      {
        "id": 13,
        "image_url": "/products/sri-adithya-peanut-oil-pour.jpg",
        "alt_text": "Sri Adithya Wood-Pressed Pure Groundnut Oil (Marachekku)",
        "is_primary": false,
        "display_order": 1
      }
    ],
    "primary_image": "/products/sri-adithya-wood-pressed-groundnut-oil.jpg",
    "min_price": 205.0,
    "max_price": 1820.0,
    "mrp": 460.0,
    "discount_percentage": 17,
    "in_stock": true
  },
  {
    "name": "Sri Adithya Wood-Pressed Pure Sesame (Gingelly) Oil",
    "slug": "wood-pressed-sesame-oil",
    "category_id": 5,
    "description": "Extracted using heirloom black sesame seeds and pure organic palm jaggery in traditional stone/wood ghanis. Unfiltered and rich in antioxidants (sesamol and sesamin). Perfect for traditional South Indian seasoning, dosa roasting, and oil pulling.",
    "short_description": "Traditional wooden chekku extracted black sesame oil crushed with organic palm jaggery.",
    "brand": "Rootly Organics",
    "origin_farm": "Sri Adithya Organic Farmer Collective",
    "certifications": "Jaivik Bharat & NPOP Organic Certified",
    "storage_instructions": "Store in amber glass or stainless container away from sunlight.",
    "allergens": null,
    "ingredients": null,
    "is_featured": true,
    "is_fresh_today": false,
    "is_deal": false,
    "is_best_seller": true,
    "is_active": true,
    "id": 13,
    "created_at": "2026-10-28T14:53:47.074589",
    "category": {
      "name": "Cold-Pressed Oils",
      "slug": "cold-pressed-oils",
      "description": "Wood-churned (Kachi Ghani) pure unfiltered oils retaining natural aromas and nutrients.",
      "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=600",
      "icon": "Droplet",
      "display_order": 5,
      "is_active": true,
      "id": 5,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "1 Litre Bottle",
        "pack_size": "Standard Pack",
        "price": 440.0,
        "mrp": 520.0,
        "stock": 38,
        "sku": null,
        "is_default": true,
        "id": 24,
        "product_id": 13
      },
      {
        "unit": "500 ml Bottle",
        "pack_size": "Standard Pack",
        "price": 235.0,
        "mrp": 280.0,
        "stock": 30,
        "sku": null,
        "is_default": false,
        "id": 25,
        "product_id": 13
      }
    ],
    "images": [
      {
        "id": 14,
        "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Sri Adithya Wood-Pressed Pure Sesame (Gingelly) Oil",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=800",
    "min_price": 235.0,
    "max_price": 440.0,
    "mrp": 520.0,
    "discount_percentage": 15,
    "in_stock": true
  },
  {
    "name": "Sri Adithya Wood-Pressed Kachi Ghani Mustard Oil",
    "slug": "wood-pressed-mustard-oil",
    "category_id": 5,
    "description": "True cold-pressed mustard oil with a robust natural pungency and deep amber color. Zero argemone oil, chemical refining or heat treatment.",
    "short_description": "Pungent, cold-pressed raw yellow & black mustard seeds with high smoke point.",
    "brand": "Rootly Organics",
    "origin_farm": "Sri Adithya Rajasthan Organic Partner Hub",
    "certifications": "Jaivik Bharat & AGMARK Grade-1",
    "storage_instructions": "Keep in airtight bottle at room temperature.",
    "allergens": null,
    "ingredients": null,
    "is_featured": false,
    "is_fresh_today": false,
    "is_deal": true,
    "is_best_seller": false,
    "is_active": true,
    "id": 14,
    "created_at": "2026-10-28T14:53:47.074589",
    "category": {
      "name": "Cold-Pressed Oils",
      "slug": "cold-pressed-oils",
      "description": "Wood-churned (Kachi Ghani) pure unfiltered oils retaining natural aromas and nutrients.",
      "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=600",
      "icon": "Droplet",
      "display_order": 5,
      "is_active": true,
      "id": 5,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "1 Litre Bottle",
        "pack_size": "Standard Pack",
        "price": 260.0,
        "mrp": 310.0,
        "stock": 40,
        "sku": null,
        "is_default": true,
        "id": 26,
        "product_id": 14
      }
    ],
    "images": [
      {
        "id": 15,
        "image_url": "https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Sri Adithya Wood-Pressed Kachi Ghani Mustard Oil",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?auto=format&fit=crop&q=80&w=800",
    "min_price": 260.0,
    "max_price": 260.0,
    "mrp": 310.0,
    "discount_percentage": 16,
    "in_stock": true
  },
  {
    "name": "Cold-Pressed Virgin Coconut Oil",
    "slug": "cold-pressed-virgin-coconut-oil",
    "category_id": 5,
    "description": "Made from fresh wet coconut milk, not dried copra. Crystal clear, light, and naturally rich in Medium Chain Triglycerides (MCTs) and lauric acid.",
    "short_description": "Wet-milled pure virgin oil from fresh organic coconuts.",
    "brand": "Rootly Organics",
    "origin_farm": "Pollachi Coconut Groves, Tamil Nadu",
    "certifications": "USDA Organic & Jaivik Bharat",
    "storage_instructions": "May solidify below 24\u00b0C, which is normal for pure coconut oil.",
    "allergens": null,
    "ingredients": null,
    "is_featured": false,
    "is_fresh_today": false,
    "is_deal": true,
    "is_best_seller": false,
    "is_active": true,
    "id": 15,
    "created_at": "2026-10-28T14:53:47.075590",
    "category": {
      "name": "Cold-Pressed Oils",
      "slug": "cold-pressed-oils",
      "description": "Wood-churned (Kachi Ghani) pure unfiltered oils retaining natural aromas and nutrients.",
      "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=600",
      "icon": "Droplet",
      "display_order": 5,
      "is_active": true,
      "id": 5,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "500 ml Glass Jar",
        "pack_size": "Standard Pack",
        "price": 290.0,
        "mrp": 375.0,
        "stock": 40,
        "sku": null,
        "is_default": true,
        "id": 27,
        "product_id": 15
      }
    ],
    "images": [
      {
        "id": 16,
        "image_url": "https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Cold-Pressed Virgin Coconut Oil",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&q=80&w=800",
    "min_price": 290.0,
    "max_price": 290.0,
    "mrp": 375.0,
    "discount_percentage": 23,
    "in_stock": true
  },
  {
    "name": "Bilona Cultured A2 Desi Cow Ghee",
    "slug": "bilona-cultured-a2-ghee",
    "category_id": 6,
    "description": "Crafted following the Vedic Bilona method: fresh milk is boiled over firewood, set into whole curd, hand-churned in wooden pots, and clarified slowly to produce golden, granular ghee with an intoxicating aroma.",
    "short_description": "Hand-churned from curd made of grass-fed Gir and Hallikar cow milk.",
    "brand": "Rootly Organics",
    "origin_farm": "Giri Gomata Sanrakshan Sanctuary, Tumkur",
    "certifications": "Lab Tested 100% Pure A2 Beta-Casein",
    "storage_instructions": "Store in a cool dry cabinet. Use a dry spoon.",
    "allergens": null,
    "ingredients": null,
    "is_featured": true,
    "is_fresh_today": false,
    "is_deal": false,
    "is_best_seller": true,
    "is_active": true,
    "id": 16,
    "created_at": "2026-10-28T14:53:47.075590",
    "category": {
      "name": "Dairy & Alternatives",
      "slug": "dairy-alternatives",
      "description": "Grass-fed A2 Gir cow ghee, organic farm milk, and artisanal almond/oat mylks.",
      "image_url": "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=600",
      "icon": "Milk",
      "display_order": 6,
      "is_active": true,
      "id": 6,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "500 ml Glass Jar",
        "pack_size": "Standard Pack",
        "price": 890.0,
        "mrp": 1150.0,
        "stock": 35,
        "sku": null,
        "is_default": true,
        "id": 28,
        "product_id": 16
      },
      {
        "unit": "1 Litre Glass Jar",
        "pack_size": "Standard Pack",
        "price": 1699.0,
        "mrp": 2200.0,
        "stock": 20,
        "sku": null,
        "is_default": false,
        "id": 29,
        "product_id": 16
      }
    ],
    "images": [
      {
        "id": 17,
        "image_url": "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Bilona Cultured A2 Desi Cow Ghee",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&q=80&w=800",
    "min_price": 890.0,
    "max_price": 1699.0,
    "mrp": 1150.0,
    "discount_percentage": 23,
    "in_stock": true
  },
  {
    "name": "Artisanal Unsweetened Almond Milk",
    "slug": "artisanal-unsweetened-almond-milk",
    "category_id": 6,
    "description": "Made with 18% whole Mamra almonds and alkaline water. No thickeners, carrageenan, or added sugars.",
    "short_description": "Freshly pressed almond mylk with zero preservatives or gums.",
    "brand": "Rootly Organics",
    "origin_farm": "Sri Adithya Organic Kitchen, Bengaluru",
    "certifications": "100% Plant-Based Certified",
    "storage_instructions": "Keep refrigerated at 2-4\u00b0C. Consume within 5 days of opening.",
    "allergens": null,
    "ingredients": null,
    "is_featured": false,
    "is_fresh_today": true,
    "is_deal": false,
    "is_best_seller": false,
    "is_active": true,
    "id": 17,
    "created_at": "2026-10-28T14:53:47.076588",
    "category": {
      "name": "Dairy & Alternatives",
      "slug": "dairy-alternatives",
      "description": "Grass-fed A2 Gir cow ghee, organic farm milk, and artisanal almond/oat mylks.",
      "image_url": "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=600",
      "icon": "Milk",
      "display_order": 6,
      "is_active": true,
      "id": 6,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "1 Litre Bottle",
        "pack_size": "Standard Pack",
        "price": 240.0,
        "mrp": 290.0,
        "stock": 25,
        "sku": null,
        "is_default": true,
        "id": 30,
        "product_id": 17
      }
    ],
    "images": [
      {
        "id": 18,
        "image_url": "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Artisanal Unsweetened Almond Milk",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=800",
    "min_price": 240.0,
    "max_price": 240.0,
    "mrp": 290.0,
    "discount_percentage": 17,
    "in_stock": true
  },
  {
    "name": "Raw Wild Forest Honey (Unpasteurized)",
    "slug": "raw-wild-forest-honey",
    "category_id": 7,
    "description": "Unheated and coarse-filtered to preserve active pollen, royal jelly, and live enzymes. Gathered from the bio-diverse forest flowers of the Western Ghats without harming bee colonies.",
    "short_description": "Single-origin raw floral honey gathered ethically by forest tribes.",
    "brand": "Rootly Organics",
    "origin_farm": "Western Ghats Tribal Cooperative, Wayanad",
    "certifications": "FSSAI Organic & NMR Tested (100% Pure)",
    "storage_instructions": "Store at room temperature. Natural crystallization indicates raw purity.",
    "allergens": null,
    "ingredients": null,
    "is_featured": true,
    "is_fresh_today": false,
    "is_deal": true,
    "is_best_seller": true,
    "is_active": true,
    "id": 18,
    "created_at": "2026-10-28T14:53:47.076588",
    "category": {
      "name": "Natural Sweeteners",
      "slug": "natural-sweeteners",
      "description": "Raw unpasteurized forest honey, organic unrefined jaggery, and coconut flower sugar.",
      "image_url": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=600",
      "icon": "Sparkles",
      "display_order": 7,
      "is_active": true,
      "id": 7,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "500g Glass Jar",
        "pack_size": "Standard Pack",
        "price": 385.0,
        "mrp": 490.0,
        "stock": 50,
        "sku": null,
        "is_default": true,
        "id": 31,
        "product_id": 18
      },
      {
        "unit": "1 kg Glass Jar",
        "pack_size": "Standard Pack",
        "price": 720.0,
        "mrp": 920.0,
        "stock": 30,
        "sku": null,
        "is_default": false,
        "id": 32,
        "product_id": 18
      }
    ],
    "images": [
      {
        "id": 19,
        "image_url": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Raw Wild Forest Honey (Unpasteurized)",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=800",
    "min_price": 385.0,
    "max_price": 720.0,
    "mrp": 490.0,
    "discount_percentage": 21,
    "in_stock": true
  },
  {
    "name": "Chemical-Free Organic Jaggery Powder",
    "slug": "organic-jaggery-powder",
    "category_id": 7,
    "description": "Evaporated pure sugarcane juice clarified with okra plant extracts. Mineral-rich natural iron source with a caramel aroma.",
    "short_description": "Traditional sugarcane gur made without chemical bleaches or baking soda.",
    "brand": "Rootly Organics",
    "origin_farm": "Mandya Organic Sugarcane Collective, Karnataka",
    "certifications": "Jaivik Bharat Certified",
    "storage_instructions": "Store in an airtight ceramic or glass jar.",
    "allergens": null,
    "ingredients": null,
    "is_featured": false,
    "is_fresh_today": false,
    "is_deal": false,
    "is_best_seller": false,
    "is_active": true,
    "id": 19,
    "created_at": "2026-10-28T14:53:47.077589",
    "category": {
      "name": "Natural Sweeteners",
      "slug": "natural-sweeteners",
      "description": "Raw unpasteurized forest honey, organic unrefined jaggery, and coconut flower sugar.",
      "image_url": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=600",
      "icon": "Sparkles",
      "display_order": 7,
      "is_active": true,
      "id": 7,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "500g",
        "pack_size": "Standard Pack",
        "price": 75.0,
        "mrp": 95.0,
        "stock": 65,
        "sku": null,
        "is_default": true,
        "id": 33,
        "product_id": 19
      },
      {
        "unit": "1 kg",
        "pack_size": "Standard Pack",
        "price": 140.0,
        "mrp": 185.0,
        "stock": 45,
        "sku": null,
        "is_default": false,
        "id": 34,
        "product_id": 19
      }
    ],
    "images": [
      {
        "id": 20,
        "image_url": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Chemical-Free Organic Jaggery Powder",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=800",
    "min_price": 75.0,
    "max_price": 140.0,
    "mrp": 95.0,
    "discount_percentage": 21,
    "in_stock": true
  },
  {
    "name": "Roasted Salted California Organic Almonds",
    "slug": "organic-roasted-almonds",
    "category_id": 8,
    "description": "Crunchy whole non-pareil almonds gently dry-roasted without any added seed oils. Seasoned with mineral-rich pink salt for a wholesome guilt-free snack.",
    "short_description": "Slow dry-roasted nuts dusted with pink Himalayan rock salt.",
    "brand": "Rootly Organics",
    "origin_farm": "Kashmir & Valley Organic Co-op",
    "certifications": "Certified Non-GMO & Organic",
    "storage_instructions": "Keep sealed to maintain crunch.",
    "allergens": null,
    "ingredients": null,
    "is_featured": true,
    "is_fresh_today": false,
    "is_deal": false,
    "is_best_seller": true,
    "is_active": true,
    "id": 20,
    "created_at": "2026-10-28T14:53:47.078587",
    "category": {
      "name": "Healthy Snacks",
      "slug": "healthy-snacks",
      "description": "Wholesome roasted seeds, sun-dried organic nuts, and guilt-free millet crisps.",
      "image_url": "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=600",
      "icon": "Cookie",
      "display_order": 8,
      "is_active": true,
      "id": 8,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "200g Pouch",
        "pack_size": "Standard Pack",
        "price": 280.0,
        "mrp": 350.0,
        "stock": 50,
        "sku": null,
        "is_default": true,
        "id": 35,
        "product_id": 20
      },
      {
        "unit": "500g Pack",
        "pack_size": "Standard Pack",
        "price": 640.0,
        "mrp": 820.0,
        "stock": 35,
        "sku": null,
        "is_default": false,
        "id": 36,
        "product_id": 20
      }
    ],
    "images": [
      {
        "id": 21,
        "image_url": "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Roasted Salted California Organic Almonds",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&q=80&w=800",
    "min_price": 280.0,
    "max_price": 640.0,
    "mrp": 350.0,
    "discount_percentage": 20,
    "in_stock": true
  },
  {
    "name": "Raw Organic Pumpkin & Chia Seeds Mix",
    "slug": "organic-pumpkin-chia-seeds-mix",
    "category_id": 8,
    "description": "A powerful blend of raw unroasted pumpkin pepitas, black chia, and golden flax seeds. Sprinkle over smoothie bowls, salads, or morning oats.",
    "short_description": "Rich in plant-based Omega-3 fatty acids, zinc, and magnesium.",
    "brand": "Rootly Organics",
    "origin_farm": "Indo-Gangetic Organic Seed Collective",
    "certifications": "Jaivik Bharat Certified",
    "storage_instructions": "Store in a cool dry cabinet.",
    "allergens": null,
    "ingredients": null,
    "is_featured": false,
    "is_fresh_today": false,
    "is_deal": true,
    "is_best_seller": false,
    "is_active": true,
    "id": 21,
    "created_at": "2026-10-28T14:53:47.078587",
    "category": {
      "name": "Healthy Snacks",
      "slug": "healthy-snacks",
      "description": "Wholesome roasted seeds, sun-dried organic nuts, and guilt-free millet crisps.",
      "image_url": "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=600",
      "icon": "Cookie",
      "display_order": 8,
      "is_active": true,
      "id": 8,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "250g Pouch",
        "pack_size": "Standard Pack",
        "price": 195.0,
        "mrp": 260.0,
        "stock": 45,
        "sku": null,
        "is_default": true,
        "id": 37,
        "product_id": 21
      }
    ],
    "images": [
      {
        "id": 22,
        "image_url": "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Raw Organic Pumpkin & Chia Seeds Mix",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=800",
    "min_price": 195.0,
    "max_price": 195.0,
    "mrp": 260.0,
    "discount_percentage": 25,
    "in_stock": true
  },
  {
    "name": "Single-Estate Wayanad Black Pepper",
    "slug": "wayanad-black-pepper",
    "category_id": 9,
    "description": "Cultivated under shaded rainforest canopy in Wayanad, Kerala. Unbleached, large berry size with a citrusy warmth that transforms every meal.",
    "short_description": "Sun-dried bold peppercorns with high piperine content and intense aroma.",
    "brand": "Rootly Organics",
    "origin_farm": "Highland Spices Estate, Wayanad",
    "certifications": "Rainforest Alliance & Organic India",
    "storage_instructions": "Grind fresh just before using for maximum essential oil retention.",
    "allergens": null,
    "ingredients": null,
    "is_featured": false,
    "is_fresh_today": false,
    "is_deal": false,
    "is_best_seller": true,
    "is_active": true,
    "id": 22,
    "created_at": "2026-10-28T14:53:47.079589",
    "category": {
      "name": "Spices & Herbs",
      "slug": "spices-herbs",
      "description": "Single-origin aromatic spices from Wayanad and organic herbs rich in essential oils.",
      "image_url": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600",
      "icon": "Flame",
      "display_order": 9,
      "is_active": true,
      "id": 9,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "100g Jar",
        "pack_size": "Standard Pack",
        "price": 140.0,
        "mrp": 180.0,
        "stock": 60,
        "sku": null,
        "is_default": true,
        "id": 38,
        "product_id": 22
      },
      {
        "unit": "250g Jar",
        "pack_size": "Standard Pack",
        "price": 320.0,
        "mrp": 420.0,
        "stock": 40,
        "sku": null,
        "is_default": false,
        "id": 39,
        "product_id": 22
      }
    ],
    "images": [
      {
        "id": 23,
        "image_url": "https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Single-Estate Wayanad Black Pepper",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&q=80&w=800",
    "min_price": 140.0,
    "max_price": 320.0,
    "mrp": 180.0,
    "discount_percentage": 22,
    "in_stock": true
  },
  {
    "name": "High-Curcumin Lakadong Turmeric Powder",
    "slug": "lakadong-turmeric-powder",
    "category_id": 9,
    "description": "Grown in Meghalaya's mineral-rich soil by Khasi tribal farmers. Naturally deep golden-orange with unmatched therapeutic potency and zero lead chromate or artificial coloring.",
    "short_description": "World renowned 7%+ natural curcumin turmeric from Jaintia Hills, Meghalaya.",
    "brand": "Rootly Organics",
    "origin_farm": "Jaintia Hills Organic Collective, Meghalaya",
    "certifications": "GI Tagged & Jaivik Bharat Certified",
    "storage_instructions": "Keep away from moisture in an opaque ceramic or amber glass jar.",
    "allergens": null,
    "ingredients": null,
    "is_featured": true,
    "is_fresh_today": false,
    "is_deal": false,
    "is_best_seller": true,
    "is_active": true,
    "id": 23,
    "created_at": "2026-10-28T14:53:47.079589",
    "category": {
      "name": "Spices & Herbs",
      "slug": "spices-herbs",
      "description": "Single-origin aromatic spices from Wayanad and organic herbs rich in essential oils.",
      "image_url": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600",
      "icon": "Flame",
      "display_order": 9,
      "is_active": true,
      "id": 9,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "200g Jar",
        "pack_size": "Standard Pack",
        "price": 160.0,
        "mrp": 210.0,
        "stock": 70,
        "sku": null,
        "is_default": true,
        "id": 40,
        "product_id": 23
      },
      {
        "unit": "500g Jar",
        "pack_size": "Standard Pack",
        "price": 360.0,
        "mrp": 480.0,
        "stock": 45,
        "sku": null,
        "is_default": false,
        "id": 41,
        "product_id": 23
      }
    ],
    "images": [
      {
        "id": 24,
        "image_url": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=800",
        "alt_text": "High-Curcumin Lakadong Turmeric Powder",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=800",
    "min_price": 160.0,
    "max_price": 360.0,
    "mrp": 210.0,
    "discount_percentage": 24,
    "in_stock": true
  },
  {
    "name": "Stone-Ground Sharbati Whole Wheat Atta",
    "slug": "stone-ground-sharbati-atta",
    "category_id": 10,
    "description": "Slow-milled in traditional chakki stones to prevent heat damage to proteins and nutrients. Yields soft, golden rotis that stay tender for hours.",
    "short_description": "100% whole grain slow cold-milled flour with zero maida mixing.",
    "brand": "Rootly Organics",
    "origin_farm": "Sehore Heritage Grain Farms, Madhya Pradesh",
    "certifications": "Jaivik Bharat Certified Organic",
    "storage_instructions": "Store in an airtight drum in a cool dry area.",
    "allergens": null,
    "ingredients": null,
    "is_featured": true,
    "is_fresh_today": false,
    "is_deal": false,
    "is_best_seller": true,
    "is_active": true,
    "id": 24,
    "created_at": "2026-10-28T14:53:47.080589",
    "category": {
      "name": "Organic Pantry Essentials",
      "slug": "pantry-essentials",
      "description": "Stone-ground whole wheat flours, raw rock salts, and whole grain organic pastas.",
      "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600",
      "icon": "Utensils",
      "display_order": 10,
      "is_active": true,
      "id": 10,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "5 kg Bag",
        "pack_size": "Standard Pack",
        "price": 360.0,
        "mrp": 450.0,
        "stock": 60,
        "sku": null,
        "is_default": true,
        "id": 42,
        "product_id": 24
      },
      {
        "unit": "10 kg Bag",
        "pack_size": "Standard Pack",
        "price": 690.0,
        "mrp": 880.0,
        "stock": 35,
        "sku": null,
        "is_default": false,
        "id": 43,
        "product_id": 24
      }
    ],
    "images": [
      {
        "id": 25,
        "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Stone-Ground Sharbati Whole Wheat Atta",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800",
    "min_price": 360.0,
    "max_price": 690.0,
    "mrp": 450.0,
    "discount_percentage": 20,
    "in_stock": true
  },
  {
    "name": "Natural Pink Himalayan Rock Salt",
    "slug": "pink-himalayan-rock-salt",
    "category_id": 10,
    "description": "Mined from ancient sea salt beds. Free from microplastics, anti-caking chemicals, and bleaching agents.",
    "short_description": "Unrefined mineral salt containing 84 natural trace minerals.",
    "brand": "Rootly Organics",
    "origin_farm": "Himalayan Mineral Salt Reserve",
    "certifications": "100% Natural Raw Mineral Grade",
    "storage_instructions": "Keep in an airtight shaker.",
    "allergens": null,
    "ingredients": null,
    "is_featured": false,
    "is_fresh_today": false,
    "is_deal": false,
    "is_best_seller": false,
    "is_active": true,
    "id": 25,
    "created_at": "2026-10-28T14:53:47.080589",
    "category": {
      "name": "Organic Pantry Essentials",
      "slug": "pantry-essentials",
      "description": "Stone-ground whole wheat flours, raw rock salts, and whole grain organic pastas.",
      "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600",
      "icon": "Utensils",
      "display_order": 10,
      "is_active": true,
      "id": 10,
      "product_count": 0
    },
    "variants": [
      {
        "unit": "1 kg Pouch",
        "pack_size": "Standard Pack",
        "price": 85.0,
        "mrp": 120.0,
        "stock": 89,
        "sku": null,
        "is_default": true,
        "id": 44,
        "product_id": 25
      }
    ],
    "images": [
      {
        "id": 26,
        "image_url": "https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?auto=format&fit=crop&q=80&w=800",
        "alt_text": "Natural Pink Himalayan Rock Salt",
        "is_primary": true,
        "display_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?auto=format&fit=crop&q=80&w=800",
    "min_price": 85.0,
    "max_price": 85.0,
    "mrp": 120.0,
    "discount_percentage": 29,
    "in_stock": true
  }
];
