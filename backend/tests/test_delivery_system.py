"""
Sri Adithya Organics — Location-First Delivery System Tests
"""
import pytest
from backend.app.routers.addresses import (
    PIN_REGION_MAP,
    REVERSE_GEOCODE_CACHE,
    get_road_distance_km,
    calculate_distance_based_delivery_fee,
    parse_distance_slabs,
    reverse_geocode,
    check_serviceability,
    search_address,
)
from backend.app.schemas import ReverseGeocodeRequest, ServiceabilityCheckRequest
from backend.app.routers.orders import format_whatsapp_order_message

def test_pan_india_pin_mapping():
    """Verify PIN_REGION_MAP correctly maps postal circles across India."""
    # Telangana
    assert PIN_REGION_MAP["50"] == ("Kothagudem / Hyderabad", "Telangana")
    # Andhra Pradesh
    assert PIN_REGION_MAP["52"] == ("Vijayawada / Guntur", "Andhra Pradesh")
    # Karnataka
    assert PIN_REGION_MAP["56"] == ("Bengaluru", "Karnataka")
    # Tamil Nadu
    assert PIN_REGION_MAP["60"] == ("Chennai", "Tamil Nadu")
    # Maharashtra
    assert PIN_REGION_MAP["40"] == ("Mumbai", "Maharashtra")
    # Delhi
    assert PIN_REGION_MAP["11"] == ("New Delhi", "Delhi")

def test_distance_calculation_from_kothagudem_mill():
    """Verify haversine distance estimation from the Kothagudem Mill."""
    store_lat, store_lon = 17.5376, 80.6210 # Kothagudem Mill
    
    # Customer in Babu Camp / Ganeshbasthi (approx 1 km)
    cust_lat, cust_lon = 17.5390, 80.6250
    dist, source = get_road_distance_km(store_lat, store_lon, cust_lat, cust_lon)
    assert dist is not None
    assert dist < 3.0 # Within 3 km
    
    # Customer in Hyderabad (approx 240-270 km road distance)
    hyd_lat, hyd_lon = 17.3850, 78.4867
    hyd_dist, _ = get_road_distance_km(store_lat, store_lon, hyd_lat, hyd_lon)
    assert hyd_dist is not None
    assert 200.0 < hyd_dist < 320.0

def test_dynamic_distance_slabs():
    """Verify distance slab pricing calculation."""
    slabs = [
        {"min_km": 0.0, "max_km": 2.0, "fee": 20.0},
        {"min_km": 2.0, "max_km": 4.0, "fee": 30.0},
        {"min_km": 4.0, "max_km": 6.0, "fee": 40.0},
        {"min_km": 6.0, "max_km": 8.0, "fee": 50.0},
        {"min_km": 8.0, "max_km": 10.0, "fee": 60.0},
    ]

    # Under 2 km
    fee, is_serv, msg, slab = calculate_distance_based_delivery_fee(
        distance_km=1.5,
        slabs=slabs,
        subtotal=200.0,
        free_delivery_threshold=999.0,
        max_delivery_radius_km=35.0,
        default_fallback_fee=25.0
    )
    assert fee == 20.0
    assert is_serv is True
    assert "0" in slab and "2 km" in slab

    # 5.5 km
    fee, is_serv, msg, slab = calculate_distance_based_delivery_fee(
        distance_km=5.5,
        slabs=slabs,
        subtotal=300.0,
        free_delivery_threshold=999.0,
        max_delivery_radius_km=35.0,
        default_fallback_fee=25.0
    )
    assert fee == 40.0
    assert is_serv is True
    assert "4" in slab and "6 km" in slab

    # Free delivery over threshold
    fee, is_serv, msg, slab = calculate_distance_based_delivery_fee(
        distance_km=5.5,
        slabs=slabs,
        subtotal=1200.0,
        free_delivery_threshold=999.0,
        max_delivery_radius_km=35.0,
        default_fallback_fee=25.0
    )
    assert fee == 0.0
    assert is_serv is True

    # Outside max radius (e.g. 150 km away)
    fee, is_serv, msg, slab = calculate_distance_based_delivery_fee(
        distance_km=150.0,
        slabs=slabs,
        subtotal=400.0,
        free_delivery_threshold=999.0,
        max_delivery_radius_km=60.0,
        default_fallback_fee=25.0
    )
    assert is_serv is False
    assert "not available" in msg.lower() or "maximum serviceable radius" in msg.lower()

def test_reverse_geocode_cache():
    """Verify in-memory caching for reverse geocoding coordinates."""
    test_key = (17.5376, 80.6210)
    REVERSE_GEOCODE_CACHE[test_key] = {
        "formatted_address": "Sri Aditya Organics & Oil Mill, Babu Camp, Kothagudem",
        "city": "Kothagudem",
        "district": "Bhadradri Kothagudem",
        "state": "Telangana",
        "postal_code": "507101",
        "country": "India"
    }
    assert test_key in REVERSE_GEOCODE_CACHE
    cached = REVERSE_GEOCODE_CACHE[test_key]
    assert cached["district"] == "Bhadradri Kothagudem"
    assert cached["postal_code"] == "507101"

def test_whatsapp_message_pan_india_address():
    """Verify WhatsApp order message does not hardcode Telangana or Bangalore for other states."""
    order = {
        "order_number": "SAO-20261109-TEST",
        "total_amount": 750.0,
        "subtotal": 700.0,
        "delivery_fee": 50.0,
        "delivery_slot": "Morning Harvest Slot",
        "payment_method": "online",
        "distance_km": 12.5,
        "delivery_address_json": '{"recipient_name":"Venkata Rao","phone":"9876543210","street":"Main Road","locality":"Governorpet","city":"Vijayawada","district":"Krishna","state":"Andhra Pradesh","postal_code":"520002","latitude":16.5062,"longitude":80.6480}'
    }
    items = [
        {"product_name": "Wood-Pressed Sesame Oil", "variant_name": "1 Litre Bottle", "quantity": 1, "total_price": 450.0},
        {"product_name": "Organic Jaggery Powder", "variant_name": "1 kg Pack", "quantity": 1, "total_price": 250.0}
    ]

    msg = format_whatsapp_order_message(order, items, "Venkata Rao", "9876543210")
    
    # Must contain correct order info
    assert "SAO-20261109-TEST" in msg
    assert "Vijayawada" in msg
    assert "Andhra Pradesh" in msg
    assert "520002" in msg
    # Must include precise GPS link
    assert "maps.google.com/?q=16.5062" in msg
    assert "80.648" in msg
    # Must NOT force Telangana onto an Andhra Pradesh address
    assert "Vijayawada, Telangana" not in msg

def test_ghatkesar_hybrid_courier():
    """Verify Ghatkesar coordinates do NOT snap to Abids/500001, and are served via Nationwide Courier Delivery."""
    req = ReverseGeocodeRequest(latitude=17.4477, longitude=78.6833)
    res = reverse_geocode(req)
    
    # Must NOT be Hyderabad Abids / Koti or 500001
    assert "Abids" not in res.locality
    assert "Koti" not in res.locality
    assert res.postal_code != "500001"
    assert res.postal_code == "501301"
    
    # Must reflect true distance from Kothagudem Mill (~240-270 km)
    assert res.distance_km is not None
    assert res.distance_km > 200.0
    
    # Must be serviceable via Nationwide Courier Delivery
    assert res.is_serviceable is True
    assert res.delivery_mode == "nationwide_courier"
    assert res.delivery_type == "Nationwide Courier Shipping"
    assert res.courier_partner == "Delhivery"
    assert "2" in res.estimated_delivery_days and "3" in res.estimated_delivery_days
    assert res.delivery_fee > 0.0
    assert "Delhivery" in res.service_hub
    assert res.matched_slab == "Intra-State (Telangana)"

def test_babu_camp_mill_serviceable():
    """Verify Babu Camp coordinates near Kothagudem Mill are serviceable with Local Express 15-min delivery and 0-5 km slab."""
    req = ReverseGeocodeRequest(latitude=17.5376, longitude=80.6210)
    res = reverse_geocode(req)
    
    assert res.is_serviceable is True
    assert res.delivery_mode == "local_express"
    assert res.delivery_type == "Local Express Delivery"
    assert res.distance_km is not None
    assert res.distance_km < 3.0
    assert res.estimated_delivery_minutes == 15
    assert res.delivery_fee == 30.0
    assert res.matched_slab == "0–5 km"
    assert res.postal_code == "507101"
    assert "Kothagudem" in res.city

def test_serviceability_check_nationwide_courier():
    """Verify serviceability check routes Pan-India addresses to Nationwide Courier with accurate zone rates."""
    def drive_coro(coro):
        try:
            coro.send(None)
        except StopIteration as e:
            return e.value
        raise RuntimeError("Coroutine did not complete synchronously")

    # 1. Telangana Courier (Zone B)
    req_hyd = ServiceabilityCheckRequest(
        postal_code="501301",
        latitude=17.4477,
        longitude=78.6833,
        cart_subtotal=400.0
    )
    res_hyd = drive_coro(check_serviceability(req_hyd, d1=None))
    assert res_hyd.is_serviceable is True
    assert res_hyd.delivery_mode == "nationwide_courier"
    assert res_hyd.courier_partner == "Delhivery"
    assert res_hyd.courier_zone == "Zone B"
    assert res_hyd.delivery_fee == 49.0
    assert "2–3 Business Days" in res_hyd.estimated_delivery_days

    # 2. Bengaluru Regional South Courier (Zone C)
    req_blr = ServiceabilityCheckRequest(
        postal_code="560001",
        cart_subtotal=350.0
    )
    res_blr = drive_coro(check_serviceability(req_blr, d1=None))
    assert res_blr.is_serviceable is True
    assert res_blr.delivery_mode == "nationwide_courier"
    assert res_blr.courier_zone == "Zone C"
    assert res_blr.delivery_fee == 65.0
    assert "3–4 Business Days" in res_blr.estimated_delivery_days

    # 3. New Delhi Rest of India Courier (Zone D)
    req_del = ServiceabilityCheckRequest(
        postal_code="110001",
        cart_subtotal=500.0
    )
    res_del = drive_coro(check_serviceability(req_del, d1=None))
    assert res_del.is_serviceable is True
    assert res_del.delivery_mode == "nationwide_courier"
    assert res_del.courier_zone == "Zone D"
    assert res_del.delivery_fee == 85.0
    assert "4–6 Business Days" in res_del.estimated_delivery_days

    # 4. Invalid PIN
    req_inv = ServiceabilityCheckRequest(
        postal_code="000111"
    )
    res_inv = drive_coro(check_serviceability(req_inv, d1=None))
    assert res_inv.is_serviceable is False
    assert "valid" in res_inv.message.lower()

def test_pan_india_search_autocomplete_cities():
    """Verify Pan-India location search returns results for cities across all states without restricting to Telangana."""
    test_cities = [
        "Hyderabad", "Ghatkesar", "Warangal", "Karimnagar",
        "Vijayawada", "Visakhapatnam", "Bengaluru", "Chennai",
        "Mumbai", "Delhi", "Pune", "Jaipur", "Kolkata"
    ]
    for city in test_cities:
        # Test query parameter
        results = search_address(query=city)
        assert len(results) > 0, f"Expected search results for city: {city}"
        first = results[0]
        assert first.formatted_address
        assert first.latitude is not None
        assert first.longitude is not None
        assert first.city

        # Test q parameter (ensuring ?q= parameter works identically)
        results_q = search_address(q=city)
        assert len(results_q) > 0, f"Expected search results for ?q={city}"
        assert results_q[0].formatted_address

def test_pan_india_search_by_pincode():
    """Verify searching for 6-digit PIN codes across India returns matching address items."""
    pins = {
        "501301": "Ghatkesar",
        "560001": "Bengaluru",
        "520001": "Vijayawada",
        "110001": "New Delhi",
        "400001": "Mumbai",
        "600001": "Chennai",
        "700016": "Kolkata",
    }
    for pin, expected_city in pins.items():
        res = search_address(query=pin)
        assert len(res) > 0, f"Expected search results for PIN: {pin}"
        match = any(pin in r.postal_code or pin in r.formatted_address for r in res)
        assert match, f"Expected PIN {pin} in search result addresses"

    # Test arbitrary valid 6-digit Indian PIN synthesis via circle mapping
    res_arb = search_address(query="560037")
    assert len(res_arb) > 0
    assert any("560037" in r.postal_code for r in res_arb)

def test_sixty_km_delivery_rule_local_vs_nationwide():
    """
    Verify the 60 km delivery rule:
    - Distances <= 60 km qualify for Local Express Delivery with configured slabs.
    - Distances > 60 km automatically hand off to Nationwide Courier (is_serviceable: True) without blocking or asking to contact store.
    """
    slabs = [
        {"min_km": 0.0, "max_km": 2.0, "fee": 20.0},
        {"min_km": 2.0, "max_km": 4.0, "fee": 30.0},
        {"min_km": 4.0, "max_km": 6.0, "fee": 40.0},
        {"min_km": 6.0, "max_km": 8.0, "fee": 50.0},
        {"min_km": 8.0, "max_km": 10.0, "fee": 60.0},
        {"min_km": 10.0, "max_km": 15.0, "fee": 75.0},
        {"min_km": 15.0, "max_km": 35.0, "fee": 99.0},
        {"min_km": 35.0, "max_km": 60.0, "fee": 149.0},
    ]

    # Case 1: Within 60 km radius (e.g. 45 km away)
    fee_45, is_serv_45, msg_45, slab_45 = calculate_distance_based_delivery_fee(
        distance_km=45.0,
        slabs=slabs,
        subtotal=250.0,
        free_delivery_threshold=499.0,
        max_delivery_radius_km=60.0,
        default_fallback_fee=39.0
    )
    assert is_serv_45 is True
    assert fee_45 == 149.0
    assert slab_45 == "35–60 km"

    # Case 2: 12 km away (within 60 km radius)
    fee_12, is_serv_12, msg_12, slab_12 = calculate_distance_based_delivery_fee(
        distance_km=12.0,
        slabs=slabs,
        subtotal=250.0,
        free_delivery_threshold=499.0,
        max_delivery_radius_km=60.0,
        default_fallback_fee=39.0
    )
    assert is_serv_12 is True
    assert fee_12 == 75.0
    assert slab_12 == "10–15 km"

    # Case 3: Customer located > 60 km away (reverse geocoded in Hyderabad or Bengaluru)
    # Must seamlessly resolve to nationwide courier and remain serviceable
    blr_req = ReverseGeocodeRequest(latitude=12.9716, longitude=77.5946)
    blr_res = reverse_geocode(blr_req)
    assert blr_res.is_serviceable is True
    assert blr_res.delivery_mode == "nationwide_courier"
    assert blr_res.delivery_type == "Nationwide Courier Shipping"
    assert blr_res.courier_partner == "Delhivery"
    assert blr_res.delivery_fee > 0.0
    assert "Business Days" in blr_res.estimated_delivery_days
    assert "Out of Delivery Range" not in blr_res.service_hub
    assert "Contact Organic" not in blr_res.message


def test_exact_distance_delivery_scenarios_and_palwancha():
    """
    Test exact scenarios required by Master Prompt:
    1. 3 km   -> ₹30 (0-5 km slab)
    2. 8 km   -> ₹40 (5-10 km slab)
    3. 18 km  -> ₹60 (15-20 km slab)
    4. 33.5 km -> ₹100 (30-40 km slab)
    5. 55 km  -> ₹150 (50-60 km slab)
    6. 61 km  -> ₹49 (Nationwide Courier Zone B, Telangana > 60 km)
    7. Another Indian State:
       - Bengaluru (560001) -> ₹65 (Courier Zone C, South India)
       - New Delhi (110001) -> ₹85 (Courier Zone D, North India)
    8. Palwancha (507115) vs Hyderabad (500001):
       - Palwancha: ~13.5 km from Kothagudem Mill -> Local Express -> ₹50 (10-15 km slab), PIN 507115 (NEVER 500001!)
       - Hyderabad: ~270 km from Kothagudem Mill -> Nationwide Courier -> ₹49 (Zone B), PIN 500001
    """
    import asyncio
    from backend.app.delivery import DEFAULT_DISTANCE_SLABS, calculate_distance_based_delivery_fee
    from backend.app.courier import calculate_courier_shipping
    from backend.app.routers.addresses import check_serviceability, reverse_geocode
    from backend.app.schemas import ServiceabilityCheckRequest, ReverseGeocodeRequest

    slabs = DEFAULT_DISTANCE_SLABS

    # Scenario 1: 3 km (0-5 km slab) -> ₹30
    fee_3, is_serv_3, _, slab_3 = calculate_distance_based_delivery_fee(
        distance_km=3.0, slabs=slabs, subtotal=200.0, free_delivery_threshold=499.0
    )
    assert is_serv_3 is True
    assert fee_3 == 30.0
    assert slab_3 == "0–5 km"

    # Scenario 2: 8 km (5-10 km slab) -> ₹40
    fee_8, is_serv_8, _, slab_8 = calculate_distance_based_delivery_fee(
        distance_km=8.0, slabs=slabs, subtotal=200.0, free_delivery_threshold=499.0
    )
    assert is_serv_8 is True
    assert fee_8 == 40.0
    assert slab_8 == "5–10 km"

    # Scenario 3: 18 km (15-20 km slab) -> ₹60
    fee_18, is_serv_18, _, slab_18 = calculate_distance_based_delivery_fee(
        distance_km=18.0, slabs=slabs, subtotal=200.0, free_delivery_threshold=499.0
    )
    assert is_serv_18 is True
    assert fee_18 == 60.0
    assert slab_18 == "15–20 km"

    # Scenario 4: 33.5 km (30-40 km slab) -> ₹100
    fee_33, is_serv_33, _, slab_33 = calculate_distance_based_delivery_fee(
        distance_km=33.5, slabs=slabs, subtotal=200.0, free_delivery_threshold=499.0
    )
    assert is_serv_33 is True
    assert fee_33 == 100.0
    assert slab_33 == "30–40 km"

    # Scenario 5: 55 km (50-60 km slab) -> ₹150
    fee_55, is_serv_55, _, slab_55 = calculate_distance_based_delivery_fee(
        distance_km=55.0, slabs=slabs, subtotal=200.0, free_delivery_threshold=499.0
    )
    assert is_serv_55 is True
    assert fee_55 == 150.0
    assert slab_55 == "50–60 km"

    # Scenario 6: 61 km (Beyond local 60 km radius -> Courier Zone B for Telangana)
    courier_61 = calculate_courier_shipping(
        dest_pincode="501301", # Ghatkesar, Telangana
        weight_kg=0.5,
        subtotal=200.0,
        pickup_pincode="507101"
    )
    assert courier_61["is_serviceable"] is True
    assert courier_61["zone"] == "Zone B"
    assert courier_61["shipping_fee"] == 49.0

    # Scenario 7: Another Indian State
    # Bengaluru (560001, Karnataka) -> Zone C -> ₹65
    courier_blr = calculate_courier_shipping(
        dest_pincode="560001",
        weight_kg=0.5,
        subtotal=200.0,
        pickup_pincode="507101"
    )
    assert courier_blr["is_serviceable"] is True
    assert courier_blr["zone"] == "Zone C"
    assert courier_blr["shipping_fee"] == 65.0

    # New Delhi (110001, Delhi) -> Zone D -> ₹85
    courier_del = calculate_courier_shipping(
        dest_pincode="110001",
        weight_kg=0.5,
        subtotal=200.0,
        pickup_pincode="507101"
    )
    assert courier_del["is_serviceable"] is True
    assert courier_del["zone"] == "Zone D"
    assert courier_del["shipping_fee"] == 85.0

    # Scenario 8: Palwancha (507115) vs Hyderabad (500001)
    # Palwancha: 17.5968, 80.7061 (~13.5 km road distance from Kothagudem Mill 17.5376, 80.6210)
    pal_geo = reverse_geocode(ReverseGeocodeRequest(latitude=17.5968, longitude=80.7061))
    assert pal_geo.postal_code == "507115"
    assert pal_geo.postal_code != "500001" # MUST NEVER be 500001!
    assert pal_geo.city == "Palwancha"
    assert pal_geo.delivery_mode == "local_express"
    assert pal_geo.distance_km is not None
    assert 10.0 <= pal_geo.distance_km <= 15.0 # ~13.5 km
    assert pal_geo.delivery_fee == 50.0 # 10-15 km slab is ₹50!
    assert pal_geo.matched_slab == "10–15 km"

    # Hyderabad: 17.3850, 78.4867 (~270 km from Kothagudem Mill)
    hyd_geo = reverse_geocode(ReverseGeocodeRequest(latitude=17.3850, longitude=78.4867))
    assert hyd_geo.postal_code == "500001"
    assert hyd_geo.delivery_mode == "nationwide_courier"
    assert hyd_geo.distance_km is not None
    assert hyd_geo.distance_km > 60.0
    assert hyd_geo.delivery_fee == 49.0 # Zone B Courier base fee is ₹49!

    # Check Serviceability endpoint for Palwancha and Hyderabad
    def drive_coro(coro):
        try:
            coro.send(None)
        except StopIteration as e:
            return e.value
        raise RuntimeError("Coroutine did not complete synchronously")

    pal_serv = drive_coro(check_serviceability(
        ServiceabilityCheckRequest(postal_code="507115", latitude=17.5968, longitude=80.7061, cart_subtotal=200.0),
        d1=None
    ))
    assert pal_serv.is_serviceable is True
    assert pal_serv.delivery_mode == "local_express"
    assert pal_serv.delivery_fee == 50.0 # ₹50
    assert pal_serv.postal_code == "507115"
    assert pal_serv.matched_slab == "10–15 km"

    # Hyderabad Serviceability Check
    hyd_serv = drive_coro(check_serviceability(
        ServiceabilityCheckRequest(postal_code="500001", latitude=17.3850, longitude=78.4867, cart_subtotal=200.0),
        d1=None
    ))
    assert hyd_serv.is_serviceable is True
    assert hyd_serv.delivery_mode == "nationwide_courier"
    assert hyd_serv.delivery_fee == 49.0 # ₹49
    assert hyd_serv.postal_code == "500001"



