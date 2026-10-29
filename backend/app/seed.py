import json
import datetime
from sqlalchemy.orm import Session
from backend.app.database import engine, Base, SessionLocal
from backend.app.models import (
    User, Address, Category, Product, ProductVariant, ProductImage, DeliverySetting, Order, OrderItem
)
from backend.app.security import get_password_hash

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded with products
        if db.query(Product).count() > 0:
            print("Database already contains seed products.")
            return

        print("Seeding Sri Adithya Organics database with authentic catalogue...")

        # 1. Delivery & Store Settings
        settings = DeliverySetting(
            min_order_amount=99.0,
            free_delivery_threshold=499.0,
            standard_delivery_fee=39.0,
            express_delivery_fee=59.0,
            active_slots_json=json.dumps([
                "Express Delivery (15-30 Mins)",
                "Morning Harvest Slot (7:00 AM - 9:30 AM)",
                "Evening Slot (5:30 PM - 8:00 PM)",
                "Tomorrow Morning (7:00 AM - 9:30 AM)"
            ]),
            announcement_text="Sri Adithya Organics • 100% Pure Wood-Pressed Oils & Certified Organic Produce • Free Delivery over ₹499"
        )
        db.add(settings)

        # 2. Users (Admin + Customer)
        admin = db.query(User).filter(User.email == "admin@sriadithyaorganics.com").first()
        if not admin:
            admin = User(
                name="Sri Adithya Admin",
                email="admin@sriadithyaorganics.com",
                hashed_password=get_password_hash("admin123"),
                phone="+91 98765 43210",
                role="admin",
                is_active=True
            )
            db.add(admin)

        customer = db.query(User).filter(User.email == "arjun.sharma@example.com").first()
        if not customer:
            customer = User(
                name="Arjun Sharma",
                email="arjun.sharma@example.com",
                hashed_password=get_password_hash("customer123"),
                phone="+91 98450 12345",
                role="customer",
                is_active=True
            )
            db.add(customer)
        db.flush()

        # Customer Addresses
        addr1 = Address(
            user_id=customer.id,
            label="Home",
            recipient_name="Arjun Sharma",
            phone="+91 98450 12345",
            street="Flat 402, Green Glen Orchards, 100ft Road",
            apartment="Tower B",
            landmark="Near Sony World Signal, 12th Main",
            city="Bengaluru",
            state="Karnataka",
            postal_code="560038",
            is_default=True
        )
        addr2 = Address(
            user_id=customer.id,
            label="Work",
            recipient_name="Arjun Sharma",
            phone="+91 98450 12345",
            street="Floor 5, Innovate Workspaces, Embassy GolfLinks",
            apartment="Block 3B",
            landmark="Off Intermediate Ring Road",
            city="Bengaluru",
            state="Karnataka",
            postal_code="560071",
            is_default=False
        )
        db.add_all([addr1, addr2])

        # 3. Categories
        categories_data = [
            {
                "name": "Fresh Vegetables",
                "slug": "fresh-vegetables",
                "description": "Daily harvested farm-fresh organic vegetables grown without synthetic chemicals.",
                "image_url": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=600",
                "icon": "Carrot",
                "display_order": 1
            },
            {
                "name": "Fresh Fruits",
                "slug": "fresh-fruits",
                "description": "Tree-ripened, naturally sweet organic fruits bursting with authentic seasonal flavor.",
                "image_url": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&q=80&w=600",
                "icon": "Apple",
                "display_order": 2
            },
            {
                "name": "Organic Rice & Millets",
                "slug": "rice-millets",
                "description": "Ancient heirloom varieties, unpolished indigenous rice, and nutrient-dense millets.",
                "image_url": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600",
                "icon": "Wheat",
                "display_order": 3
            },
            {
                "name": "Pulses & Lentils",
                "slug": "pulses-lentils",
                "description": "Unpolished, chemical-free native dals naturally high in digestible plant protein.",
                "image_url": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600",
                "icon": "Soup",
                "display_order": 4
            },
            {
                "name": "Cold-Pressed Oils",
                "slug": "cold-pressed-oils",
                "description": "Wood-churned (Kachi Ghani) pure unfiltered oils retaining natural aromas and nutrients.",
                "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=600",
                "icon": "Droplet",
                "display_order": 5
            },
            {
                "name": "Dairy & Alternatives",
                "slug": "dairy-alternatives",
                "description": "Grass-fed A2 Gir cow ghee, organic farm milk, and artisanal almond/oat mylks.",
                "image_url": "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=600",
                "icon": "Milk",
                "display_order": 6
            },
            {
                "name": "Natural Sweeteners",
                "slug": "natural-sweeteners",
                "description": "Raw unpasteurized forest honey, organic unrefined jaggery, and coconut flower sugar.",
                "image_url": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=600",
                "icon": "Sparkles",
                "display_order": 7
            },
            {
                "name": "Healthy Snacks",
                "slug": "healthy-snacks",
                "description": "Wholesome roasted seeds, sun-dried organic nuts, and guilt-free millet crisps.",
                "image_url": "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=600",
                "icon": "Cookie",
                "display_order": 8
            },
            {
                "name": "Spices & Herbs",
                "slug": "spices-herbs",
                "description": "Single-origin aromatic spices from Wayanad and organic herbs rich in essential oils.",
                "image_url": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600",
                "icon": "Flame",
                "display_order": 9
            },
            {
                "name": "Organic Pantry Essentials",
                "slug": "pantry-essentials",
                "description": "Stone-ground whole wheat flours, raw rock salts, and whole grain organic pastas.",
                "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600",
                "icon": "Utensils",
                "display_order": 10
            }
        ]

        cat_map = {}
        for cdata in categories_data:
            existing_cat = db.query(Category).filter(Category.slug == cdata["slug"]).first()
            if existing_cat:
                cat_map[cdata["slug"]] = existing_cat.id
            else:
                cat = Category(**cdata)
                db.add(cat)
                db.flush()
                cat_map[cdata["slug"]] = cat.id

        # 4. Realistic Organic Products Catalogue
        products_data = [
            # Fresh Vegetables
            {
                "name": "Organic Desi Tomatoes",
                "slug": "organic-desi-tomatoes",
                "category_slug": "fresh-vegetables",
                "short_description": "Naturally ripened heritage country tomatoes with balanced acidity.",
                "description": "Hand-picked country tomatoes grown in living soil without chemical pesticides. Rich in lycopene and vitamin C, these tart and flavorful tomatoes make rich gravies, rasam, and fresh salads.",
                "origin_farm": "Malur Natural Farming Cluster, Karnataka",
                "certifications": "Jaivik Bharat & NPOP Certified",
                "storage_instructions": "Store at cool room temperature away from direct sunlight. Refrigerate only once fully ripe.",
                "is_featured": True, "is_fresh_today": True, "is_best_seller": True, "is_deal": False,
                "images": ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "500g", "price": 42.0, "mrp": 55.0, "stock": 45, "is_default": True},
                    {"unit": "1 kg", "price": 78.0, "mrp": 105.0, "stock": 30, "is_default": False}
                ]
            },
            {
                "name": "Farm Fresh Organic Spinach (Palak)",
                "slug": "organic-palak-spinach",
                "category_slug": "fresh-vegetables",
                "short_description": "Crisp green tender leaves harvested early this morning.",
                "description": "Unsprayed, tender green spinach leaves harvested at daybreak. Cleaned with purified water and packed in breathable eco-bags to preserve crispness and vital iron content.",
                "origin_farm": "Doddaballapur Organic Farms, Karnataka",
                "certifications": "Jaivik Bharat Certified Organic",
                "storage_instructions": "Wrap in a dry cotton cloth or paper towel and store in the vegetable crisper drawer.",
                "is_featured": True, "is_fresh_today": True, "is_best_seller": True, "is_deal": False,
                "images": ["https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "250g bunch", "price": 32.0, "mrp": 45.0, "stock": 40, "is_default": True},
                    {"unit": "500g bunch", "price": 58.0, "mrp": 80.0, "stock": 25, "is_default": False}
                ]
            },
            {
                "name": "Crunchy Organic Carrots (Ooty)",
                "slug": "organic-ooty-carrots",
                "category_slug": "fresh-vegetables",
                "short_description": "Sweet, vibrant orange root carrots grown in high-altitude volcanic soil.",
                "description": "Sourced straight from terraced hills in Ooty. Sweet, crunchy and loaded with beta-carotene, perfect for fresh juicing, salads, or traditional halwa.",
                "origin_farm": "Nilgiris Regenerative Co-op, Ooty",
                "certifications": "NPOP & PGS-India Certified",
                "storage_instructions": "Snip green tops before refrigerating in a perforated bag.",
                "is_featured": False, "is_fresh_today": True, "is_best_seller": False, "is_deal": True,
                "images": ["https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "500g", "price": 54.0, "mrp": 70.0, "stock": 50, "is_default": True},
                    {"unit": "1 kg", "price": 98.0, "mrp": 135.0, "stock": 35, "is_default": False}
                ]
            },
            {
                "name": "Fresh Organic English Cucumbers",
                "slug": "organic-english-cucumbers",
                "category_slug": "fresh-vegetables",
                "short_description": "Thin-skinned, seedless and refreshing green cucumbers.",
                "description": "Polyhouse grown without systemic insecticides. Hydrating, crisp, and never bitter.",
                "origin_farm": "Chikkaballapur Green Collective",
                "certifications": "Jaivik Bharat Certified",
                "storage_instructions": "Refrigerate in vegetable drawer.",
                "is_featured": False, "is_fresh_today": True, "is_best_seller": False, "is_deal": False,
                "images": ["https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "500g", "price": 45.0, "mrp": 60.0, "stock": 30, "is_default": True}
                ]
            },

            # Fresh Fruits
            {
                "name": "Naturally Ripened Robusta Bananas",
                "slug": "organic-robusta-bananas",
                "category_slug": "fresh-fruits",
                "short_description": "Chemical carbide-free bananas naturally ripened with ambient chamber care.",
                "description": "Sweet, potassium-dense bananas grown organically in the Cauvery basin. Zero calcium carbide or ethylene dipping used; gently cured using natural airflow.",
                "origin_farm": "Cauvery Delta Eco Farmers, Tiruchirappalli",
                "certifications": "Jaivik Bharat Certified",
                "storage_instructions": "Keep at room temperature away from direct sun. Do not refrigerate.",
                "is_featured": True, "is_fresh_today": True, "is_best_seller": True, "is_deal": False,
                "images": ["https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "500g (3-4 pcs)", "price": 48.0, "mrp": 65.0, "stock": 60, "is_default": True},
                    {"unit": "1 kg (7-8 pcs)", "price": 89.0, "mrp": 120.0, "stock": 40, "is_default": False}
                ]
            },
            {
                "name": "Crisp Royal Gala Organic Apples",
                "slug": "organic-royal-gala-apples",
                "category_slug": "fresh-fruits",
                "short_description": "Unwaxed, fragrant and juicy apples from Kinnaur high-altitude orchards.",
                "description": "Tree-ripened organic apples harvested from pesticide-free orchards at 8,000 feet in Himachal Pradesh. Free from paraffin wax coatings.",
                "origin_farm": "Kinnaur High-Altitude Organic Orchards, HP",
                "certifications": "NPOP & Demeter Biodynamic",
                "storage_instructions": "Store in the refrigerator to preserve crunch for up to 3 weeks.",
                "is_featured": True, "is_fresh_today": False, "is_best_seller": True, "is_deal": True,
                "images": ["https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "4 pcs (approx 600g)", "price": 185.0, "mrp": 240.0, "stock": 35, "is_default": True},
                    {"unit": "1 kg pack", "price": 295.0, "mrp": 380.0, "stock": 25, "is_default": False}
                ]
            },
            {
                "name": "Sun-Kissed Organic Sweet Papaya",
                "slug": "organic-sweet-papaya",
                "category_slug": "fresh-fruits",
                "short_description": "Sweet orange flesh rich in papain enzymes and Vitamin A.",
                "description": "Naturally tree-ripened non-GMO red lady papaya. Melt-in-the-mouth sweet and smooth.",
                "origin_farm": "Hassan Bio-Farm, Karnataka",
                "certifications": "Jaivik Bharat Certified",
                "storage_instructions": "Ripen at room temperature; slice and chill once tender.",
                "is_featured": False, "is_fresh_today": True, "is_best_seller": False, "is_deal": False,
                "images": ["https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "1 piece (800g - 1kg)", "price": 79.0, "mrp": 110.0, "stock": 25, "is_default": True}
                ]
            },

            # Organic Rice & Millets
            {
                "name": "Unpolished Brown Sona Masoori Rice",
                "slug": "unpolished-brown-sona-masoori-rice",
                "category_slug": "rice-millets",
                "short_description": "Single-origin unpolished rice with natural bran and prebiotic fiber.",
                "description": "Nutrient-dense single origin medium-grain rice. 100% whole grain with intact bran layer, giving it a delicious nutty flavor and low glycemic index.",
                "origin_farm": "Tungabhadra River Basin Co-op, Raichur",
                "certifications": "Jaivik Bharat & USDA Organic",
                "storage_instructions": "Store in an airtight container in a dry, cool pantry.",
                "is_featured": True, "is_fresh_today": False, "is_best_seller": True, "is_deal": False,
                "images": ["https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "1 kg", "price": 125.0, "mrp": 160.0, "stock": 80, "is_default": True},
                    {"unit": "5 kg bag", "price": 575.0, "mrp": 750.0, "stock": 40, "is_default": False}
                ]
            },
            {
                "name": "Ancient Foxtail Millet (Navane)",
                "slug": "organic-foxtail-millet",
                "category_slug": "rice-millets",
                "short_description": "Naturally gluten-free golden grain loaded with iron and low GI carbohydrates.",
                "description": "Drought-resilient heirloom millet farmed by indigenous tribal federations. Great healthy alternative to white rice for upma, khichdi, and idli batters.",
                "origin_farm": "Dryland Farming Collective, Bellary",
                "certifications": "PGS-India Certified Organic",
                "storage_instructions": "Keep sealed in a cool glass or steel tin.",
                "is_featured": False, "is_fresh_today": False, "is_best_seller": False, "is_deal": True,
                "images": ["https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "500g", "price": 68.0, "mrp": 90.0, "stock": 50, "is_default": True},
                    {"unit": "1 kg", "price": 128.0, "mrp": 170.0, "stock": 35, "is_default": False}
                ]
            },

            # Pulses & Lentils
            {
                "name": "Unpolished Organic Toor Dal",
                "slug": "organic-unpolished-toor-dal",
                "category_slug": "pulses-lentils",
                "short_description": "Pure arhar dal without chemical polish, artificial colors or oil coatings.",
                "description": "Traditional split pigeon peas sourced from rainfed organic soil in Gulbarga. High in plant protein and easy to digest, cooks into silky, aromatic sambar and dal tadka.",
                "origin_farm": "Kalaburagi Pulses Growers Federation",
                "certifications": "Jaivik Bharat & NPOP Verified",
                "storage_instructions": "Keep in an airtight jar with a neem leaf or clove to preserve freshness.",
                "is_featured": True, "is_fresh_today": False, "is_best_seller": True, "is_deal": False,
                "images": ["https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "500g", "price": 115.0, "mrp": 145.0, "stock": 70, "is_default": True},
                    {"unit": "1 kg", "price": 219.0, "mrp": 280.0, "stock": 50, "is_default": False}
                ]
            },
            {
                "name": "Whole Green Organic Moong",
                "slug": "organic-green-moong-whole",
                "category_slug": "pulses-lentils",
                "short_description": "Premium whole mung beans ideal for nutritious everyday sprouting.",
                "description": "Clean, unpolished whole green gram with high germination rate. Sprout overnight for living salads or cook slow with ginger and cumin.",
                "origin_farm": "Vidarbha Organic Soil Initiative",
                "certifications": "NPOP Certified Organic",
                "storage_instructions": "Store dry in a sealed glass container.",
                "is_featured": False, "is_fresh_today": False, "is_best_seller": False, "is_deal": False,
                "images": ["https://images.unsplash.com/photo-1585994192701-f1a505c817ea?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "500g", "price": 95.0, "mrp": 120.0, "stock": 55, "is_default": True},
                    {"unit": "1 kg", "price": 180.0, "mrp": 235.0, "stock": 40, "is_default": False}
                ]
            },

            # Cold-Pressed Oils
            {
                "name": "Sri Adithya Wood-Pressed Pure Groundnut Oil (Marachekku)",
                "slug": "wood-pressed-groundnut-oil",
                "category_slug": "cold-pressed-oils",
                "short_description": "Authentic wooden ghani pressed golden oil from organic sun-dried native peanuts.",
                "description": "Extracted at low temperatures below 40°C in traditional wooden presses (vaagai wood). Unrefined, zero solvents, chemical-free, and rich in natural vitamin E, phytosterols, and natural roasted peanut fragrance.",
                "origin_farm": "Sri Adithya Organics Farm & Extraction Mill, Tamil Nadu",
                "certifications": "Jaivik Bharat, FSSAI & NPOP Certified Organic",
                "storage_instructions": "Store in a cool dark place away from heat. Keep tightly sealed.",
                "is_featured": True, "is_fresh_today": False, "is_best_seller": True, "is_deal": False,
                "images": [
                    "/products/sri-adithya-wood-pressed-groundnut-oil.jpg",
                    "/products/sri-adithya-peanut-oil-pour.jpg"
                ],
                "variants": [
                    {"unit": "1 Litre Bottle", "price": 380.0, "mrp": 460.0, "stock": 50, "is_default": True},
                    {"unit": "500 ml Bottle", "price": 205.0, "mrp": 250.0, "stock": 35, "is_default": False},
                    {"unit": "5 Litre Family Can", "price": 1820.0, "mrp": 2250.0, "stock": 20, "is_default": False}
                ]
            },
            {
                "name": "Sri Adithya Wood-Pressed Pure Sesame (Gingelly) Oil",
                "slug": "wood-pressed-sesame-oil",
                "category_slug": "cold-pressed-oils",
                "short_description": "Traditional wooden chekku extracted black sesame oil crushed with organic palm jaggery.",
                "description": "Extracted using heirloom black sesame seeds and pure organic palm jaggery in traditional stone/wood ghanis. Unfiltered and rich in antioxidants (sesamol and sesamin). Perfect for traditional South Indian seasoning, dosa roasting, and oil pulling.",
                "origin_farm": "Sri Adithya Organic Farmer Collective",
                "certifications": "Jaivik Bharat & NPOP Organic Certified",
                "storage_instructions": "Store in amber glass or stainless container away from sunlight.",
                "is_featured": True, "is_fresh_today": False, "is_best_seller": True, "is_deal": False,
                "images": ["https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "1 Litre Bottle", "price": 440.0, "mrp": 520.0, "stock": 40, "is_default": True},
                    {"unit": "500 ml Bottle", "price": 235.0, "mrp": 280.0, "stock": 30, "is_default": False}
                ]
            },
            {
                "name": "Sri Adithya Wood-Pressed Kachi Ghani Mustard Oil",
                "slug": "wood-pressed-mustard-oil",
                "category_slug": "cold-pressed-oils",
                "short_description": "Pungent, cold-pressed raw yellow & black mustard seeds with high smoke point.",
                "description": "True cold-pressed mustard oil with a robust natural pungency and deep amber color. Zero argemone oil, chemical refining or heat treatment.",
                "origin_farm": "Sri Adithya Rajasthan Organic Partner Hub",
                "certifications": "Jaivik Bharat & AGMARK Grade-1",
                "storage_instructions": "Keep in airtight bottle at room temperature.",
                "is_featured": False, "is_fresh_today": False, "is_best_seller": False, "is_deal": True,
                "images": ["https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "1 Litre Bottle", "price": 260.0, "mrp": 310.0, "stock": 40, "is_default": True}
                ]
            },
            {
                "name": "Cold-Pressed Virgin Coconut Oil",
                "slug": "cold-pressed-virgin-coconut-oil",
                "category_slug": "cold-pressed-oils",
                "short_description": "Wet-milled pure virgin oil from fresh organic coconuts.",
                "description": "Made from fresh wet coconut milk, not dried copra. Crystal clear, light, and naturally rich in Medium Chain Triglycerides (MCTs) and lauric acid.",
                "origin_farm": "Pollachi Coconut Groves, Tamil Nadu",
                "certifications": "USDA Organic & Jaivik Bharat",
                "storage_instructions": "May solidify below 24°C, which is normal for pure coconut oil.",
                "is_featured": False, "is_fresh_today": False, "is_best_seller": False, "is_deal": True,
                "images": ["https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "500 ml Glass Jar", "price": 290.0, "mrp": 375.0, "stock": 40, "is_default": True}
                ]
            },

            # Dairy & Alternatives
            {
                "name": "Bilona Cultured A2 Desi Cow Ghee",
                "slug": "bilona-cultured-a2-ghee",
                "category_slug": "dairy-alternatives",
                "short_description": "Hand-churned from curd made of grass-fed Gir and Hallikar cow milk.",
                "description": "Crafted following the Vedic Bilona method: fresh milk is boiled over firewood, set into whole curd, hand-churned in wooden pots, and clarified slowly to produce golden, granular ghee with an intoxicating aroma.",
                "origin_farm": "Giri Gomata Sanrakshan Sanctuary, Tumkur",
                "certifications": "Lab Tested 100% Pure A2 Beta-Casein",
                "storage_instructions": "Store in a cool dry cabinet. Use a dry spoon.",
                "is_featured": True, "is_fresh_today": False, "is_best_seller": True, "is_deal": False,
                "images": ["https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "500 ml Glass Jar", "price": 890.0, "mrp": 1150.0, "stock": 35, "is_default": True},
                    {"unit": "1 Litre Glass Jar", "price": 1699.0, "mrp": 2200.0, "stock": 20, "is_default": False}
                ]
            },
            {
                "name": "Artisanal Unsweetened Almond Milk",
                "slug": "artisanal-unsweetened-almond-milk",
                "category_slug": "dairy-alternatives",
                "short_description": "Freshly pressed almond mylk with zero preservatives or gums.",
                "description": "Made with 18% whole Mamra almonds and alkaline water. No thickeners, carrageenan, or added sugars.",
                "origin_farm": "Sri Adithya Organic Kitchen, Bengaluru",
                "certifications": "100% Plant-Based Certified",
                "storage_instructions": "Keep refrigerated at 2-4°C. Consume within 5 days of opening.",
                "is_featured": False, "is_fresh_today": True, "is_best_seller": False, "is_deal": False,
                "images": ["https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "1 Litre Bottle", "price": 240.0, "mrp": 290.0, "stock": 25, "is_default": True}
                ]
            },

            # Natural Sweeteners
            {
                "name": "Raw Wild Forest Honey (Unpasteurized)",
                "slug": "raw-wild-forest-honey",
                "category_slug": "natural-sweeteners",
                "short_description": "Single-origin raw floral honey gathered ethically by forest tribes.",
                "description": "Unheated and coarse-filtered to preserve active pollen, royal jelly, and live enzymes. Gathered from the bio-diverse forest flowers of the Western Ghats without harming bee colonies.",
                "origin_farm": "Western Ghats Tribal Cooperative, Wayanad",
                "certifications": "FSSAI Organic & NMR Tested (100% Pure)",
                "storage_instructions": "Store at room temperature. Natural crystallization indicates raw purity.",
                "is_featured": True, "is_fresh_today": False, "is_best_seller": True, "is_deal": True,
                "images": ["https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "500g Glass Jar", "price": 385.0, "mrp": 490.0, "stock": 50, "is_default": True},
                    {"unit": "1 kg Glass Jar", "price": 720.0, "mrp": 920.0, "stock": 30, "is_default": False}
                ]
            },
            {
                "name": "Chemical-Free Organic Jaggery Powder",
                "slug": "organic-jaggery-powder",
                "category_slug": "natural-sweeteners",
                "short_description": "Traditional sugarcane gur made without chemical bleaches or baking soda.",
                "description": "Evaporated pure sugarcane juice clarified with okra plant extracts. Mineral-rich natural iron source with a caramel aroma.",
                "origin_farm": "Mandya Organic Sugarcane Collective, Karnataka",
                "certifications": "Jaivik Bharat Certified",
                "storage_instructions": "Store in an airtight ceramic or glass jar.",
                "is_featured": False, "is_fresh_today": False, "is_best_seller": False, "is_deal": False,
                "images": ["https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "500g", "price": 75.0, "mrp": 95.0, "stock": 65, "is_default": True},
                    {"unit": "1 kg", "price": 140.0, "mrp": 185.0, "stock": 45, "is_default": False}
                ]
            },

            # Healthy Snacks
            {
                "name": "Roasted Salted California Organic Almonds",
                "slug": "organic-roasted-almonds",
                "category_slug": "healthy-snacks",
                "short_description": "Slow dry-roasted nuts dusted with pink Himalayan rock salt.",
                "description": "Crunchy whole non-pareil almonds gently dry-roasted without any added seed oils. Seasoned with mineral-rich pink salt for a wholesome guilt-free snack.",
                "origin_farm": "Kashmir & Valley Organic Co-op",
                "certifications": "Certified Non-GMO & Organic",
                "storage_instructions": "Keep sealed to maintain crunch.",
                "is_featured": True, "is_fresh_today": False, "is_best_seller": True, "is_deal": False,
                "images": ["https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "200g Pouch", "price": 280.0, "mrp": 350.0, "stock": 50, "is_default": True},
                    {"unit": "500g Pack", "price": 640.0, "mrp": 820.0, "stock": 35, "is_default": False}
                ]
            },
            {
                "name": "Raw Organic Pumpkin & Chia Seeds Mix",
                "slug": "organic-pumpkin-chia-seeds-mix",
                "category_slug": "healthy-snacks",
                "short_description": "Rich in plant-based Omega-3 fatty acids, zinc, and magnesium.",
                "description": "A powerful blend of raw unroasted pumpkin pepitas, black chia, and golden flax seeds. Sprinkle over smoothie bowls, salads, or morning oats.",
                "origin_farm": "Indo-Gangetic Organic Seed Collective",
                "certifications": "Jaivik Bharat Certified",
                "storage_instructions": "Store in a cool dry cabinet.",
                "is_featured": False, "is_fresh_today": False, "is_best_seller": False, "is_deal": True,
                "images": ["https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "250g Pouch", "price": 195.0, "mrp": 260.0, "stock": 45, "is_default": True}
                ]
            },

            # Spices & Herbs
            {
                "name": "Single-Estate Wayanad Black Pepper",
                "slug": "wayanad-black-pepper",
                "category_slug": "spices-herbs",
                "short_description": "Sun-dried bold peppercorns with high piperine content and intense aroma.",
                "description": "Cultivated under shaded rainforest canopy in Wayanad, Kerala. Unbleached, large berry size with a citrusy warmth that transforms every meal.",
                "origin_farm": "Highland Spices Estate, Wayanad",
                "certifications": "Rainforest Alliance & Organic India",
                "storage_instructions": "Grind fresh just before using for maximum essential oil retention.",
                "is_featured": False, "is_fresh_today": False, "is_best_seller": True, "is_deal": False,
                "images": ["https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "100g Jar", "price": 140.0, "mrp": 180.0, "stock": 60, "is_default": True},
                    {"unit": "250g Jar", "price": 320.0, "mrp": 420.0, "stock": 40, "is_default": False}
                ]
            },
            {
                "name": "High-Curcumin Lakadong Turmeric Powder",
                "slug": "lakadong-turmeric-powder",
                "category_slug": "spices-herbs",
                "short_description": "World renowned 7%+ natural curcumin turmeric from Jaintia Hills, Meghalaya.",
                "description": "Grown in Meghalaya's mineral-rich soil by Khasi tribal farmers. Naturally deep golden-orange with unmatched therapeutic potency and zero lead chromate or artificial coloring.",
                "origin_farm": "Jaintia Hills Organic Collective, Meghalaya",
                "certifications": "GI Tagged & Jaivik Bharat Certified",
                "storage_instructions": "Keep away from moisture in an opaque ceramic or amber glass jar.",
                "is_featured": True, "is_fresh_today": False, "is_best_seller": True, "is_deal": False,
                "images": ["https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "200g Jar", "price": 160.0, "mrp": 210.0, "stock": 70, "is_default": True},
                    {"unit": "500g Jar", "price": 360.0, "mrp": 480.0, "stock": 45, "is_default": False}
                ]
            },

            # Organic Pantry Essentials
            {
                "name": "Stone-Ground Sharbati Whole Wheat Atta",
                "slug": "stone-ground-sharbati-atta",
                "category_slug": "pantry-essentials",
                "short_description": "100% whole grain slow cold-milled flour with zero maida mixing.",
                "description": "Slow-milled in traditional chakki stones to prevent heat damage to proteins and nutrients. Yields soft, golden rotis that stay tender for hours.",
                "origin_farm": "Sehore Heritage Grain Farms, Madhya Pradesh",
                "certifications": "Jaivik Bharat Certified Organic",
                "storage_instructions": "Store in an airtight drum in a cool dry area.",
                "is_featured": True, "is_fresh_today": False, "is_best_seller": True, "is_deal": False,
                "images": ["https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "5 kg Bag", "price": 360.0, "mrp": 450.0, "stock": 60, "is_default": True},
                    {"unit": "10 kg Bag", "price": 690.0, "mrp": 880.0, "stock": 35, "is_default": False}
                ]
            },
            {
                "name": "Natural Pink Himalayan Rock Salt",
                "slug": "pink-himalayan-rock-salt",
                "category_slug": "pantry-essentials",
                "short_description": "Unrefined mineral salt containing 84 natural trace minerals.",
                "description": "Mined from ancient sea salt beds. Free from microplastics, anti-caking chemicals, and bleaching agents.",
                "origin_farm": "Himalayan Mineral Salt Reserve",
                "certifications": "100% Natural Raw Mineral Grade",
                "storage_instructions": "Keep in an airtight shaker.",
                "is_featured": False, "is_fresh_today": False, "is_best_seller": False, "is_deal": False,
                "images": ["https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?auto=format&fit=crop&q=80&w=800"],
                "variants": [
                    {"unit": "1 kg Pouch", "price": 85.0, "mrp": 120.0, "stock": 90, "is_default": True}
                ]
            }
        ]

        # Insert products
        for pdata in products_data:
            cat_id = cat_map[pdata["category_slug"]]
            prod = Product(
                name=pdata["name"],
                slug=pdata["slug"],
                category_id=cat_id,
                short_description=pdata["short_description"],
                description=pdata["description"],
                origin_farm=pdata["origin_farm"],
                certifications=pdata["certifications"],
                storage_instructions=pdata["storage_instructions"],
                is_featured=pdata.get("is_featured", False),
                is_fresh_today=pdata.get("is_fresh_today", False),
                is_deal=pdata.get("is_deal", False),
                is_best_seller=pdata.get("is_best_seller", False),
                is_active=True
            )
            db.add(prod)
            db.flush()

            # Add variants
            for vdata in pdata["variants"]:
                var = ProductVariant(
                    product_id=prod.id,
                    unit=vdata["unit"],
                    price=vdata["price"],
                    mrp=vdata["mrp"],
                    stock=vdata["stock"],
                    is_default=vdata["is_default"]
                )
                db.add(var)

            # Add images
            for idx, img_url in enumerate(pdata["images"]):
                pimg = ProductImage(
                    product_id=prod.id,
                    image_url=img_url,
                    alt_text=prod.name,
                    is_primary=(idx == 0),
                    display_order=idx
                )
                db.add(pimg)

        # 5. Seed a realistic completed order for Arjun so My Orders has data right away
        db.flush()
        sample_prod = db.query(Product).filter(Product.slug == "bilona-cultured-a2-ghee").first()
        sample_var = sample_prod.variants[0]
        sample_prod2 = db.query(Product).filter(Product.slug == "organic-desi-tomatoes").first()
        sample_var2 = sample_prod2.variants[0]

        addr_snapshot = {
            "label": "Home",
            "recipient_name": customer.name,
            "phone": customer.phone,
            "street": addr1.street,
            "apartment": addr1.apartment,
            "landmark": addr1.landmark,
            "city": addr1.city,
            "state": addr1.state,
            "postal_code": addr1.postal_code
        }

        subtot = sample_var.price + sample_var2.price * 2
        order = Order(
            order_number="RO-20261025-8821",
            user_id=customer.id,
            status="delivered",
            subtotal=subtot,
            discount=240.0,
            delivery_fee=0.0,
            tax=0.0,
            total_amount=subtot,
            delivery_slot="⚡ Express Delivery (15-30 Mins)",
            delivery_address_json=json.dumps(addr_snapshot),
            payment_method="upi",
            payment_status="paid",
            payment_id="PAY-TEST-948123",
            notes="Please leave at the door with security.",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=3)
        )
        db.add(order)
        db.flush()

        item1 = OrderItem(
            order_id=order.id,
            product_id=sample_prod.id,
            variant_id=sample_var.id,
            product_name=sample_prod.name,
            variant_name=sample_var.unit,
            unit_price=sample_var.price,
            mrp=sample_var.mrp,
            quantity=1,
            total_price=sample_var.price,
            image_url="https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&q=80&w=800"
        )
        item2 = OrderItem(
            order_id=order.id,
            product_id=sample_prod2.id,
            variant_id=sample_var2.id,
            product_name=sample_prod2.name,
            variant_name=sample_var2.unit,
            unit_price=sample_var2.price,
            mrp=sample_var2.mrp,
            quantity=2,
            total_price=sample_var2.price * 2,
            image_url="https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800"
        )
        db.add_all([item1, item2])

        db.commit()
        print("Database successfully seeded with realistic organic catalogue!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

