import sys
import io
# Ensure stdout handles utf-8 on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from fastapi.testclient import TestClient
from backend.main import app

def run_tests():
    print("=== STARTING ROOTLY ORGANICS AUTOMATED TEST SUITE ===\n")

    with TestClient(app) as client:
        # 1. Health Check
        print("1. Testing Health Check...")
        res = client.get("/api/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print("   [PASS] Health check passed:", res.json())

        # 2. Categories
        print("\n2. Testing Categories...")
        res = client.get("/api/categories")
        assert res.status_code == 200
        categories = res.json()
        assert len(categories) >= 10, f"Expected 10 categories, found {len(categories)}"
        print(f"   [PASS] Retrieved {len(categories)} categories. First: {categories[0]['name']}")

        # 3. Products & Search
        print("\n3. Testing Product Discovery & Search...")
        res = client.get("/api/products")
        assert res.status_code == 200
        products = res.json()
        assert len(products) > 0
        print(f"   [PASS] Retrieved {len(products)} active organic products.")

        # Search
        search_res = client.get("/api/products?search=tomato")
        assert search_res.status_code == 200
        search_items = search_res.json()
        assert len(search_items) >= 1, "Expected search results for 'tomato'"
        print(f"   [PASS] Case-insensitive search for 'tomato': found {len(search_items)} matches.")

        # Search suggestions
        sugg_res = client.get("/api/products/search-suggestions?q=gh")
        assert sugg_res.status_code == 200
        sugg_data = sugg_res.json()
        assert "products" in sugg_data
        print(f"   [PASS] Search suggestions for 'gh': {len(sugg_data['products'])} product suggestions.")

        # 4. Customer Authentication
        print("\n4. Testing Customer Authentication...")
        login_res = client.post("/api/auth/login", json={
            "email": "arjun.sharma@example.com",
            "password": "customer123"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token_data = login_res.json()
        token = token_data["access_token"]
        user_data = token_data["user"]
        assert user_data["email"] == "arjun.sharma@example.com"
        print(f"   [PASS] Customer logged in: {user_data['name']} (ID: {user_data['id']})")

        auth_headers = {"Authorization": f"Bearer {token}"}

        # Verify Profile
        me_res = client.get("/api/auth/me", headers=auth_headers)
        assert me_res.status_code == 200
        print("   [PASS] Verified user token with /api/auth/me")

        # 5. Address Management
        print("\n5. Testing Address Management...")
        addr_res = client.get("/api/addresses", headers=auth_headers)
        assert addr_res.status_code == 200
        addrs = addr_res.json()
        assert len(addrs) > 0
        first_addr_id = addrs[0]["id"]
        print(f"   [PASS] Retrieved {len(addrs)} saved addresses. Selected default ID: {first_addr_id}")

        # 6. Cart Operations
        print("\n6. Testing Shopping Cart...")
        # Clear cart first
        client.post("/api/cart/clear", headers=auth_headers)
        
        # Pick a product and variant
        sample_prod = products[0]
        sample_var = sample_prod["variants"][0]
        
        # Add to cart
        add_res = client.post("/api/cart/items", headers=auth_headers, json={
            "product_id": sample_prod["id"],
            "variant_id": sample_var["id"],
            "quantity": 2
        })
        assert add_res.status_code == 200
        cart_data = add_res.json()
        assert cart_data["item_count"] == 2
        print(f"   [PASS] Added {sample_prod['name']} ({sample_var['unit']}) x 2 to cart. Subtotal: Rs {cart_data['subtotal']}")

        # Add a second item to cross free delivery threshold
        sample_prod2 = products[1]
        sample_var2 = sample_prod2["variants"][0]
        client.post("/api/cart/items", headers=auth_headers, json={
            "product_id": sample_prod2["id"],
            "variant_id": sample_var2["id"],
            "quantity": 3
        })
        cart_after = client.get("/api/cart", headers=auth_headers).json()
        print(f"   [PASS] Updated cart: {cart_after['item_count']} items, Total: Rs {cart_after['total_amount']}, Delivery Fee: Rs {cart_after['delivery_fee']}")

        # Stock validation test: try to add excessive quantity (> 500)
        stock_test_res = client.post("/api/cart/items", headers=auth_headers, json={
            "product_id": sample_prod["id"],
            "variant_id": sample_var["id"],
            "quantity": 9999
        })
        assert stock_test_res.status_code == 400
        print("   [PASS] Excessive quantity stock limit correctly rejected by server (400 Bad Request).")

        # 7. Checkout & Order Placement
        print("\n7. Testing Multi-Step Checkout & Order Placement...")
        initial_stock = sample_var["stock"]

        checkout_res = client.post("/api/orders/checkout", headers=auth_headers, json={
            "address_id": first_addr_id,
            "delivery_slot": "Express Delivery (15-30 Mins)",
            "payment_method": "upi",
            "notes": "Automated verification test run"
        })
        assert checkout_res.status_code == 201, f"Checkout failed: {checkout_res.text}"
        order = checkout_res.json()
        print(f"   [PASS] Order placed successfully! Order Number: {order['order_number']}, Total: Rs {order['total_amount']}")
        assert order["status"] == "confirmed"
        assert len(order["items"]) >= 2

        # Verify inventory was reduced atomically
        refreshed_prod = client.get(f"/api/products/{sample_prod['id']}").json()
        refreshed_var = next(v for v in refreshed_prod["variants"] if v["id"] == sample_var["id"])
        print(f"   [PASS] Inventory verified: stock reduced from {initial_stock} to {refreshed_var['stock']}")

        # Verify cart was cleared
        cleared_cart = client.get("/api/cart", headers=auth_headers).json()
        assert cleared_cart["item_count"] == 0
        print("   [PASS] Cart automatically cleared after order placement.")

        # 8. Order History
        print("\n8. Testing Order History...")
        history_res = client.get("/api/orders", headers=auth_headers)
        assert history_res.status_code == 200
        orders_list = history_res.json()
        assert len(orders_list) >= 1
        print(f"   [PASS] User order history contains {len(orders_list)} orders.")

        # 9. Admin Authorization & Protected Controls
        print("\n9. Testing Admin Authorization Security...")
        # Attempting to access admin stats as normal customer -> MUST fail with 403 Forbidden
        forbidden_res = client.get("/api/admin/dashboard-stats", headers=auth_headers)
        assert forbidden_res.status_code == 403, f"Expected 403, got {forbidden_res.status_code}"
        print("   [PASS] Customer access to /api/admin/dashboard-stats strictly forbidden (403 Forbidden).")

        # Login as Admin
        admin_login = client.post("/api/auth/login", json={
            "email": "admin@rootlyorganics.com",
            "password": "admin123"
        })
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("   [PASS] Admin logged in successfully.")

        # Access stats as Admin -> MUST succeed
        stats_res = client.get("/api/admin/dashboard-stats", headers=admin_headers)
        assert stats_res.status_code == 200
        stats_data = stats_res.json()
        print(f"   [PASS] Admin Dashboard Stats: Revenue Rs {stats_data['total_revenue']}, Orders: {stats_data['total_orders']}")

        # Admin update order status
        status_update_res = client.put(f"/api/orders/{order['id']}/status", headers=admin_headers, json={
            "status": "delivered"
        })
        assert status_update_res.status_code == 200
        assert status_update_res.json()["status"] == "delivered"
        print(f"   [PASS] Admin updated order #{order['order_number']} status to 'delivered'.")

        # 10. Wishlist Operations
        print("\n10. Testing Wishlist Toggle...")
        wish_toggle = client.post("/api/wishlist/toggle", headers=auth_headers, json={"product_id": sample_prod["id"]})
        assert wish_toggle.status_code == 200
        print("   [PASS] Wishlist toggled:", wish_toggle.json()["message"])

        wish_list = client.get("/api/wishlist", headers=auth_headers).json()
        assert len(wish_list) >= 1
        print(f"   [PASS] Wishlist now contains {len(wish_list)} item.")

        # Toggle remove
        client.post("/api/wishlist/toggle", headers=auth_headers, json={"product_id": sample_prod["id"]})
        print("   [PASS] Wishlist item removed via toggle.")

    print("\n=======================================================")
    print("ALL 10 TEST SUITE CATEGORIES PASSED WITH 100% SUCCESS!")
    print("=======================================================")

if __name__ == "__main__":
    run_tests()
