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

router = APIRouter(prefix="/addresses", tags=["Customer Addresses"])

# Telangana Regional Fulfillment Hubs for Hyperlocal Quick-Commerce & Scheduled Delivery
KNOWN_LOCALITY_CLUSTERS = [
    {"name": "Hyderabad Central (Abids / Koti)", "city": "Hyderabad", "district": "Hyderabad", "state": "Telangana", "pin": "500001", "lat": 17.3850, "lon": 78.4867, "hub": "Sri Adithya Organics Central Hub", "minutes": 15},
    {"name": "Banjara Hills", "city": "Hyderabad", "district": "Hyderabad", "state": "Telangana", "pin": "500034", "lat": 17.4156, "lon": 78.4357, "hub": "Hyderabad Central Hub", "minutes": 20},
    {"name": "Jubilee Hills", "city": "Hyderabad", "district": "Hyderabad", "state": "Telangana", "pin": "500033", "lat": 17.4319, "lon": 78.4073, "hub": "Hyderabad Central Hub", "minutes": 20},
    {"name": "Madhapur / Hitec City", "city": "Hyderabad", "district": "Rangareddy", "state": "Telangana", "pin": "500081", "lat": 17.4474, "lon": 78.3762, "hub": "Hyderabad Cyber Hub", "minutes": 25},
    {"name": "Gachibowli", "city": "Hyderabad", "district": "Rangareddy", "state": "Telangana", "pin": "500032", "lat": 17.4401, "lon": 78.3489, "hub": "Hyderabad Cyber Hub", "minutes": 25},
    {"name": "Kondapur", "city": "Hyderabad", "district": "Rangareddy", "state": "Telangana", "pin": "500084", "lat": 17.4699, "lon": 78.3578, "hub": "Hyderabad West Hub", "minutes": 25},
    {"name": "Secunderabad", "city": "Hyderabad", "district": "Hyderabad", "state": "Telangana", "pin": "500003", "lat": 17.4399, "lon": 78.4983, "hub": "North Hyderabad Hub", "minutes": 25},
    {"name": "Kukatpally", "city": "Hyderabad", "district": "Medchal-Malkajgiri", "state": "Telangana", "pin": "500072", "lat": 17.4938, "lon": 78.3999, "hub": "North-West Hyderabad Hub", "minutes": 30},
    {"name": "Begumpet", "city": "Hyderabad", "district": "Hyderabad", "state": "Telangana", "pin": "500016", "lat": 17.4447, "lon": 78.4664, "hub": "Central Hyderabad Hub", "minutes": 20},
    {"name": "Somajiguda", "city": "Hyderabad", "district": "Hyderabad", "state": "Telangana", "pin": "500082", "lat": 17.4262, "lon": 78.4552, "hub": "Hyderabad Central Hub", "minutes": 20},
    {"name": "Kothagudem", "city": "Kothagudem", "district": "Bhadradri Kothagudem", "state": "Telangana", "pin": "507101", "lat": 17.5526, "lon": 80.6190, "hub": "Bhadradri Regional Hub", "minutes": 35},
    {"name": "Warangal", "city": "Warangal", "district": "Hanamkonda", "state": "Telangana", "pin": "506001", "lat": 17.9689, "lon": 79.5941, "hub": "Warangal Regional Hub", "minutes": 40},
    {"name": "Khammam", "city": "Khammam", "district": "Khammam", "state": "Telangana", "pin": "507001", "lat": 17.2473, "lon": 80.1514, "hub": "Khammam Regional Hub", "minutes": 40},
    {"name": "Karimnagar", "city": "Karimnagar", "district": "Karimnagar", "state": "Telangana", "pin": "505001", "lat": 18.4386, "lon": 79.1288, "hub": "Karimnagar Regional Hub", "minutes": 45},
    {"name": "Nizamabad", "city": "Nizamabad", "district": "Nizamabad", "state": "Telangana", "pin": "503001", "lat": 18.6725, "lon": 78.0941, "hub": "Nizamabad Regional Hub", "minutes": 45},
]

# Indian Postal Region Mapping
PIN_REGION_MAP = {
    "50": ("Hyderabad", "Telangana"),
    "51": ("Tirupati / Rayalaseema", "Andhra Pradesh"),
    "52": ("Vijayawada / Guntur", "Andhra Pradesh"),
    "53": ("Visakhapatnam", "Andhra Pradesh"),
    "56": ("Bengaluru", "Karnataka"),
    "60": ("Chennai", "Tamil Nadu"),
    "64": ("Coimbatore", "Tamil Nadu"),
    "40": ("Mumbai", "Maharashtra"),
    "11": ("New Delhi", "Delhi"),
}

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

    house_number = None
    building = None
    road = None
    neighbourhood = None
    resolved_locality = None
    resolved_city = None
    resolved_district = None
    resolved_state = None
    resolved_pin = None
    resolved_formatted = None
    landmark = None

    # 1. Google Maps Geocoding API if key configured
    google_key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if google_key:
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
        except Exception:
            pass

    # 2. OpenStreetMap Nominatim reverse geocode
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
                    resolved_locality = resolved_locality or addr.get("suburb") or addr.get("neighbourhood") or addr.get("residential")
                    resolved_city = resolved_city or addr.get("city") or addr.get("town") or addr.get("village") or addr.get("county")
                    resolved_district = resolved_district or addr.get("state_district") or addr.get("county")
                    resolved_state = resolved_state or addr.get("state")
                    resolved_pin = resolved_pin or addr.get("postcode")
        except Exception:
            pass

    # 3. Nearest Telangana Cluster fallback
    closest_cluster = None
    min_dist = float("inf")
    for cluster in KNOWN_LOCALITY_CLUSTERS:
        dist = calculate_distance(lat, lon, cluster["lat"], cluster["lon"])
        if dist < min_dist:
            min_dist = dist
            closest_cluster = cluster

    if closest_cluster and (not resolved_city or min_dist < 30.0):
        if not resolved_locality:
            resolved_locality = closest_cluster["name"]
        if not resolved_city:
            resolved_city = closest_cluster["city"]
        if not resolved_district:
            resolved_district = closest_cluster.get("district")
        if not resolved_state:
            resolved_state = closest_cluster["state"]
        if not resolved_pin:
            resolved_pin = closest_cluster["pin"]

    # 4. Final Safe Fallbacks: Strictly Telangana-based
    resolved_locality = resolved_locality or "Hyderabad Central"
    resolved_city = resolved_city or "Hyderabad"
    resolved_district = resolved_district or "Hyderabad"
    resolved_state = resolved_state or "Telangana"
    resolved_pin = (resolved_pin or "500001").strip()

    street_parts = [p for p in [building, road, neighbourhood] if p]
    street_line = ", ".join(street_parts) if street_parts else resolved_locality

    if not resolved_formatted:
        resolved_formatted = f"{street_line}, {resolved_locality}, {resolved_city}, {resolved_state} - {resolved_pin}"

    return ReverseGeocodeOut(
        latitude=lat,
        longitude=lon,
        accuracy_meters=accuracy,
        house_number=house_number,
        apartment=building,
        street=street_line,
        locality=resolved_locality,
        landmark=landmark,
        city=resolved_city,
        district=resolved_district,
        state=resolved_state,
        postal_code=resolved_pin,
        formatted_address=resolved_formatted,
        delivery_cluster=closest_cluster["name"] if closest_cluster else "Hyderabad Central",
        estimated_delivery_minutes=closest_cluster["minutes"] if closest_cluster else 25,
        service_hub=closest_cluster["hub"] if closest_cluster else "Sri Adithya Organics Central Fulfillment Hub"
    )


@router.get("/search", response_model=List[AddressSearchResultItem])
def search_address(query: str = Query(..., min_length=2)):
    results = []
    try:
        encoded = urllib.parse.quote(f"{query}, Telangana, India")
        url = f"https://nominatim.openstreetmap.org/search?q={encoded}&format=json&addressdetails=1&countrycodes=in&limit=6"
        req = urllib.request.Request(url, headers={"User-Agent": "SriAdithyaOrganicsPlatform/2.0"})
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                for it in data:
                    addr = it.get("address", {})
                    pin = addr.get("postcode", "")
                    city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("county", "Hyderabad")
                    st = addr.get("state", "Telangana")
                    loc = addr.get("suburb") or addr.get("neighbourhood") or addr.get("residential") or it.get("name")
                    results.append(AddressSearchResultItem(
                        place_id=str(it.get("place_id")),
                        formatted_address=it.get("display_name"),
                        locality=loc,
                        city=city,
                        state=st,
                        postal_code=pin,
                        latitude=float(it["lat"]),
                        longitude=float(it["lon"])
                    ))
    except Exception:
        pass

    if not results:
        q_lower = query.lower()
        for c in KNOWN_LOCALITY_CLUSTERS:
            if q_lower in c["name"].lower() or q_lower in c["city"].lower() or q_lower == c["pin"]:
                results.append(AddressSearchResultItem(
                    place_id=f"cluster_{c['pin']}",
                    formatted_address=f"{c['name']}, {c['city']}, {c['state']} - {c['pin']}",
                    locality=c["name"],
                    city=c["city"],
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
    store_lat = 17.3850
    store_lon = 78.4867
    delivery_radius_km = 35.0
    max_express_radius_km = 15.0
    store_addr = "Sri Adithya Organics, Hyderabad, Telangana, India"

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
    except Exception as e:
        print(f"[Serviceability] Settings fetch notice: {e}")

    pin = (req.postal_code or "").strip()
    is_valid_pin = len(pin) == 6 and pin.isdigit()

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
            service_hub="Sri Adithya Organics Central Fulfillment Hub",
            message="Please provide a valid 6-digit postal code to check delivery availability.",
            store_address=store_addr
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

    # 3. Calculate distance if coordinates provided
    distance_km = None
    if req.latitude is not None and req.longitude is not None:
        try:
            distance_km = round(calculate_distance(store_lat, store_lon, req.latitude, req.longitude), 1)
        except Exception:
            pass

    # 4. Resolve City, Locality & Hub
    matching_cluster = next((c for c in KNOWN_LOCALITY_CLUSTERS if c["pin"] == pin), None)
    if zone:
        city = "Hyderabad" if pin.startswith("500") else "Telangana"
        locality = zone["area_name"]
        minutes = 20 if "15" in str(zone.get("estimated_delivery_time", "")) else 35
        hub = "Sri Adithya Organics Direct Fulfillment Hub"
    elif matching_cluster:
        city = matching_cluster["city"]
        locality = matching_cluster["name"]
        minutes = matching_cluster["minutes"]
        hub = matching_cluster["hub"]
    else:
        reg = PIN_REGION_MAP.get(pin[:2])
        city = reg[0] if reg else "Telangana"
        locality = f"PIN {pin}"
        minutes = 45
        hub = "Sri Adithya Organics Regional Delivery Hub"

    # 5. Evaluate Eligibility & Applicable Fee
    is_free = (req.cart_subtotal or 0.0) >= free_thresh
    calc_fee = 0.0 if is_free else std_fee

    # SCENARIO A: PIN is an explicitly configured active delivery zone
    if zone:
        zone_fee = float(zone.get("delivery_fee") or 0.0)
        final_fee = 0.0 if is_free else max(std_fee, zone_fee)
        return ServiceabilityCheckOut(
            is_serviceable=True,
            status="Delivery Available",
            postal_code=pin,
            city=city,
            locality=locality,
            estimated_delivery_minutes=minutes,
            delivery_fee=final_fee,
            distance_km=distance_km,
            min_order_amount=min_order,
            free_delivery_threshold=free_thresh,
            service_hub=hub,
            message=f"Delivery Available in {locality} ({zone.get('estimated_delivery_time', '15-30 Mins')})",
            store_address=store_addr
        )

    # SCENARIO B: Coordinates available — check against store radius
    if distance_km is not None:
        if distance_km <= max_express_radius_km:
            return ServiceabilityCheckOut(
                is_serviceable=True,
                status="Delivery Available",
                postal_code=pin,
                city=city,
                locality=locality,
                estimated_delivery_minutes=15,
                delivery_fee=calc_fee,
                distance_km=distance_km,
                min_order_amount=min_order,
                free_delivery_threshold=free_thresh,
                service_hub=hub,
                message=f"Express Delivery Available: {distance_km} km from Sri Adithya Organics store.",
                store_address=store_addr
            )
        elif distance_km <= delivery_radius_km:
            return ServiceabilityCheckOut(
                is_serviceable=True,
                status="Delivery Available",
                postal_code=pin,
                city=city,
                locality=locality,
                estimated_delivery_minutes=35,
                delivery_fee=calc_fee,
                distance_km=distance_km,
                min_order_amount=min_order,
                free_delivery_threshold=free_thresh,
                service_hub=hub,
                message=f"Standard Delivery Available: {distance_km} km from Sri Adithya Organics store.",
                store_address=store_addr
            )
        else:
            return ServiceabilityCheckOut(
                is_serviceable=False,
                status="Delivery Not Available",
                postal_code=pin,
                city=city,
                locality=locality,
                estimated_delivery_minutes=0,
                delivery_fee=calc_fee,
                distance_km=distance_km,
                min_order_amount=min_order,
                free_delivery_threshold=free_thresh,
                service_hub=hub,
                message=f"Delivery Not Available: Location is {distance_km} km away (Service radius: {int(delivery_radius_km)} km).",
                store_address=store_addr
            )

    # SCENARIO C: PIN belongs to Telangana state (500xxx - 509xxx)
    if pin.startswith(("500", "501", "502", "503", "504", "505", "506", "507", "508", "509")):
        extended_fee = 0.0 if is_free else (std_fee + 20.0)
        return ServiceabilityCheckOut(
            is_serviceable=True,
            status="Delivery Available with Additional Charges",
            postal_code=pin,
            city=city,
            locality=locality,
            estimated_delivery_minutes=45,
            delivery_fee=extended_fee,
            distance_km=None,
            min_order_amount=min_order,
            free_delivery_threshold=free_thresh,
            service_hub=hub,
            message="Standard Telangana Delivery Available. Extended zone charge applies.",
            store_address=store_addr
        )

    # SCENARIO D: Outside Telangana and not in configured delivery zones
    return ServiceabilityCheckOut(
        is_serviceable=False,
        status="Delivery Not Available",
        postal_code=pin,
        city=city,
        locality=locality,
        estimated_delivery_minutes=0,
        delivery_fee=std_fee,
        distance_km=None,
        min_order_amount=min_order,
        free_delivery_threshold=free_thresh,
        service_hub=hub,
        message=f"Delivery Not Available: Sri Adithya Organics currently serves Telangana delivery zones.",
        store_address=store_addr
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
        address_in.city or "Hyderabad",
        address_in.state or "Telangana",
        address_in.postal_code.strip(),
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
