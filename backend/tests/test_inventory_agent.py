import pytest

from backend.app.ai.inventory_agent import InventoryIntelligenceAgent


class FakeD1:
    def __init__(self):
        self.queries = []

    async def fetch_all(self, query, *params):
        self.queries.append((query, params))
        if "FROM products" in query:
            return [
                {
                    "product_id": 1,
                    "name": "Groundnut Oil",
                    "category_name": "Oils",
                    "variant_id": 11,
                    "unit": "1 Litre",
                    "stock": 3,
                    "price": 380,
                    "is_default": 1,
                },
                {
                    "product_id": 2,
                    "name": "Organic Rice",
                    "category_name": "Grains",
                    "variant_id": 21,
                    "unit": "5 Kg",
                    "stock": 50,
                    "price": 500,
                    "is_default": 1,
                },
            ]
        if "FROM order_items" in query:
            return [
                {
                    "product_id": 1,
                    "variant_id": 11,
                    "product_name": "Groundnut Oil",
                    "units_sold": 30,
                    "revenue": 11400,
                }
            ]
        return []


@pytest.mark.anyio
async def test_snapshot_calculates_stock_cover_and_restock_without_writes():
    d1 = FakeD1()
    snapshot = await InventoryIntelligenceAgent.get_inventory_snapshot(d1)

    assert snapshot["total_units"] == 53
    assert snapshot["inventory_retail_value"] == 26140
    assert [item["name"] for item in snapshot["low_stock"]] == ["Groundnut Oil"]
    assert snapshot["low_stock"][0]["estimated_days_of_cover"] == 3.0
    assert snapshot["low_stock"][0]["suggested_restock_to_14_day_cover"] == 11
    assert snapshot["slow_moving"][0]["name"] == "Organic Rice"
    assert not any("UPDATE" in query.upper() or "INSERT" in query.upper() for query, _ in d1.queries)
