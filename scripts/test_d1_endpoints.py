import sys
from pathlib import Path

# Add repo root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_endpoints():
    print("--- 1. Testing Root & Health ---")
    r = client.get("/")
    print("GET / ->", r.status_code, r.json().get("service"), r.json().get("database"))
    assert r.status_code == 200

    r = client.get("/health/live")
    print("GET /health/live ->", r.status_code, r.json())
    assert r.status_code == 200

    r = client.get("/health/ready")
    print("GET /health/ready ->", r.status_code, r.json())
    assert r.status_code == 200
    assert r.json()["database"]["type"] == "Cloudflare D1"
    assert r.json()["database"]["products_count"] == 25
    assert r.json()["database"]["categories_count"] == 10

    r = client.get("/health")
    print("GET /health ->", r.status_code, r.json())
    assert r.status_code == 200

    print("\n--- 2. Testing Categories ---")
    r = client.get("/api/categories")
    print("GET /api/categories ->", r.status_code, f"Count: {len(r.json())}")
    assert r.status_code == 200
    assert len(r.json()) == 10

    print("\n--- 3. Testing Products ---")
    r = client.get("/api/products")
    print("GET /api/products ->", r.status_code, f"Count: {len(r.json())}")
    assert r.status_code == 200
    assert len(r.json()) == 25
    first_prod = r.json()[0]
    print(f"First product: '{first_prod['name']}', Slug: '{first_prod['slug']}', Variants: {len(first_prod['variants'])}, Images: {len(first_prod['images'])}")
    assert len(first_prod["variants"]) >= 1

    r = client.get(f"/api/products/{first_prod['slug']}")
    print(f"GET /api/products/{first_prod['slug']} ->", r.status_code, r.json().get("name"))
    assert r.status_code == 200

    print("\n--- 4. Testing Settings ---")
    r = client.get("/api/settings")
    print("GET /api/settings ->", r.status_code, "WhatsApp:", r.json().get("whatsapp_number"))
    assert r.status_code == 200
    assert r.json().get("whatsapp_number") == "919515159006"

    print("\n--- 5. Testing Addresses Serviceability ---")
    r = client.post("/api/addresses/check-serviceability", json={"postal_code": "560038"})
    print("POST /api/addresses/check-serviceability ->", r.status_code, r.json().get("service_hub"))
    assert r.status_code == 200

    print("\n--- 6. Testing Authentication ---")
    r = client.post("/api/auth/login", json={"email": "admin@sriadithyaorganics.com", "password": "admin123"})
    print("POST /api/auth/login ->", r.status_code)
    assert r.status_code == 200
    token = r.json()["access_token"]
    user = r.json()["user"]
    print(f"Logged in user: {user['name']} ({user['role']})")
    assert user["role"] == "admin"

    print("\n--- 7. Testing Authenticated /api/auth/me ---")
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    print("GET /api/auth/me ->", r.status_code, r.json().get("email"))
    assert r.status_code == 200

    print("\n--- 8. Testing Cart Operations ---")
    guest_sid = "test_session_123"
    r = client.get("/api/cart", headers={"X-Session-ID": guest_sid})
    print("GET /api/cart ->", r.status_code, "Items:", len(r.json().get("items", [])))
    assert r.status_code == 200

    variant_id = first_prod["variants"][0]["id"]
    r = client.post(
        "/api/cart/items",
        json={"product_id": first_prod["id"], "variant_id": variant_id, "quantity": 2},
        headers={"X-Session-ID": guest_sid}
    )
    print("POST /api/cart/items ->", r.status_code, "Total:", r.json().get("total_amount"))
    assert r.status_code == 200
    assert len(r.json()["items"]) == 1

    print("\n--- 9. Testing Admin Dashboard Stats ---")
    r = client.get("/api/admin/dashboard-stats", headers={"Authorization": f"Bearer {token}"})
    print("GET /api/admin/dashboard-stats ->", r.status_code, "Total Products:", r.json().get("total_products"))
    assert r.status_code == 200
    assert r.json().get("total_products") == 25

    print("\n--- 10. Testing Address & Order Checkout ---")
    # Create address for admin
    addr_payload = {
        "label": "Home",
        "recipient_name": "Sri Adithya Admin",
        "phone": "919515159006",
        "street": "100 Feet Road, Indiranagar",
        "house_number": "42",
        "locality": "Indiranagar",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postal_code": "560038",
        "is_default": True
    }
    r = client.post("/api/addresses", json=addr_payload, headers={"Authorization": f"Bearer {token}"})
    print("POST /api/addresses ->", r.status_code, r.json().get("formatted_address") or r.json().get("street"))
    assert r.status_code == 201
    addr_id = r.json()["id"]

    # Add item to admin cart
    r = client.post(
        "/api/cart/items",
        json={"product_id": first_prod["id"], "variant_id": variant_id, "quantity": 1},
        headers={"Authorization": f"Bearer {token}"}
    )
    print("POST /api/cart/items (admin) ->", r.status_code, "Items:", len(r.json().get("items", [])))
    assert r.status_code == 200

    # Checkout
    order_payload = {
        "address_id": addr_id,
        "delivery_slot": "Instant 15-30 Mins",
        "payment_method": "cod",
        "notes": "Please leave at front door"
    }
    r = client.post("/api/orders", json=order_payload, headers={"Authorization": f"Bearer {token}"})
    print("POST /api/orders ->", r.status_code, "Order Number:", r.json().get("order_number"), "Total:", r.json().get("total_amount"))
    assert r.status_code == 201
    order_num = r.json()["order_number"]
    order_id = r.json()["id"]

    # Get Order details
    r = client.get(f"/api/orders/{order_id}", headers={"Authorization": f"Bearer {token}"})
    print(f"GET /api/orders/{order_id} ->", r.status_code, "Status:", r.json().get("status"))
    assert r.status_code == 200
    assert len(r.json().get("items", [])) == 1

    # Update Order status
    r = client.put(f"/api/orders/{order_id}/status", json={"status": "confirmed", "admin_notes": "Verified by Admin"}, headers={"Authorization": f"Bearer {token}"})
    print(f"PUT /api/orders/{order_id}/status ->", r.status_code, "New Status:", r.json().get("status"))
    assert r.status_code == 200
    assert r.json()["status"] == "confirmed"

    # WhatsApp Order Creation
    wa_payload = {
        "customer_name": "Raju Perumalla",
        "customer_phone": "919515159006",
        "delivery_address": {
            "street": "MG Road",
            "city": "Bengaluru",
            "state": "Karnataka",
            "postal_code": "560001"
        },
        "items": [
            {"product_id": first_prod["id"], "variant_id": variant_id, "quantity": 1}
        ]
    }
    r = client.post("/api/orders/whatsapp", json=wa_payload)
    print("POST /api/orders/whatsapp ->", r.status_code, "WhatsApp URL:", r.json().get("whatsapp_url")[:45] + "...")
    assert r.status_code == 200
    assert "wa.me" in r.json()["whatsapp_url"]

    print("\nALL 10 COMPLETE PRODUCTION FLOWS VERIFIED ON CLOUDFLARE D1!")

if __name__ == "__main__":
    test_endpoints()
