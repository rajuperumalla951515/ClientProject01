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

def test_ghatkesar_no_abids_snap():
    """Verify Ghatkesar coordinates do NOT snap to Abids or 500001, and are marked Out of Delivery Range."""
    req = ReverseGeocodeRequest(latitude=17.4477, longitude=78.6833)
    res = reverse_geocode(req)
    
    # Must NOT be Hyderabad Abids / Koti or 500001
    assert "Abids" not in res.locality
    assert "Koti" not in res.locality
    assert res.postal_code != "500001"
    
    # Must reflect true distance from Kothagudem Mill (~240-270 km)
    assert res.distance_km is not None
    assert res.distance_km > 200.0
    
    # Must NOT contradict with Express 0 Mins
    assert res.is_serviceable is False
    assert res.estimated_delivery_minutes == 0
    assert res.delivery_fee == 0.0
    assert res.service_hub == "Out of Delivery Range"
    assert res.matched_slab is None

def test_babu_camp_mill_serviceable():
    """Verify Babu Camp coordinates near Kothagudem Mill are serviceable with express ETA and 0-2 km slab."""
    req = ReverseGeocodeRequest(latitude=17.5376, longitude=80.6210)
    res = reverse_geocode(req)
    
    assert res.is_serviceable is True
    assert res.distance_km is not None
    assert res.distance_km < 3.0
    assert res.estimated_delivery_minutes == 15
    assert res.delivery_fee == 20.0
    assert res.matched_slab == "0–2 km"
    assert res.postal_code == "507101"
    assert "Kothagudem" in res.city

@pytest.mark.anyio
async def test_serviceability_check_unserviceable_distance():
    """Verify serviceability check marks out-of-range coordinates unserviceable with 0 ETA and 0 fee."""
    req = ServiceabilityCheckRequest(
        postal_code="501301",
        latitude=17.4477,
        longitude=78.6833
    )
    res = await check_serviceability(req)
    assert res.is_serviceable is False
    assert res.estimated_delivery_minutes == 0
    assert res.delivery_fee == 0.0
    assert res.matched_slab is None
    assert res.service_hub == "Out of Delivery Range"

