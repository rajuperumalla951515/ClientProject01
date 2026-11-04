-- ==============================================================================
-- SRI ADITHYA ORGANICS - SUPABASE POSTGRESQL PRODUCTION SCHEMA
-- Project ID: gahduzexqmmlahshsyre
-- Architecture: Single Centralized Database for Customer Frontend & Admin Dashboard
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'customer', -- 'customer', 'admin'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 3. ADDRESSES TABLE (With Accurate GPS Geolocation & Precision)
CREATE TABLE IF NOT EXISTS addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(50) DEFAULT 'Home',
    recipient_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    street VARCHAR(255) NOT NULL,
    apartment VARCHAR(100),
    house_number VARCHAR(100),
    locality VARCHAR(150),
    landmark VARCHAR(150),
    city VARCHAR(100) DEFAULT 'Bengaluru' NOT NULL,
    state VARCHAR(100) DEFAULT 'Karnataka' NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    accuracy_meters DOUBLE PRECISION,
    formatted_address TEXT,
    confirmed_at TIMESTAMP WITHOUT TIME ZONE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_postal_code ON addresses(postal_code);

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    icon VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- 5. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(220) UNIQUE NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    short_description VARCHAR(300),
    brand VARCHAR(100) DEFAULT 'Sri Adithya Organics',
    origin_farm VARCHAR(200),
    certifications VARCHAR(255),
    storage_instructions VARCHAR(255),
    allergens VARCHAR(255),
    ingredients TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    is_fresh_today BOOLEAN DEFAULT FALSE,
    is_deal BOOLEAN DEFAULT FALSE,
    is_best_seller BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- 6. PRODUCT VARIANTS TABLE
CREATE TABLE IF NOT EXISTS product_variants (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    unit VARCHAR(50) NOT NULL,
    pack_size VARCHAR(50) DEFAULT 'Standard Pack',
    price DOUBLE PRECISION NOT NULL,
    mrp DOUBLE PRECISION NOT NULL,
    stock INTEGER DEFAULT 50 NOT NULL,
    sku VARCHAR(50) UNIQUE,
    is_default BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_stock ON product_variants(stock);

-- 7. PRODUCT IMAGES TABLE
CREATE TABLE IF NOT EXISTS product_images (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(200),
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_images_product_id ON product_images(product_id);

-- 8. CARTS & CART ITEMS
CREATE TABLE IF NOT EXISTS carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(100),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_carts_session_id ON carts(session_id);
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);

CREATE TABLE IF NOT EXISTS cart_items (
    id SERIAL PRIMARY KEY,
    cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending_whatsapp, pending, confirmed, processing, packed, out_for_delivery, delivered, cancelled
    subtotal DOUBLE PRECISION NOT NULL,
    discount DOUBLE PRECISION DEFAULT 0.0,
    delivery_fee DOUBLE PRECISION DEFAULT 0.0,
    tax DOUBLE PRECISION DEFAULT 0.0,
    total_amount DOUBLE PRECISION NOT NULL,
    delivery_slot VARCHAR(100) DEFAULT 'Instant 15-30 Mins',
    delivery_address_json TEXT NOT NULL,
    notes TEXT,
    admin_notes TEXT,
    payment_method VARCHAR(50) DEFAULT 'cod',
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_id VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- 10. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL,
    variant_id INTEGER NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    variant_name VARCHAR(50) NOT NULL,
    unit_price DOUBLE PRECISION NOT NULL,
    mrp DOUBLE PRECISION NOT NULL,
    quantity INTEGER NOT NULL,
    total_price DOUBLE PRECISION NOT NULL,
    image_url VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- 11. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount DOUBLE PRECISION NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    payment_gateway VARCHAR(50) DEFAULT 'Razorpay Test',
    transaction_id VARCHAR(100) UNIQUE,
    status VARCHAR(50) DEFAULT 'success',
    raw_response TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. DELIVERY SETTINGS TABLE
CREATE TABLE IF NOT EXISTS delivery_settings (
    id SERIAL PRIMARY KEY,
    min_order_amount DOUBLE PRECISION DEFAULT 99.0,
    free_delivery_threshold DOUBLE PRECISION DEFAULT 499.0,
    standard_delivery_fee DOUBLE PRECISION DEFAULT 39.0,
    express_delivery_fee DOUBLE PRECISION DEFAULT 59.0,
    active_slots_json TEXT,
    announcement_text VARCHAR(255) DEFAULT 'Sri Adithya Organics • 100% Certified Organic • Free Delivery on orders over ₹499 • Harvested Today',
    whatsapp_number VARCHAR(30) DEFAULT '919515159006'
);

-- 13. INVENTORY AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS inventory_logs (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    previous_stock INTEGER NOT NULL,
    changed_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON inventory_logs(created_at);

-- 14. WISHLISTS TABLE
CREATE TABLE IF NOT EXISTS wishlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_product_wishlist UNIQUE (user_id, product_id)
);
