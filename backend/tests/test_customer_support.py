import pytest

from backend.app.ai.customer_support import CustomerSupportAgent


class FakeD1:
    def __init__(self):
        self.queries = []

    async def fetch_one(self, query, *params):
        self.queries.append((query, params))
        if "delivery_settings" in query:
            return {
                "store_name": "Sri Adithya Organics",
                "min_order_amount": 99,
                "free_delivery_threshold": 499,
                "standard_delivery_fee": 39,
                "express_delivery_fee": 59,
                "active_slots_json": '["Express Delivery (15-30 Mins)"]',
                "store_city": "Kothagudem",
                "store_district": "Bhadradri Kothagudem",
                "store_state": "Telangana",
                "store_pincode": "507101",
                "delivery_radius_km": 60,
            }
        return None

    async def fetch_all(self, query, *params):
        self.queries.append((query, params))
        if "FROM products" in query:
            return []
        if "FROM orders" in query:
            return [
                {
                    "order_number": "SA-20261117-1234",
                    "status": "processing",
                    "subtotal": 500,
                    "delivery_fee": 0,
                    "total_amount": 500,
                    "delivery_slot": "Express",
                    "payment_method": "cod",
                    "payment_status": "pending",
                    "created_at": "2026-11-17 10:00:00",
                    "updated_at": "2026-11-17 10:10:00",
                }
            ]
        return []


@pytest.mark.anyio
async def test_guest_order_questions_require_authentication():
    response = await CustomerSupportAgent.ask(
        FakeD1(),
        "Where is my order?",
        user=None,
    )

    assert response["requires_authentication"] is True
    assert "sign in" in response["answer"].lower()


@pytest.mark.anyio
async def test_customer_orders_are_loaded_for_authenticated_user(monkeypatch):
    async def fake_route_request(**kwargs):
        assert '"customer_orders"' in kwargs["prompt"]
        assert "SA-20261117-1234" in kwargs["prompt"]
        return {"content": "Your order is processing.", "provider": "test", "model": "test"}

    monkeypatch.setattr(
        "backend.app.ai.customer_support.ai_router.route_request",
        fake_route_request,
    )

    response = await CustomerSupportAgent.ask(
        FakeD1(),
        "Where is my order?",
        user={"id": 42, "role": "customer"},
    )

    assert response["topic"] == "order_tracking"
    assert response["verified_data"]["customer_orders"][0]["order_number"] == "SA-20261117-1234"


def test_short_follow_up_uses_previous_context():
    contextual = CustomerSupportAgent._contextual_question(
        "what",
        [
            {"role": "user", "content": "Which oil is suitable for everyday cooking?"},
            {"role": "assistant", "content": "Sri Adithya Wood-Pressed Groundnut Oil is suitable."},
        ],
    )

    assert "everyday cooking" in contextual
    assert "Follow-up question: what" in contextual
