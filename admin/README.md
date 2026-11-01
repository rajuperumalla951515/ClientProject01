# Sri Adithya Organics — Admin Dashboard

Separate, secure, executive administrative dashboard for Sri Adithya Organics e-commerce platform.

## Architecture
- **Admin Frontend**: React 18 + Vite 5 + TypeScript + Tailwind CSS
- **Shared Backend**: FastAPI hosted on Render (`https://clientproject01-tc3z.onrender.com`)
- **Central Data Store**: Google Sheets API v4 (`1Yvcf7_u-YypWJY8hW9JdvCZZVEneEH7XLlngGgCS_6o`)
- **Target Deployment**: Vercel (`admin.sriadithyaorganics.com`)

---

## Features
1. **Authentication & Authorization**:
   - Secured admin login with JWT validation against `Customers` sheet.
   - Non-admin customers are blocked with HTTP 403 Forbidden.
   - Default administrator account: `admin@sriadithyaorganics.com` / `admin123`.

2. **Dashboard Overview**:
   - Total Revenue & Today's Revenue.
   - Total Orders & Today's Orders.
   - Order Status Breakdown pills.
   - Low Stock Alert counter.
   - Top 5 Best-Selling Organic Products.
   - Recent Customer Orders queue with 30s auto-refresh toggle.

3. **Order Management**:
   - Filter by status: Pending WhatsApp, Confirmed, Processing, Delivered, Cancelled.
   - Full text search across Order Reference, Customer Name, and Phone Number.
   - Order Detail Modal with itemized breakdown, unit prices, line totals, and delivery slot.
   - **Customer Live GPS Location**: Clickable Google Maps pin link (`https://maps.google.com/?q={lat},{lon}`) with precision radius (±X meters).
   - Order status selector.
   - **WhatsApp Chat**: Click-to-chat URL pre-filling order reference and customer message.
   - **Order Cancellation & Restock**: Prompts for cancellation reason, sets status to `cancelled`, restores inventory in Google Sheets `Products` sheet, and appends restock record to `Inventory_Logs`.

4. **Product Catalogue Management**:
   - Search by name, SKU ID, or category.
   - Add new organic product (name, category, price, MRP, initial stock, unit, weight, image URL, description, is_featured, is_active).
   - Edit existing products with immediate customer website reflection (in-memory backend cache invalidation).
   - Deactivate product.

5. **Category Management**:
   - Visual category cards with product count and slug.
   - Add and edit categories in `Categories` sheet.

6. **Inventory & Stock Audit**:
   - Summary cards: Total SKUs, Healthy (>=10), Low Stock (<10), Out of Stock (0).
   - Visual progress bars for remaining stock.
   - Adjust Stock Modal: Add stock (+), Deduct stock (-), or Set exact count with reason and notes.
   - Chronological audit ledger from `Inventory_Logs` worksheet.

7. **Customer Directory**:
   - Directory table with Customer Name, Email, Phone, Registration Date, Total Orders, Lifetime Spend.
   - Customer profile drawer with saved delivery addresses (and GPS coordinates) and order history.

8. **Store & Delivery Configuration**:
   - Target WhatsApp Ordering Phone Number.
   - Standard & Express Delivery Fees.
   - Free Delivery Threshold & Minimum Order Amount.
   - Announcement banner text.
   - Active delivery slots manager.

---

## Local Development
```bash
# Navigate to admin folder
cd admin

# Install dependencies
npm install

# Run Vite dev server (runs on port 5174 to avoid conflict with customer frontend)
npm run dev
```

---

## Vercel Deployment Instructions (for `admin.sriadithyaorganics.com`)
1. In your **Vercel Dashboard**, click **Add New...** -> **Project**.
2. Select your repository: `rajuperumalla951515/ClientProject01`.
3. Under **Project Settings**:
   - **Project Name**: `sri-adithya-organics-admin`
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click "Edit" and set to `admin`.
4. Under **Environment Variables**:
   - Add `VITE_API_URL` = `https://clientproject01-tc3z.onrender.com`
5. Click **Deploy**.
6. Under **Settings -> Domains**, add your custom domain: `admin.sriadithyaorganics.com`.
7. Configure CNAME DNS record pointing `admin` to `cname.vercel-dns.com`.
