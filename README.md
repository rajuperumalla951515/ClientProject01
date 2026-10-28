# Sri Adithya Organics — Traditional Wood-Pressed Oils & Organic Grocery Platform

> **100% Traditional Cold-Pressed • Certified Organic Produce • Express Delivery**  
> A production-ready, database-driven e-commerce platform combining the speed and convenience of Blinkit with original branding, authentic traditional wood-pressed oils (Marachekku), and certified organic groceries.

---

## 🌿 Brand Identity & Design System

- **Brand Name**: Sri Adithya Organics
- **Official Logo**: Circular brand emblem preserved at its exact 1:1 aspect ratio across header, mobile navigation, footer, and browser favicon (`/brand/sri-adithya-logo.png`).
- **Signature Specialty**: Traditional Wood-Pressed (Marachekku / Vaagai Wood) edible oils: Groundnut Oil, Sesame (Gingelly) Oil, Mustard Oil, and Virgin Coconut Oil extracted below 40°C with zero chemical solvents or refining.
- **Color Palette**:
  - Forest Greens (`#1B3B22`, `#264E2F`, `#142817`)
  - Warm Amber & Gold (`#D97706`, `#B45309`)
  - Sage & Mint (`#739072`, `#86A789`, `#EBF3E8`)
  - Warm Cream & Sand (`#FAF8F5`, `#F4EFE6`)
  - Earthy Terracotta (`#C86D51`)

---

## 🚀 Key Features

### 1. Geolocation & Location Detection Workflow
- **Browser Geolocation**: One-tap "Detect My Current Location" via `navigator.geolocation.getCurrentPosition()` with explicit user consent.
- **Reverse Geocoding**: Converts browser coordinates into verified Indian locality, city, and 6-digit PIN code via `/api/addresses/reverse-geocode`.
- **Live Serviceability**: Evaluates coordinates against regional fulfillment hubs (e.g. 15–30 min express delivery in Bengaluru and Coimbatore mill hub).
- **Manual Entry Fallback**: Indian PIN code lookup and saved address picker if location permission is denied.

### 2. Loading Skeletons
- Consistent shimmer loaders matching component geometry across:
  - Homepage category cards and product collection grids
  - Products page multi-column product grids
  - Product detail gallery, variant picker, and description lines
  - Search results page

### 3. Shopping Cart & Blinkit-Style Quick Commerce
- Instant **ADD** button transforming into a smooth **[-] [Qty] [+]** stepper.
- Server-side inventory limit validation preventing cart quantities from exceeding live warehouse stock.
- Live subtotal, taxes, dynamic delivery fees (Free above ₹499), and savings breakdown.
- Synchronized guest carts (`X-Session-ID`) and authenticated user carts.

### 4. Checkout & Atomic Transactions
- Multi-step checkout with address selection, delivery time slots, payment method selection (UPI, Cards, NetBanking, COD), and delivery instructions.
- Transaction-safe order creation generating unique identifiers: `SAO-YYYYMMDD-XXXX`.
- Atomic inventory reduction preventing overselling during concurrent checkouts.

### 5. Protected Admin Dashboard
- Live dashboard metrics: total revenue, order count, active products, and low stock warnings computed from database queries.
- Catalog management: Create and edit products, manage variants, upload images, update prices and stock.
- Order management: Filter orders by status (`confirmed`, `packing`, `out_for_delivery`, `delivered`) and update fulfillment states.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router v6, Lucide Icons.
- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2.
- **Database**: PostgreSQL (production) / SQLite (`sri_adithya.db` for local development).

---

## 🧪 Automated Test Verification

Run the end-to-end verification suite:

```bash
python test_sri_adithya_flow.py
```

All 9 test suites verify:
1. Health check & service branding
2. Category catalogue (10 organic categories)
3. Product discovery & live search with debounce
4. Browser geolocation & reverse geocoding
5. Role-based authentication (`admin@sriadithyaorganics.com` & customer)
6. Customer address management
7. Cart persistence & free delivery calculations
8. Atomic multi-step checkout & stock decrement
9. Live Admin Dashboard statistics

# ClientProject01
