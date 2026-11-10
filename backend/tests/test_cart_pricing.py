"""
Sri Adithya Organics — Authoritative Cart Pricing & Delivery Fee Test Suite

Validates the Core Business Pricing Rule:
Final Customer Amount = Product Selling Price (Subtotal) + Delivery Fee + Other explicitly applicable charges.
FINAL RULE: Never subtract MRP savings from the selling price. The customer pays the selling price plus the applicable delivery fee.
"""
import pytest
from backend.app.pricing import compute_financials
from backend.app.courier import calculate_courier_shipping
from backend.app.delivery import calculate_distance_based_delivery_fee, DEFAULT_DISTANCE_SLABS
from backend.app.routers.orders import format_whatsapp_order_message


def test_mrp_higher_than_selling_price():
    """
    User Scenario:
    Product MRP: ₹490
    Product selling price: ₹385
    Informational savings: ₹105
    Delivery fee: ₹40
    Final payable amount: ₹425 (The ₹105 savings must NEVER be deducted a second time).
    """
    items = [{
        "product_id": 1,
        "variant_id": 1,
        "product_name": "Organic Cold-Pressed Groundnut Oil",
        "variant_name": "1 Litre Bottle",
        "price": 385.0,
        "mrp": 490.0,
        "quantity": 1
    }]

    fin = compute_financials(
        raw_items=items,
        free_delivery_threshold=499.0,
        standard_delivery_fee=40.0
    )

    # Subtotal is based strictly on configured selling price
    assert fin.subtotal == 385.0
    assert fin.total_mrp == 490.0
    # Informational MRP savings
    assert fin.discount == 105.0
    assert fin.mrp_savings == 105.0
    # Under free threshold (385 < 499) -> Delivery fee is applicable
    assert fin.delivery_fee == 40.0
    # CRITICAL: Total is selling price + delivery fee ONLY!
    # 385 + 40 = 425. NEVER 385 - 105 + 40 = 320!
    assert fin.total_amount == 425.0
    assert fin.amount_needed_for_free_delivery == 114.0


def test_mrp_equal_to_selling_price():
    """Verify products with zero discount (MRP == Selling Price)."""
    items = [{
        "product_id": 2,
        "variant_id": 2,
        "product_name": "Organic Turmeric Powder",
        "variant_name": "500g Pack",
        "price": 385.0,
        "mrp": 385.0,
        "quantity": 1
    }]

    fin = compute_financials(
        raw_items=items,
        free_delivery_threshold=499.0,
        standard_delivery_fee=40.0
    )

    assert fin.subtotal == 385.0
    assert fin.total_mrp == 385.0
    assert fin.discount == 0.0
    assert fin.mrp_savings == 0.0
    assert fin.delivery_fee == 40.0
    assert fin.total_amount == 425.0


def test_cart_below_free_delivery_threshold():
    """
    Subtotal ₹385 < Threshold ₹499.
    Amount remaining: ₹114.
    Customer is NOT eligible for free delivery yet.
    Must show actual delivery charge, NEVER FREE.
    """
    items = [{
        "product_id": 1,
        "variant_id": 1,
        "price": 385.0,
        "mrp": 490.0,
        "quantity": 1
    }]

    fin = compute_financials(
        raw_items=items,
        free_delivery_threshold=499.0,
        standard_delivery_fee=39.0
    )

    assert fin.subtotal == 385.0
    assert fin.free_delivery_threshold == 499.0
    assert fin.amount_needed_for_free_delivery == 114.0
    assert fin.free_delivery_progress < 100.0
    # Delivery fee must be the actual fee, NOT 0.0 or free!
    assert fin.delivery_fee == 39.0
    assert fin.total_amount == 385.0 + 39.0


def test_cart_reaching_free_delivery_threshold():
    """Cart exactly meets free delivery threshold (₹499)."""
    items = [{
        "product_id": 1,
        "variant_id": 1,
        "price": 499.0,
        "mrp": 600.0,
        "quantity": 1
    }]

    fin = compute_financials(
        raw_items=items,
        free_delivery_threshold=499.0,
        standard_delivery_fee=39.0
    )

    assert fin.subtotal == 499.0
    assert fin.delivery_fee == 0.0
    assert fin.free_delivery_progress == 100.0
    assert fin.amount_needed_for_free_delivery == 0.0
    # Customer pays selling price with free delivery
    assert fin.total_amount == 499.0


def test_cart_exceeding_free_delivery_threshold():
    """Cart subtotal ₹1,200 > Threshold ₹499."""
    items = [
        {"product_id": 1, "variant_id": 1, "price": 450.0, "mrp": 550.0, "quantity": 2},
        {"product_id": 2, "variant_id": 2, "price": 300.0, "mrp": 350.0, "quantity": 1},
    ]

    fin = compute_financials(
        raw_items=items,
        free_delivery_threshold=499.0,
        standard_delivery_fee=39.0
    )

    assert fin.subtotal == 1200.0
    assert fin.total_mrp == 1450.0
    assert fin.mrp_savings == 250.0
    assert fin.delivery_fee == 0.0
    assert fin.total_amount == 1200.0
    assert fin.amount_needed_for_free_delivery == 0.0


def test_local_distance_based_delivery():
    """
    Local delivery at 5.5 km from Kothagudem Mill:
    Distance slab (4–6 km): ₹40.
    Cart subtotal: ₹385 (below ₹499 free threshold).
    Final Amount = 385 + 40 = ₹425.
    """
    fee, is_serv, msg, slab = calculate_distance_based_delivery_fee(
        distance_km=5.5,
        slabs=DEFAULT_DISTANCE_SLABS,
        subtotal=385.0,
        free_delivery_threshold=499.0,
        max_delivery_radius_km=35.0,
        default_fallback_fee=39.0
    )
    assert is_serv is True
    assert fee == 40.0

    items = [{"product_id": 1, "variant_id": 1, "price": 385.0, "mrp": 490.0, "quantity": 1}]
    fin = compute_financials(items, free_delivery_threshold=499.0, standard_delivery_fee=fee)

    assert fin.subtotal == 385.0
    assert fin.delivery_fee == 40.0
    assert fin.total_amount == 425.0
    assert fin.mrp_savings == 105.0


def test_nationwide_courier_delivery():
    """
    Nationwide courier shipping for PIN 501301 (Zone B):
    Base courier rate: ₹49.
    Cart subtotal: ₹385 (below ₹999 free courier threshold).
    Final Amount = 385 + 49 = ₹434.
    """
    courier_quote = calculate_courier_shipping(
        dest_pincode="501301",
        weight_kg=0.5,
        subtotal=385.0,
        pickup_pincode="507101",
        free_threshold=999.0,
        partner_name="Delhivery"
    )

    assert courier_quote["is_serviceable"] is True
    assert courier_quote["shipping_fee"] == 49.0
    assert courier_quote["is_free_shipping"] is False

    items = [{"product_id": 1, "variant_id": 1, "price": 385.0, "mrp": 490.0, "quantity": 1}]
    fin = compute_financials(items, free_delivery_threshold=999.0, standard_delivery_fee=courier_quote["shipping_fee"])

    assert fin.subtotal == 385.0
    assert fin.delivery_fee == 49.0
    assert fin.total_amount == 434.0
    assert fin.mrp_savings == 105.0


def test_multiple_products_and_quantities():
    """
    Multiple items with varied MRP and Selling Prices:
    Item 1: Cold Pressed Sesame Oil (Selling ₹450, MRP ₹550, Qty 2 -> ₹900, MRP ₹1100, Savings ₹200)
    Item 2: Organic Jaggery Powder (Selling ₹250, MRP ₹290, Qty 1 -> ₹250, MRP ₹290, Savings ₹40)
    Item 3: Raw Wild Honey (Selling ₹350, MRP ₹350, Qty 1 -> ₹350, MRP ₹350, Savings ₹0)
    Subtotal = 900 + 250 + 350 = ₹1,500
    Total MRP = 1100 + 290 + 350 = ₹1,740
    Total Savings = ₹240
    Free threshold = ₹499 (satisfied)
    Delivery fee = 0.0
    Total payable = ₹1,500 (Selling price only!).
    """
    items = [
        {"product_id": 1, "variant_id": 1, "price": 450.0, "mrp": 550.0, "quantity": 2},
        {"product_id": 2, "variant_id": 2, "price": 250.0, "mrp": 290.0, "quantity": 1},
        {"product_id": 3, "variant_id": 3, "price": 350.0, "mrp": 350.0, "quantity": 1},
    ]

    fin = compute_financials(items, free_delivery_threshold=499.0, standard_delivery_fee=39.0)

    assert fin.item_count == 4
    assert fin.subtotal == 1500.0
    assert fin.total_mrp == 1740.0
    assert fin.mrp_savings == 240.0
    assert fin.delivery_fee == 0.0
    assert fin.total_amount == 1500.0


def test_whatsapp_message_pricing_synchronization():
    """
    Ensure formatted WhatsApp order message displays:
    - Item Selling Price
    - Subtotal
    - Delivery Fee (not FREE if under threshold)
    - Total Amount = Subtotal + Delivery Fee
    - Informational savings note (never subtracted twice)
    """
    order = {
        "order_number": "SAO-TEST-PRICE-01",
        "subtotal": 385.0,
        "discount": 105.0,
        "delivery_fee": 40.0,
        "total_amount": 425.0,
        "delivery_slot": "Express Delivery (15-30 Mins)",
        "delivery_mode": "local_express",
        "distance_km": 5.5,
        "delivery_address_json": '{"recipient_name":"Raju","phone":"9876543210","street":"Babu Camp Road","locality":"Babu Camp","city":"Kothagudem","district":"Bhadradri Kothagudem","state":"Telangana","postal_code":"507101","latitude":17.5390,"longitude":80.6250}'
    }
    items = [{
        "product_name": "Organic Cold-Pressed Groundnut Oil",
        "variant_name": "1 Litre Bottle",
        "quantity": 1,
        "total_price": 385.0
    }]

    msg = format_whatsapp_order_message(order, items, "Raju", "9876543210")

    # Verify Selling Price is used
    assert "Price: ₹385.00" in msg
    assert "Item Subtotal (Selling Price): ₹385.00" in msg
    assert "Delivery Fee: ₹40.00" in msg
    # Verify Total is 425.00
    assert "Total Amount: ₹425.00" in msg
    # Verify Informational savings note
    assert "Total MRP Savings: ₹105.00 (Included in discounted prices)" in msg
    # Must NOT show FREE when fee is 40.00
    assert "FREE" not in msg

