-- ==============================================================================
-- SRI ADITHYA ORGANICS - SAFE HISTORICAL CUSTOMER & ORDER DATA CLEANUP
-- PRESERVES: Admin account, categories, products, variants, images, settings
-- REMOVES: Historical test customers, orders, order items, addresses, payments, carts
-- ==============================================================================

BEGIN;

-- 1. DELETE CART ITEMS & CARTS
DELETE FROM cart_items;
DELETE FROM carts;

-- 2. DELETE ORDER ITEMS & PAYMENTS (Dependent on orders)
DELETE FROM order_items;
DELETE FROM payments;

-- 3. DELETE ORDERS
DELETE FROM orders;

-- 4. DELETE WISHLISTS
DELETE FROM wishlists;

-- 5. DELETE CUSTOMER ADDRESSES
DELETE FROM addresses;

-- 6. DELETE HISTORICAL CUSTOMERS (PRESERVE ADMINISTRATOR)
DELETE FROM users WHERE role = 'customer';

-- 7. RESTART AUTO-INCREMENT SEQUENCES SAFELY
ALTER SEQUENCE IF EXISTS orders_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS order_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS payments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS addresses_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS carts_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS cart_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS wishlists_id_seq RESTART WITH 1;

-- Sync users sequence to max remaining (admin id + 1)
SELECT setval(pg_get_serial_sequence('users', 'id'), coalesce(max(id), 1) + 1, false) FROM users;

COMMIT;

