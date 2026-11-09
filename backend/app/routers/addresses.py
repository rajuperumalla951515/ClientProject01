from typing import List, Optional, Any, Dict
import urllib.request
import urllib.parse
import json
import math
import os
import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from backend.app.config import settings
from backend.app.d1 import D1Database, get_d1
from backend.app.schemas import (
    AddressOut, AddressCreate, AddressUpdate,
    ReverseGeocodeRequest, ReverseGeocodeOut,
    ServiceabilityCheckRequest, ServiceabilityCheckOut,
    AddressSearchResultItem
)
from backend.app.deps import get_current_user
from backend.app.phone_utils import validate_and_normalize_indian_phone

try:
    from backend.app.delivery import (
        calculate_haversine_distance,
        get_road_distance_km,
        parse_distance_slabs,
        calculate_distance_based_delivery_fee,
        DEFAULT_DISTANCE_SLABS
    )
except ImportError:
    from app.delivery import (
        calculate_haversine_distance,
        get_road_distance_km,
        parse_distance_slabs,
        calculate_distance_based_delivery_fee,
        DEFAULT_DISTANCE_SLABS
    )

router = APIRouter(prefix="/addresses", tags=["Customer Addresses"])

# Telangana Regional Fulfillment Hubs for Hyperlocal Quick-Commerce & Scheduled Delivery
KNOWN_LOCALITY_CLUSTERS = [
    {"name": "Kothagudem (Babu Camp / Ganeshbasthi)", "city": "Kothagudem", "district": "Bhadradri Kothagudem", "state": "Telangana", "pin": "507101", "lat": 17.5376, "lon": 80.6210, "hub": "Sri Aditya Organics & Oil Mill", "minutes": 15},
    {"name": "Palwancha", "city": "Palwancha", "district": "Bhadradri Kothagudem", "state": "Telangana", "pin": "507115", "lat": 17.5968, "lon": 80.7061, "hub": "Sri Aditya Organics & Oil Mill", "minutes": 25},
    {"name": "Bhadrachalam", "city": "Bhadrachalam", "district": "Bhadradri Kothagudem", "state": "Telangana", "pin": "507111", "lat": 17.6689, "lon": 80.8936, "hub": "Sri Aditya Organics & Oil Mill", "minutes": 45},
    {"name": "Yellandu", "city": "Yellandu", "district": "Bhadradri Kothagudem", "state": "Telangana", "pin": "507123", "lat": 17.6015, "lon": 80.3340, "hub": "Sri Aditya Organics & Oil Mill", "minutes": 45},
    {"name": "Khammam Central", "city": "Khammam", "district": "Khammam", "state": "Telangana", "pin": "507001", "lat": 17.2473, "lon": 80.1514, "hub": "Khammam Regional Hub", "minutes": 40},
    {"name": "Hyderabad Central (Abids / Koti)", "city": "Hyderabad", "district": "Hyderabad", "state": "Telangana", "pin": "500001", "lat": 17.3850, "lon": 78.4867, "hub": "Sri Adithya Organics Central Hub", "minutes": 60},
    {"name": "Banjara Hills", "city": "Hyderabad", "district": "Hyderabad", "state": "Telangana", "pin": "500034", "lat": 17.4156, "lon": 78.4357, "hub": "Hyderabad Central Hub", "minutes": 60},
    {"name": "Jubilee Hills", "city": "Hyderabad", "district": "Hyderabad", "state": "Telangana", "pin": "500033", "lat": 17.4319, "lon": 78.4073, "hub": "Hyderabad Central Hub", "minutes": 60},
    {"name": "Madhapur / Hitec City", "city": "Hyderabad", "district": "Rangareddy", "state": "Telangana", "pin": "500081", "lat": 17.4474, "lon": 78.3762, "hub": "Hyderabad Cyber Hub", "minutes": 60},
    {"name": "Warangal", "city": "Warangal", "district": "Hanamkonda", "state": "Telangana", "pin": "506001", "lat": 17.9689, "lon": 79.5941, "hub": "Warangal Regional Hub", "minutes": 60},
]

# Comprehensive Indian Postal Region Mapping (All 2-digit circles)
PIN_REGION_MAP = {
    "11": ("New Delhi", "Delhi"),
    "12": ("Gurgaon / Faridabad", "Haryana"),
    "13": ("Ambala / Kurukshetra", "Haryana"),
    "14": ("Amritsar / Jalandhar", "Punjab"),
    "15": ("Bathinda / Firozpur", "Punjab"),
    "16": ("Chandigarh", "Chandigarh"),
    "17": ("Shimla / Kangra", "Himachal Pradesh"),
    "18": ("Jammu", "Jammu and Kashmir"),
    "19": ("Srinagar", "Jammu and Kashmir"),
    "20": ("Aligarh / Meerut", "Uttar Pradesh"),
    "21": ("Prayagraj / Kanpur", "Uttar Pradesh"),
    "22": ("Lucknow / Varanasi", "Uttar Pradesh"),
    "23": ("Mirzapur / Sonbhadra", "Uttar Pradesh"),
    "24": ("Dehradun / Haridwar", "Uttarakhand"),
    "25": ("Noida / Ghaziabad", "Uttar Pradesh"),
    "26": ("Bareilly / Pilibhit", "Uttar Pradesh"),
    "27": ("Gorakhpur / Basti", "Uttar Pradesh"),
    "28": ("Jhansi / Agra", "Uttar Pradesh"),
    "30": ("Jaipur", "Rajasthan"),
    "31": ("Udaipur / Kota", "Rajasthan"),
    "32": ("Ajmer / Bikaner", "Rajasthan"),
    "33": ("Jodhpur / Barmer", "Rajasthan"),
    "34": ("Jaisalmer / Nagaur", "Rajasthan"),
    "36": ("Rajkot / Jamnagar", "Gujarat"),
    "37": ("Kutch / Bhuj", "Gujarat"),
    "38": ("Ahmedabad / Gandhinagar", "Gujarat"),
    "39": ("Surat / Vadodara", "Gujarat"),
    "40": ("Mumbai", "Maharashtra"),
    "41": ("Pune / Kolhapur", "Maharashtra"),
    "42": ("Nashik / Jalgaon", "Maharashtra"),
    "43": ("Chhatrapati Sambhajinagar", "Maharashtra"),
    "44": ("Nagpur / Amravati", "Maharashtra"),
    "45": ("Indore / Ujjain", "Madhya Pradesh"),
    "46": ("Bhopal / Hoshangabad", "Madhya Pradesh"),
    "47": ("Gwalior / Morena", "Madhya Pradesh"),
    "48": ("Jabalpur / Chhindwara", "Madhya Pradesh"),
    "49": ("Raipur / Bilaspur", "Chhattisgarh"),
    "50": ("Kothagudem / Hyderabad", "Telangana"),
    "51": ("Tirupati / Rayalaseema", "Andhra Pradesh"),
    "52": ("Vijayawada / Guntur", "Andhra Pradesh"),
    "53": ("Visakhapatnam", "Andhra Pradesh"),
    "56": ("Bengaluru", "Karnataka"),
    "57": ("Mangaluru / Udupi", "Karnataka"),
    "58": ("Hubballi / Belagavi", "Karnataka"),
    "59": ("Kalaburagi / Ballari", "Karnataka"),
    "60": ("Chennai", "Tamil Nadu"),
    "61": ("Thanjavur / Tiruchirappalli", "Tamil Nadu"),
    "62": ("Madurai / Dindigul", "Tamil Nadu"),
    "63": ("Salem / Vellore", "Tamil Nadu"),
    "64": ("Coimbatore / Tiruppur", "Tamil Nadu"),
    "67": ("Kozhikode / Kannur", "Kerala"),
    "68": ("Kochi / Thrissur", "Kerala"),
    "69": ("Thiruvananthapuram / Kollam", "Kerala"),
    "70": ("Kolkata", "West Bengal"),
    "71": ("Howrah / Hooghly", "West Bengal"),
    "72": ("Midnapore", "West Bengal"),
    "73": ("Siliguri / Darjeeling", "West Bengal"),
    "74": ("Nadia / Murshidabad", "West Bengal"),
    "75": ("Bhubaneswar / Cuttack", "Odisha"),
    "76": ("Berhampur / Koraput", "Odisha"),
    "77": ("Rourkela / Sambalpur", "Odisha"),
    "78": ("Guwahati / Kamrup", "Assam"),
    "79": ("Shillong / Agartala / Imphal", "North East India"),
    "80": ("Patna / Gaya", "Bihar"),
    "81": ("Bhagalpur / Munger", "Bihar"),
    "82": ("Dhanbad / Bokaro", "Jharkhand"),
    "83": ("Ranchi / Jamshedpur", "Jharkhand"),
    "84": ("Muzaffarpur / Darbhanga", "Bihar"),
    "85": ("Purnia / Katihar", "Bihar"),
}

# Reverse-geocoding in-memory cache to prevent repeated external network requests (Requirement 10)
REVERSE_GEOCODE_CACHE: Dict[str, ReverseGeocodeOut] = {}

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Haversine formula for spherical distance in kilometers.
    """
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


@router.post("/reverse-geocode", response_model=ReverseGeocodeOut)
def reverse_geocode(geo: ReverseGeocodeRequest):
    lat, lon = geo.latitude, geo.longitude
    accuracy = geo.accuracy

    # 0. Check in-memory reverse-geocoding cache (~11m coordinate resolution)
    cache_key = f"{round(lat, 4)}_{round(lon, 4)}"
    if cache_key in REVERSE_GEOCODE_CACHE:
        cached = REVERSE_GEOCODE_CACHE[cache_key]
        return cached.model_copy(update={"accuracy_meters": accuracy})

    house_number = None
    building = None
    road = None
    neighbourhood = None
    resolved_locality = None
    resolved_city = None
    resolved_district = None
    resolved_state = None
    resolved_pin = None
    resolved_country = "India"
    resolved_formatted = None
    landmark = None
    is_incomplete = False

    # Check proximity to actual store: Sri Aditya Organics & Oil Mill (17.5376, 80.6210)
    store_dist = calculate_distance(lat, lon, 17.5376, 80.6210)
    if store_dist <= 1.5:
        resolved_locality = "Babu Camp / Ganeshbasthi"
        resolved_city = "Kothagudem"
        resolved_district = "Bhadradri Kothagudem"
        resolved_state = "Telangana"
        resolved_pin = "507101"
        road = "Babu Camp Road"

    # 1. Google Maps Geocoding API if configured
    google_key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if google_key and not resolved_city:
        try:
            g_url = f"https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lon}&key={google_key}&language=en"
            req = urllib.request.Request(g_url, headers={"User-Agent": "SriAdithyaOrganicsPlatform/2.0"})
            with urllib.request.urlopen(req, timeout=3.5) as resp:
                if resp.status == 200:
                    g_data = json.loads(resp.read().decode("utf-8"))
                    if g_data.get("results"):
                        first_res = g_data["results"][0]
                        resolved_formatted = first_res.get("formatted_address")
                        for comp in first_res.get("address_components", []):
                            types = comp.get("types", [])
                            name = comp.get("long_name", "")
                            if "street_number" in types or "premise" in types:
                                house_number = name
                            elif "subpremise" in types:
                                building = name
                            elif "route" in types:
                                road = name
                            elif "sublocality_level_1" in types or "sublocality" in types:
                                resolved_locality = name
                            elif "sublocality_level_2" in types or "neighborhood" in types:
                                neighbourhood = name
                            elif "locality" in types:
                                resolved_city = name
                            elif "administrative_area_level_2" in types:
                                resolved_district = name
                            elif "administrative_area_level_1" in types:
                                resolved_state = name
                            elif "postal_code" in types:
                                resolved_pin = name
                            elif "country" in types:
                                resolved_country = name
        except Exception:
            pass

    # 2. Photon (Komoot OSM) Reverse Geocoder — fast, reliable Pan-India OSM data
    if not resolved_city or not resolved_pin:
        try:
            p_url = f"https://photon.komoot.io/reverse?lat={lat}&lon={lon}"
            req = urllib.request.Request(p_url, headers={"User-Agent": "SriAdithyaOrganicsPlatform/2.0"})
            with urllib.request.urlopen(req, timeout=3.5) as resp:
                if resp.status == 200:
                    p_data = json.loads(resp.read().decode("utf-8"))
                    if p_data.get("features"):
                        props = p_data["features"][0].get("properties", {})
                        road = road or props.get("street")
                        if props.get("type") in ("house", "building"):
                            building = building or props.get("name")
                        resolved_locality = resolved_locality or props.get("district") or props.get("locality") or props.get("suburb") or props.get("name")
                        resolved_city = resolved_city or props.get("city") or props.get("town") or props.get("village") or props.get("county")
                        resolved_district = resolved_district or props.get("county") or props.get("district")
                        resolved_state = resolved_state or props.get("state")
                        resolved_pin = resolved_pin or props.get("postcode")
                        resolved_country = props.get("country") or resolved_country
        except Exception:
            pass

    # 3. BigDataCloud Reverse Geocoder
    if not resolved_city or not resolved_pin:
        try:
            bdc_url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lon}&localityLanguage=en"
            req = urllib.request.Request(bdc_url, headers={"User-Agent": "SriAdithyaOrganicsPlatform/2.0"})
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                if resp.status == 200:
                    bdc_data = json.loads(resp.read().decode("utf-8"))
                    resolved_locality = resolved_locality or bdc_data.get("locality")
                    resolved_city = resolved_city or bdc_data.get("city") or bdc_data.get("locality")
                    resolved_district = resolved_district or bdc_data.get("principalSubdivisionCode")
                    resolved_state = resolved_state or bdc_data.get("principalSubdivision")
                    resolved_pin = resolved_pin or bdc_data.get("postcode")
                    resolved_country = bdc_data.get("countryName") or resolved_country
        except Exception:
            pass

    # 4. OpenStreetMap Nominatim reverse geocode (Pan-India)
    if not resolved_city or not resolved_pin:
        try:
            url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&addressdetails=1"
            req = urllib.request.Request(url, headers={"User-Agent": "SriAdithyaOrganicsPlatform/2.0 (care@sriadithyaorganics.com)"})
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    resolved_formatted = resolved_formatted or data.get("display_name")
                    addr = data.get("address", {})
                    house_number = house_number or addr.get("house_number")
                    building = building or addr.get("building") or addr.get("commercial") or addr.get("residential")
                    road = road or addr.get("road") or addr.get("pedestrian") or addr.get("street")
                    neighbourhood = neighbourhood or addr.get("neighbourhood") or addr.get("suburb")
                    resolved_locality = resolved_locality or addr.get("suburb") or addr.get("neighbourhood") or addr.get("residential") or addr.get("village")
                    resolved_city = resolved_city or addr.get("city") or addr.get("town") or addr.get("village") or addr.get("municipality") or addr.get("county")
                    resolved_district = resolved_district or addr.get("state_district") or addr.get("county")
                    resolved_state = resolved_state or addr.get("state")
                    resolved_pin = resolved_pin or addr.get("postcode")
                    resolved_country = addr.get("country") or resolved_country
        except Exception:
            pass

    # 5. Fallback without assuming Hyderabad or Abids
    in_telangana = (15.8 <= lat <= 19.9) and (77.2 <= lon <= 81.8)
    if not resolved_city:
        resolved_city = resolved_district or ("Telangana" if in_telangana else "India")
        is_incomplete = True
    if not resolved_locality:
        resolved_locality = road or resolved_city
    if not resolved_state:
        resolved_state = "Telangana" if in_telangana else "India"
    if not resolved_pin:
        resolved_pin = "507101" if store_dist <= 2.5 else ""
        if not resolved_pin:
            is_incomplete = True

    street_parts = [p for p in [building, road, resolved_locality] if p and p != resolved_city]
    street_line = ", ".join(dict.fromkeys(street_parts)) if street_parts else resolved_locality

    if not resolved_formatted:
        pin_suffix = f" - {resolved_pin}" if resolved_pin else ""
        dist_suffix = f", {resolved_district}" if resolved_district and resolved_district != resolved_city else ""
        resolved_formatted = f"{street_line}, {resolved_city}{dist_suffix}, {resolved_state}{pin_suffix}"

    # Calculate actual road distance from Kothagudem store (17.5376, 80.6210)
    store_lat = 17.5376
    store_lon = 80.6210
    road_dist = store_dist * 1.22
    distance_source = "haversine_road_estimate"
    try:
        dist_km_calc, d_source = get_road_distance_km(store_lat, store_lon, lat, lon)
        if dist_km_calc is not None:
            road_dist = dist_km_calc
            distance_source = d_source
    except Exception:
        pass

    # Dynamic distance fee calculation based on actual distance
    slabs = DEFAULT_DISTANCE_SLABS
    max_delivery_radius_km = 60.0
    calculated_fee, is_serviceable, fee_msg, matched_slab = calculate_distance_based_delivery_fee(
        distance_km=road_dist,
        slabs=slabs,
        subtotal=0.0,
        free_delivery_threshold=499.0,
        max_delivery_radius_km=max_delivery_radius_km,
        default_fallback_fee=39.0
    )

    if not is_serviceable:
        est_minutes = 0
        serv_hub = "Out of Delivery Range"
        serv_msg = f"Delivery currently unavailable to this location ({road_dist:.0f} km from Kothagudem Mill; max direct delivery radius is {int(max_delivery_radius_km)} km)."
        calculated_fee = 0.0
        matched_slab = None
    else:
        if road_dist <= 2.0:
            est_minutes = 15
        elif road_dist <= 5.0:
            est_minutes = 20
        elif road_dist <= 15.0:
            est_minutes = 30
        elif road_dist <= 35.0:
            est_minutes = 45
        elif road_dist <= 60.0:
            est_minutes = 75
        else:
            est_minutes = 90
        serv_hub = "Sri Aditya Organics & Oil Mill (Kothagudem)" if road_dist <= 35.0 else "Sri Aditya Organics Regional Hub"
        serv_msg = f"Delivery Available (~{road_dist:.1f} km from Kothagudem Mill)"

    out = ReverseGeocodeOut(
        latitude=lat,
        longitude=lon,
        accuracy_meters=accuracy,
        house_number=house_number,
        building=building,
        apartment=building,
        road=road,
        street=street_line,
        locality=resolved_locality,
        neighbourhood=neighbourhood,
        landmark=landmark,
        city=resolved_city,
        district=resolved_district,
        state=resolved_state,
        postal_code=resolved_pin or "",
        country=resolved_country,
        formatted_address=resolved_formatted,
        is_serviceable=is_serviceable,
        estimated_delivery_minutes=est_minutes,
        service_hub=serv_hub,
        message=serv_msg,
        distance_km=round(road_dist, 1),
        delivery_fee=calculated_fee,
        matched_slab=matched_slab,
        is_incomplete=is_incomplete,
        source="gps_detected"
    )

    if not is_incomplete:
        REVERSE_GEOCODE_CACHE[cache_key] = out
    return out


@router.get("/search", response_model=List[AddressSearchResultItem])
def search_address(query: str = Query(..., min_length=2)):
    results = []
    seen_places = set()
    q_clean = query.strip()
    encoded = urllib.parse.quote(q_clean)

    # 1. Photon search (Komoot OSM) — fast and reliable
    try:
        p_url = f"https://photon.komoot.io/api/?q={encoded}&limit=8"
        req = urllib.request.Request(p_url, headers={"User-Agent": "SriAdithyaOrganicsPlatform/2.0"})
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            if resp.status == 200:
                p_data = json.loads(resp.read().decode("utf-8"))
                for feat in p_data.get("features", []):
                    props = feat.get("properties", {})
                    coords = feat.get("geometry", {}).get("coordinates", [])
                    if len(coords) >= 2:
                        lon_val, lat_val = float(coords[0]), float(coords[1])
                        key = (round(lat_val, 3), round(lon_val, 3))
                        if key not in seen_places:
                            seen_places.add(key)
                            name_val = props.get("name") or props.get("street") or q_clean
                            city_val = props.get("city") or props.get("county") or ""
                            dist_val = props.get("county") or props.get("district") or ""
                            state_val = props.get("state") or ""
                            pin_val = props.get("postcode") or ""
                            parts = [name_val, city_val, state_val]
                            disp = ", ".join([p for p in parts if p])
                            if pin_val:
                                disp += f" - {pin_val}"
                            results.append(AddressSearchResultItem(
                                place_id=str(props.get("osm_id", f"{lat_val}_{lon_val}")),
                                formatted_address=disp,
                                locality=props.get("district") or props.get("locality") or name_val,
                                city=city_val or dist_val or "India",
                                district=dist_val or None,
                                state=state_val or "India",
                                postal_code=pin_val,
                                latitude=lat_val,
                                longitude=lon_val
                            ))
    except Exception:
        pass

    # 2. Nominatim search (Pan-India) if needed
    if len(results) < 4:
        try:
            url = f"https://nominatim.openstreetmap.org/search?q={encoded}&format=json&addressdetails=1&countrycodes=in&limit=8"
            req = urllib.request.Request(url, headers={"User-Agent": "SriAdithyaOrganicsPlatform/2.0 (care@sriadithyaorganics.com)"})
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    for it in data:
                        lat_val, lon_val = float(it["lat"]), float(it["lon"])
                        key = (round(lat_val, 3), round(lon_val, 3))
                        if key not in seen_places:
                            seen_places.add(key)
                            addr = it.get("address", {})
                            pin = addr.get("postcode", "")
                            city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("municipality") or addr.get("state_district") or addr.get("county") or ""
                            st = addr.get("state", "")
                            dist = addr.get("state_district") or addr.get("county") or ""
                            loc = addr.get("suburb") or addr.get("neighbourhood") or addr.get("residential") or addr.get("road") or it.get("name") or ""
                            results.append(AddressSearchResultItem(
                                place_id=str(it.get("place_id")),
                                formatted_address=it.get("display_name"),
                                locality=loc,
                                city=city,
                                district=dist,
                                state=st,
                                postal_code=pin,
                                latitude=lat_val,
                                longitude=lon_val
                            ))
        except Exception:
            pass

    # 3. Known locality clusters
    q_lower = q_clean.lower()
    for c in KNOWN_LOCALITY_CLUSTERS:
        if q_lower in c["name"].lower() or q_lower in c["city"].lower() or q_lower == c["pin"]:
            key = (round(c["lat"], 3), round(c["lon"], 3))
            if key not in seen_places:
                seen_places.add(key)
                results.append(AddressSearchResultItem(
                    place_id=f"cluster_{c['pin']}",
                    formatted_address=f"{c['name']}, {c['city']}, {c['state']} - {c['pin']}",
                    locality=c["name"],
                    city=c["city"],
                    district=c.get("district"),
                    state=c["state"],
                    postal_code=c["pin"],
                    latitude=c["lat"],
                    longitude=c["lon"]
                ))
    return results


@router.post("/check-serviceability", response_model=ServiceabilityCheckOut)
async def check_serviceability(req: ServiceabilityCheckRequest, d1: D1Database = Depends(get_d1)):
    """
    Intelligent Telangana Delivery Eligibility Engine
    Checks:
      1. Validated 6-digit Indian PIN code.
      2. Configured delivery zones in database.
      3. Distance from actual store location using Haversine formula.
      4. Configured delivery radius and fees.
    """
    # 1. Fetch store delivery settings
    min_order = 99.0
    free_thresh = 499.0
    std_fee = 39.0
    store_lat = 17.5376
    store_lon = 80.6210
    delivery_radius_km = 35.0
    max_express_radius_km = 15.0
    store_addr = "Sri Aditya Organics & Oil Mill, Jilla Parishad Complex, Babu Camp Road, Ganeshbasthi, Opp. Babu Camp Ramalayam, Kothagudem, Telangana 507101"
    store_maps = "https://share.google/e1aO3V8FJQ7USIKzU"

    try:
        setting = await d1.fetch_one("SELECT * FROM delivery_settings LIMIT 1")
        if setting:
            min_order = float(setting.get("min_order_amount") or 99.0)
            free_thresh = float(setting.get("free_delivery_threshold") or 499.0)
            std_fee = float(setting.get("standard_delivery_fee") or 39.0)
            if setting.get("store_latitude") is not None:
                store_lat = float(setting["store_latitude"])
            if setting.get("store_longitude") is not None:
                store_lon = float(setting["store_longitude"])
            if setting.get("delivery_radius_km") is not None:
                delivery_radius_km = float(setting["delivery_radius_km"])
            if setting.get("max_express_radius_km") is not None:
                max_express_radius_km = float(setting["max_express_radius_km"])
            if setting.get("store_address"):
                store_addr = setting["store_address"]
            if setting.get("store_maps_url"):
                store_maps = setting["store_maps_url"]
    except Exception as e:
        print(f"[Serviceability] Settings fetch notice: {e}")

    pin = (req.postal_code or "").strip()
    is_valid_pin = len(pin) == 6 and pin.isdigit()
    matching_cluster = next((c for c in KNOWN_LOCALITY_CLUSTERS if c["pin"] == pin), None)

    if not is_valid_pin:
        return ServiceabilityCheckOut(
            is_serviceable=False,
            status="Address Verification Required",
            postal_code=pin,
            city="Telangana",
            locality="Delivery Area",
            estimated_delivery_minutes=0,
            delivery_fee=std_fee,
            distance_km=None,
            min_order_amount=min_order,
            free_delivery_threshold=free_thresh,
            service_hub="Sri Aditya Organics & Oil Mill (Kothagudem)",
            message="Please provide a valid 6-digit postal code to check delivery availability.",
            store_address=store_addr,
            store_maps_url=store_maps
        )

    # 2. Check if PIN exists in active delivery_zones table
    zone = None
    try:
        zone = await d1.fetch_one(
            "SELECT * FROM delivery_zones WHERE pincode = ? AND is_active = 1",
            pin
        )
    except Exception:
        pass

    # 3. Calculate distance if coordinates provided or match cluster
    distance_km = None
    distance_source = None
    if req.latitude is not None and req.longitude is not None:
        try:
            distance_km, distance_source = get_road_distance_km(store_lat, store_lon, float(req.latitude), float(req.longitude))
        except Exception:
            pass
    elif matching_cluster and matching_cluster.get("lat") is not None and matching_cluster.get("lon") is not None:
        try:
            distance_km, distance_source = get_road_distance_km(store_lat, store_lon, float(matching_cluster["lat"]), float(matching_cluster["lon"]))
        except Exception:
            pass

    # 4. Resolve City, Locality & Hub
    if zone:
        city = "Kothagudem" if pin == "507101" else ("Hyderabad" if pin.startswith("500") else "Telangana")
        locality = zone["area_name"]
        hub = "Sri Aditya Organics Direct Fulfillment Hub"
    elif matching_cluster:
        city = matching_cluster["city"]
        locality = matching_cluster["name"]
        hub = matching_cluster["hub"]
    else:
        reg = PIN_REGION_MAP.get(pin[:2])
        city = reg[0] if reg else "Telangana"
        locality = f"PIN {pin}"
        hub = "Sri Aditya Organics Regional Fulfillment Hub"

    # 5. Evaluate dynamic distance-based delivery fee
    slabs = parse_distance_slabs(setting.get("distance_slabs_json") if setting else None)
    subtotal = float(req.cart_subtotal or 0.0)

    calculated_fee, is_serv, fee_msg, matched_slab = calculate_distance_based_delivery_fee(
        distance_km=distance_km,
        slabs=slabs,
        subtotal=subtotal,
        free_delivery_threshold=free_thresh,
        max_delivery_radius_km=delivery_radius_km,
        default_fallback_fee=std_fee
    )

    # Zone configuration override (if explicit active zone defined for this pincode)
    if zone:
        is_serv = True
        zone_fee = float(zone.get("delivery_fee") or 0.0)
        if subtotal >= free_thresh:
            calculated_fee = 0.0
        elif zone_fee > 0:
            calculated_fee = max(calculated_fee, zone_fee)
        fee_msg = f"Delivery Available in {locality} ({zone.get('estimated_delivery_time', '15-30 Mins')})"

    # Calculate estimated delivery minutes based on road distance
    if distance_km is not None and is_serv:
        if distance_km <= 2.0:
            minutes = 15
        elif distance_km <= 5.0:
            minutes = 20
        elif distance_km <= 15.0:
            minutes = 30
        elif distance_km <= 35.0:
            minutes = 45
        elif distance_km <= 60.0:
            minutes = 75
        else:
            minutes = 90
    elif matching_cluster and is_serv:
        minutes = matching_cluster["minutes"]
    elif zone and zone.get("estimated_delivery_time") and is_serv:
        minutes = 15 if "15" in str(zone.get("estimated_delivery_time")) else 30
    else:
        minutes = 0

    if not is_serv:
        return ServiceabilityCheckOut(
            is_serviceable=False,
            status="Delivery Not Available",
            postal_code=pin,
            city=city,
            locality=locality,
            estimated_delivery_minutes=0,
            delivery_fee=0.0,
            distance_km=distance_km,
            distance_source=distance_source,
            matched_slab=None,
            min_order_amount=min_order,
            free_delivery_threshold=free_thresh,
            service_hub="Out of Delivery Range",
            message=fee_msg,
            store_address=store_addr,
            store_maps_url=store_maps
        )

    status_label = "Delivery Available" if (distance_km is not None and distance_km <= max_express_radius_km) or (subtotal >= free_thresh) else "Delivery Available with Distance Charges"

    return ServiceabilityCheckOut(
        is_serviceable=True,
        status=status_label,
        postal_code=pin,
        city=city,
        locality=locality,
        estimated_delivery_minutes=minutes,
        delivery_fee=calculated_fee,
        distance_km=distance_km,
        distance_source=distance_source,
        matched_slab=matched_slab,
        min_order_amount=min_order,
        free_delivery_threshold=free_thresh,
        service_hub=hub,
        message=fee_msg,
        store_address=store_addr,
        store_maps_url=store_maps
    )


@router.get("", response_model=List[AddressOut])
async def get_user_addresses(
    d1: D1Database = Depends(get_d1),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    rows = await d1.fetch_all(
        "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC",
        current_user["id"]
    )
    return [AddressOut(**r) for r in rows]


@router.post("", response_model=AddressOut, status_code=status.HTTP_201_CREATED)
async def create_address(
    address_in: AddressCreate,
    d1: D1Database = Depends(get_d1),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = current_user["id"]
    
    # Validate and normalize phone
    is_valid_phone, norm_phone, phone_err = validate_and_normalize_indian_phone(address_in.phone)
    if not is_valid_phone or not norm_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=phone_err or "Invalid Indian mobile number for address."
        )

    count_row = await d1.fetch_one("SELECT count(*) as c FROM addresses WHERE user_id = ?", user_id)
    count = count_row["c"] if count_row else 0
    is_default = address_in.is_default or (count == 0)

    if is_default:
        await d1.execute("UPDATE addresses SET is_default = 0 WHERE user_id = ?", user_id)

    now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    confirmed_at_str = address_in.confirmed_at.strftime("%Y-%m-%d %H:%M:%S") if address_in.confirmed_at else now

    sql = """
        INSERT INTO addresses (
            user_id, label, recipient_name, phone, street, apartment,
            house_number, locality, landmark, city, state, postal_code,
            latitude, longitude, accuracy_meters, formatted_address,
            confirmed_at, is_default, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    clean_pin = address_in.postal_code.strip()
    fallback_city, fallback_state = ("Kothagudem", "Telangana")
    if len(clean_pin) >= 2 and clean_pin[:2] in PIN_REGION_MAP:
        fallback_city, fallback_state = PIN_REGION_MAP[clean_pin[:2]]

    resolved_city = (address_in.city or "").strip() or fallback_city
    resolved_state = (address_in.state or "").strip() or fallback_state

    new_id = await d1.execute_insert(
        sql,
        user_id,
        address_in.label,
        address_in.recipient_name.strip(),
        norm_phone,
        address_in.street.strip(),
        address_in.apartment,
        address_in.house_number,
        address_in.locality,
        address_in.landmark,
        resolved_city,
        resolved_state,
        clean_pin,
        address_in.latitude,
        address_in.longitude,
        address_in.accuracy_meters,
        address_in.formatted_address,
        confirmed_at_str,
        1 if is_default else 0,
        now
    )

    new_addr = await d1.fetch_one("SELECT * FROM addresses WHERE id = ?", new_id)
    return AddressOut(**new_addr)


@router.put("/{address_id}", response_model=AddressOut)
async def update_address(
    address_id: int,
    address_in: AddressUpdate,
    d1: D1Database = Depends(get_d1),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = current_user["id"]
    address = await d1.fetch_one(
        "SELECT * FROM addresses WHERE id = ? AND user_id = ?",
        address_id, user_id
    )
    if not address:
        raise HTTPException(status_code=404, detail="Address not found.")

    update_dict = address_in.model_dump(exclude_unset=True)
    if "phone" in update_dict and update_dict["phone"]:
        is_val, norm, err = validate_and_normalize_indian_phone(update_dict["phone"])
        if not is_val or not norm:
            raise HTTPException(status_code=400, detail=err or "Invalid phone format.")
        update_dict["phone"] = norm

    if update_dict.get("is_default"):
        await d1.execute("UPDATE addresses SET is_default = 0 WHERE user_id = ?", user_id)

    fields = []
    params = []
    for k, v in update_dict.items():
        fields.append(f"{k} = ?")
        params.append(1 if (k == "is_default" and v is True) else 0 if (k == "is_default" and v is False) else v)
    params.extend([address_id, user_id])

    await d1.execute(f"UPDATE addresses SET {', '.join(fields)} WHERE id = ? AND user_id = ?", *params)
    updated = await d1.fetch_one("SELECT * FROM addresses WHERE id = ?", address_id)
    return AddressOut(**updated)


@router.put("/{address_id}/set-default", response_model=AddressOut)
async def set_default_address(
    address_id: int,
    d1: D1Database = Depends(get_d1),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = current_user["id"]
    address = await d1.fetch_one(
        "SELECT * FROM addresses WHERE id = ? AND user_id = ?",
        address_id, user_id
    )
    if not address:
        raise HTTPException(status_code=404, detail="Address not found.")

    await d1.execute("UPDATE addresses SET is_default = 0 WHERE user_id = ?", user_id)
    await d1.execute("UPDATE addresses SET is_default = 1 WHERE id = ?", address_id)
    updated = await d1.fetch_one("SELECT * FROM addresses WHERE id = ?", address_id)
    return AddressOut(**updated)


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_address(
    address_id: int,
    d1: D1Database = Depends(get_d1),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = current_user["id"]
    address = await d1.fetch_one(
        "SELECT * FROM addresses WHERE id = ? AND user_id = ?",
        address_id, user_id
    )
    if not address:
        raise HTTPException(status_code=404, detail="Address not found.")

    await d1.execute("DELETE FROM addresses WHERE id = ? AND user_id = ?", address_id, user_id)
    return None
