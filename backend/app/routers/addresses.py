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

router = APIRouter(prefix="/addresses", tags=["Customer Addresses"])

# Known Indian Metropolitan Fulfillment Clusters for Logistics Routing & Delivery ETA
KNOWN_LOCALITY_CLUSTERS = [
    # Bengaluru Hubs
    {"name": "Indiranagar", "city": "Bengaluru", "state": "Karnataka", "pin": "560038", "lat": 12.9784, "lon": 77.6408, "hub": "Indiranagar Hub", "minutes": 15},
    {"name": "Koramangala", "city": "Bengaluru", "state": "Karnataka", "pin": "560034", "lat": 12.9352, "lon": 77.6245, "hub": "South Bengaluru Hub", "minutes": 20},
    {"name": "HSR Layout", "city": "Bengaluru", "state": "Karnataka", "pin": "560102", "lat": 12.9121, "lon": 77.6446, "hub": "South Bengaluru Hub", "minutes": 20},
    {"name": "Whitefield", "city": "Bengaluru", "state": "Karnataka", "pin": "560066", "lat": 12.9698, "lon": 77.7500, "hub": "East Bengaluru Hub", "minutes": 25},
    {"name": "Jayanagar", "city": "Bengaluru", "state": "Karnataka", "pin": "560011", "lat": 12.9308, "lon": 77.5838, "hub": "Central Bengaluru Hub", "minutes": 20},
    {"name": "Malleshwaram", "city": "Bengaluru", "state": "Karnataka", "pin": "560003", "lat": 13.0031, "lon": 77.5643, "hub": "North Bengaluru Hub", "minutes": 25},
    {"name": "Bellandur", "city": "Bengaluru", "state": "Karnataka", "pin": "560103", "lat": 12.9260, "lon": 77.6762, "hub": "ORR Tech Corridor Hub", "minutes": 20},
    {"name": "MG Road / CBD", "city": "Bengaluru", "state": "Karnataka", "pin": "560001", "lat": 12.9756, "lon": 77.6066, "hub": "Central Bengaluru Hub", "minutes": 15},
    {"name": "Hebbal", "city": "Bengaluru", "state": "Karnataka", "pin": "560024", "lat": 13.0358, "lon": 77.5970, "hub": "North Bengaluru Hub", "minutes": 25},
    {"name": "Electronic City", "city": "Bengaluru", "state": "Karnataka", "pin": "560100", "lat": 12.8452, "lon": 77.6602, "hub": "South Bengaluru Tech Hub", "minutes": 25},
    
    # Telangana Hubs
    {"name": "Banjara Hills", "city": "Hyderabad", "state": "Telangana", "pin": "500034", "lat": 17.4156, "lon": 78.4357, "hub": "Hyderabad Central Hub", "minutes": 25},
    {"name": "Hitec City / Madhapur", "city": "Hyderabad", "state": "Telangana", "pin": "500081", "lat": 17.4474, "lon": 78.3762, "hub": "Hyderabad Cyber Hub", "minutes": 20},
    {"name": "Secunderabad", "city": "Hyderabad", "state": "Telangana", "pin": "500003", "lat": 17.4399, "lon": 78.4983, "hub": "North Hyderabad Hub", "minutes": 25},
    
    # Andhra Pradesh Hubs
    {"name": "Benz Circle", "city": "Vijayawada", "state": "Andhra Pradesh", "pin": "520010", "lat": 16.5062, "lon": 80.6480, "hub": "Vijayawada Hub", "minutes": 25},
    {"name": "Dwaraka Nagar", "city": "Visakhapatnam", "state": "Andhra Pradesh", "pin": "530016", "lat": 17.7289, "lon": 83.3089, "hub": "Vizag Coastal Hub", "minutes": 30},
    {"name": "KT Road", "city": "Tirupati", "state": "Andhra Pradesh", "pin": "517501", "lat": 13.6288, "lon": 79.4192, "hub": "Tirupati Hub", "minutes": 25},
    {"name": "Brodipet", "city": "Guntur", "state": "Andhra Pradesh", "pin": "522002", "lat": 16.3067, "lon": 80.4365, "hub": "Guntur Hub", "minutes": 25},
    
    # Tamil Nadu / Coimbatore Hubs (Sri Adithya Farm Cluster)
    {"name": "RS Puram", "city": "Coimbatore", "state": "Tamil Nadu", "pin": "641002", "lat": 11.0069, "lon": 76.9490, "hub": "Coimbatore Extraction Mill Hub", "minutes": 30},
    {"name": "Peelamedu", "city": "Coimbatore", "state": "Tamil Nadu", "pin": "641004", "lat": 11.0267, "lon": 77.0102, "hub": "Coimbatore Extraction Mill Hub", "minutes": 30},
    
    # Chennai Hubs
    {"name": "Adyar", "city": "Chennai", "state": "Tamil Nadu", "pin": "600020", "lat": 13.0012, "lon": 80.2565, "hub": "Chennai South Hub", "minutes": 35},
    {"name": "T. Nagar", "city": "Chennai", "state": "Tamil Nadu", "pin": "600017", "lat": 13.0418, "lon": 80.2341, "hub": "Chennai Central Hub", "minutes": 35},
    
    # Maharashtra Hubs
    {"name": "Bandra / BKC", "city": "Mumbai", "state": "Maharashtra", "pin": "400051", "lat": 19.0607, "lon": 72.8687, "hub": "Mumbai Central Hub", "minutes": 30},
    {"name": "Shivaji Nagar", "city": "Pune", "state": "Maharashtra", "pin": "411005", "lat": 18.5314, "lon": 73.8446, "hub": "Pune City Hub", "minutes": 30},
    
    # Delhi NCR
    {"name": "Connaught Place", "city": "New Delhi", "state": "Delhi", "pin": "110001", "lat": 28.6315, "lon": 77.2167, "hub": "Delhi NCR Hub", "minutes": 35},
]

PIN_REGION_MAP = {
    "11": ("New Delhi", "Delhi"),
    "12": ("Gurugram / Faridabad", "Haryana"),
    "13": ("Ambala / Karnal", "Haryana"),
    "14": ("Ludhiana / Jalandhar", "Punjab"),
    "15": ("Bathinda / Patiala", "Punjab"),
    "16": ("Chandigarh", "Chandigarh"),
    "20": ("Noida / Ghaziabad", "Uttar Pradesh"),
    "22": ("Lucknow / Varanasi", "Uttar Pradesh"),
    "30": ("Jaipur", "Rajasthan"),
    "38": ("Ahmedabad", "Gujarat"),
    "39": ("Surat / Vadodara", "Gujarat"),
    "40": ("Mumbai / Thane", "Maharashtra"),
    "41": ("Pune", "Maharashtra"),
    "42": ("Nashik", "Maharashtra"),
    "44": ("Nagpur", "Maharashtra"),
    "50": ("Hyderabad", "Telangana"),
    "51": ("Tirupati", "Andhra Pradesh"),
    "52": ("Vijayawada / Guntur", "Andhra Pradesh"),
    "53": ("Visakhapatnam", "Andhra Pradesh"),
    "56": ("Bengaluru", "Karnataka"),
    "57": ("Mangaluru / Mysuru", "Karnataka"),
    "58": ("Hubballi / Belagavi", "Karnataka"),
    "60": ("Chennai", "Tamil Nadu"),
    "62": ("Madurai", "Tamil Nadu"),
    "64": ("Coimbatore", "Tamil Nadu"),
    "67": ("Kozhikode", "Kerala"),
    "68": ("Kochi", "Kerala"),
    "69": ("Thiruvananthapuram", "Kerala"),
    "70": ("Kolkata", "West Bengal"),
}

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # km
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

    # Google Maps Geocoding API if key is present
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

    # OpenStreetMap Nominatim
    if not resolved_city or not resolved_pin:
        try:
            url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&addressdetails=1"
            req = urllib.request.Request(url, headers={"User-Agent": "SriAdithyaOrganicsPlatform/2.0 (contact@sriadithyaorganics.com)"})
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

    # Cluster fallback
    closest_cluster = None
    min_dist = float("inf")
    for cluster in KNOWN_LOCALITY_CLUSTERS:
        dist = calculate_distance(lat, lon, cluster["lat"], cluster["lon"])
        if dist < min_dist:
            min_dist = dist
            closest_cluster = cluster

    if closest_cluster and (not resolved_city or min_dist < 25.0):
        if not resolved_locality:
            resolved_locality = closest_cluster["name"]
        if not resolved_city:
            resolved_city = closest_cluster["city"]
        if not resolved_state:
            resolved_state = closest_cluster["state"]
        if not resolved_pin:
            resolved_pin = closest_cluster["pin"]

    # Final safe fallbacks
    resolved_locality = resolved_locality or "Indiranagar"
    resolved_city = resolved_city or "Bengaluru"
    resolved_state = resolved_state or "Karnataka"
    resolved_pin = (resolved_pin or "560038").strip()

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
        state=resolved_state,
        postal_code=resolved_pin,
        formatted_address=resolved_formatted,
        delivery_cluster=closest_cluster["name"] if closest_cluster else "Indiranagar",
        estimated_delivery_minutes=closest_cluster["minutes"] if closest_cluster else 25,
        service_hub=closest_cluster["hub"] if closest_cluster else "Sri Adithya Hub"
    )

@router.get("/search", response_model=List[AddressSearchResultItem])
def search_address(query: str = Query(..., min_length=2)):
    results = []
    try:
        encoded = urllib.parse.quote(f"{query}, India")
        url = f"https://nominatim.openstreetmap.org/search?q={encoded}&format=json&addressdetails=1&countrycodes=in&limit=6"
        req = urllib.request.Request(url, headers={"User-Agent": "SriAdithyaOrganicsPlatform/2.0"})
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                for it in data:
                    addr = it.get("address", {})
                    pin = addr.get("postcode", "")
                    city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("county", "Bengaluru")
                    st = addr.get("state", "Karnataka")
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
    min_order = 99.0
    free_thresh = 499.0
    try:
        setting = await d1.fetch_one("SELECT min_order_amount, free_delivery_threshold FROM delivery_settings LIMIT 1")
        if setting:
            min_order = float(setting.get("min_order_amount") or 99.0)
            free_thresh = float(setting.get("free_delivery_threshold") or 499.0)
    except Exception:
        pass

    pin = (req.postal_code or "560038").strip()
    is_express = pin.startswith(("560", "641", "600"))
    is_serviceable = len(pin) == 6 and pin.isdigit()

    matching = next((c for c in KNOWN_LOCALITY_CLUSTERS if c["pin"] == pin), None)
    if matching:
        locality = matching["name"]
        city = matching["city"]
        minutes = matching["minutes"]
        hub = matching["hub"]
    else:
        region_info = PIN_REGION_MAP.get(pin[:2])
        if region_info:
            city, state = region_info
            locality = f"Sector {pin}"
        else:
            city = "Bengaluru" if pin.startswith("560") else "India"
            locality = "Local Area"
        minutes = 25 if is_express else 48 * 60
        hub = "Central Bengaluru Hub" if is_express else "Sri Adithya Organics Central Warehouse"

    if is_express:
        msg = f"Express Delivery Available: {minutes} mins from {hub}"
    else:
        msg = f"Standard Organic Delivery Active (Dispatched to {city})"

    if not is_serviceable:
        msg = "Please enter a valid 6-digit Indian PIN code."

    return ServiceabilityCheckOut(
        is_serviceable=is_serviceable,
        postal_code=pin,
        city=city,
        locality=locality,
        estimated_delivery_minutes=minutes,
        min_order_amount=min_order,
        free_delivery_threshold=free_thresh,
        service_hub=hub,
        message=msg
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
        address_in.recipient_name,
        address_in.phone,
        address_in.street,
        address_in.apartment,
        address_in.house_number,
        address_in.locality,
        address_in.landmark,
        address_in.city,
        address_in.state,
        address_in.postal_code,
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

    was_default = bool(address.get("is_default"))
    await d1.execute("DELETE FROM addresses WHERE id = ? AND user_id = ?", address_id, user_id)

    if was_default:
        next_addr = await d1.fetch_one("SELECT id FROM addresses WHERE user_id = ? ORDER BY id DESC LIMIT 1", user_id)
        if next_addr:
            await d1.execute("UPDATE addresses SET is_default = 1 WHERE id = ?", next_addr["id"])

    return None
