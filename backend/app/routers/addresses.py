from typing import List, Optional
import urllib.request
import urllib.parse
import json
import math
import os
import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import Address, User, DeliverySetting
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
    """
    High-precision reverse-geocoding for real coordinates.
    Retrieves building, street, neighbourhood, locality, city, district, state, and postal code.
    Evaluates Google Maps if configured, falling back to OpenStreetMap Nominatim and BigDataCloud.
    Never fabricates missing house details or distorts coordinates.
    """
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

    # Method 1: Google Maps Geocoding API if key is present
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
        except Exception as e:
            print(f"[REVERSE_GEOCODE] Google Maps lookup note: {e}")

    # Method 2: OpenStreetMap Nominatim Reverse Geocoding with zoom=18 for building/house level precision
    if not (resolved_locality and resolved_pin):
        try:
            url = f"https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={lat}&lon={lon}&addressdetails=1&zoom=18"
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "SriAdithyaOrganicsPlatform/2.0 (contact: info@sriadithyaorganics.com)",
                    "Accept-Language": "en"
                }
            )
            with urllib.request.urlopen(req, timeout=4.0) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    addr = data.get("address", {})
                    
                    house_number = house_number or addr.get("house_number") or addr.get("housename")
                    building = building or addr.get("building") or addr.get("residential") or addr.get("apartment")
                    road = road or addr.get("road") or addr.get("street") or addr.get("pedestrian") or addr.get("footway")
                    neighbourhood = neighbourhood or addr.get("neighbourhood") or addr.get("suburb") or addr.get("residential")
                    landmark = landmark or addr.get("amenity") or addr.get("landmark") or addr.get("shop")
                    
                    resolved_locality = resolved_locality or (
                        addr.get("suburb") or addr.get("neighbourhood") or 
                        addr.get("residential") or addr.get("city_district") or 
                        addr.get("village") or addr.get("town") or addr.get("road")
                    )
                    resolved_city = resolved_city or (
                        addr.get("city") or addr.get("town") or 
                        addr.get("city_district") or addr.get("district") or 
                        addr.get("municipality")
                    )
                    resolved_district = resolved_district or addr.get("state_district") or addr.get("county") or addr.get("district")
                    resolved_state = resolved_state or addr.get("state")
                    resolved_pin = resolved_pin or addr.get("postcode")
                    resolved_formatted = resolved_formatted or data.get("display_name")
        except Exception as e:
            print(f"[REVERSE_GEOCODE] Nominatim lookup note: {e}")

    # Method 3: Fallback to BigDataCloud client API if Nominatim failed or was throttled
    if not (resolved_locality and resolved_pin):
        try:
            bdc_url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lon}&localityLanguage=en"
            req = urllib.request.Request(bdc_url, headers={"User-Agent": "SriAdithyaOrganicsPlatform/2.0"})
            with urllib.request.urlopen(req, timeout=3.5) as resp:
                if resp.status == 200:
                    bdc_data = json.loads(resp.read().decode("utf-8"))
                    if not resolved_locality:
                        resolved_locality = bdc_data.get("locality") or bdc_data.get("principalSubdivision")
                    if not resolved_city:
                        resolved_city = bdc_data.get("city") or bdc_data.get("locality")
                    if not resolved_state:
                        resolved_state = bdc_data.get("principalSubdivision")
                    if not resolved_pin:
                        resolved_pin = bdc_data.get("postcode")
                    if not resolved_formatted:
                        resolved_formatted = f"{resolved_locality or ''}, {resolved_city or ''}, {resolved_state or ''} {resolved_pin or ''}".strip(", ")
        except Exception as e:
            print(f"[REVERSE_GEOCODE] BigDataCloud lookup note: {e}")

    # Method 4: Find closest logistics hub for delivery ETA calculation
    closest_cluster = min(
        KNOWN_LOCALITY_CLUSTERS,
        key=lambda c: calculate_distance(lat, lon, c["lat"], c["lon"])
    )
    dist = calculate_distance(lat, lon, closest_cluster["lat"], closest_cluster["lon"])

    # Fallback default locality ONLY if geocoding services returned empty
    if not resolved_locality:
        resolved_locality = closest_cluster["name"]
    if not resolved_city:
        resolved_city = closest_cluster["city"]
    if not resolved_state:
        resolved_state = closest_cluster["state"]
    if not resolved_pin:
        resolved_pin = closest_cluster["pin"]
    if not resolved_formatted:
        resolved_formatted = f"{resolved_locality}, {resolved_city}, {resolved_state} - {resolved_pin}"

    # Construct clean human-readable formatted address
    components = []
    if house_number:
        components.append(house_number)
    if building:
        components.append(building)
    if road:
        components.append(road)
    if neighbourhood and neighbourhood != resolved_locality:
        components.append(neighbourhood)
    if resolved_locality:
        components.append(resolved_locality)
    if resolved_city:
        components.append(resolved_city)
    if resolved_state:
        components.append(f"{resolved_state} - {resolved_pin}")

    if components:
        clean_formatted = ", ".join(dict.fromkeys(components))
    else:
        clean_formatted = resolved_formatted

    # Delivery serviceability calculation
    is_express = (
        (resolved_pin and resolved_pin.startswith(("560", "641", "600"))) or
        (dist <= 25.0)
    )
    is_serviceable = True

    if is_express:
        minutes = closest_cluster["minutes"] if dist <= 15.0 else 30
        hub = closest_cluster["hub"]
        msg = f"Express Delivery Active! Dispatched from {hub} in {minutes} mins."
    else:
        minutes = 48 * 60
        hub = "Sri Adithya Organics Central Fulfillment Facility"
        msg = f"Standard Courier Delivery Active to {resolved_city}."

    # Mark as incomplete if house number or building is missing (prompt customer to enter door/flat)
    is_incomplete = not bool(house_number or building)

    return ReverseGeocodeOut(
        formatted_address=clean_formatted,
        house_number=house_number,
        building=building,
        road=road,
        locality=resolved_locality,
        neighbourhood=neighbourhood,
        landmark=landmark,
        city=resolved_city,
        district=resolved_district,
        state=resolved_state,
        postal_code=resolved_pin,
        country="India",
        latitude=lat,
        longitude=lon,
        accuracy_meters=accuracy,
        is_serviceable=is_serviceable,
        estimated_delivery_minutes=minutes,
        service_hub=hub,
        message=msg,
        is_incomplete=is_incomplete,
        source="gps_detected" if not accuracy or accuracy <= 100 else "gps_approximate"
    )

@router.get("/search", response_model=List[AddressSearchResultItem])
def search_address_locations(q: str = Query(..., min_length=2, description="Address, area, building or PIN query")):
    """
    Search address locations across India with autocomplete.
    Uses OpenStreetMap Nominatim Search API to return structured results.
    """
    query = q.strip()
    if not query:
        return []

    results: List[AddressSearchResultItem] = []
    try:
        encoded_q = urllib.parse.quote(query)
        url = f"https://nominatim.openstreetmap.org/search?format=jsonv2&q={encoded_q}&countrycodes=in&limit=6&addressdetails=1"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "SriAdithyaOrganicsPlatform/2.0 (contact: info@sriadithyaorganics.com)",
                "Accept-Language": "en"
            }
        )
        with urllib.request.urlopen(req, timeout=4.0) as resp:
            if resp.status == 200:
                items = json.loads(resp.read().decode("utf-8"))
                for it in items:
                    addr = it.get("address", {})
                    loc = (
                        addr.get("suburb") or addr.get("neighbourhood") or 
                        addr.get("residential") or addr.get("road") or 
                        addr.get("city_district") or addr.get("village") or "Area"
                    )
                    cty = (
                        addr.get("city") or addr.get("town") or 
                        addr.get("district") or addr.get("county") or "Bengaluru"
                    )
                    st = addr.get("state") or "Karnataka"
                    pin = addr.get("postcode") or ""
                    
                    results.append(AddressSearchResultItem(
                        place_id=str(it.get("place_id")),
                        formatted_address=it.get("display_name", ""),
                        locality=loc,
                        city=cty,
                        state=st,
                        postal_code=pin,
                        latitude=float(it["lat"]),
                        longitude=float(it["lon"])
                    ))
    except Exception as e:
        print(f"[SEARCH_ADDRESS] Search note: {e}")

    # Fallback to known locality clusters if external search is throttled
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
def check_serviceability(req: ServiceabilityCheckRequest, db: Session = Depends(get_db)):
    """Verify delivery serviceability for a PIN code or coordinates."""
    min_order = 99.0
    free_thresh = 499.0
    try:
        settings = db.query(DeliverySetting).first()
        if settings:
            min_order = settings.min_order_amount
            free_thresh = settings.free_delivery_threshold
    except Exception:
        pass

    pin = (req.postal_code or "560038").strip()
    is_express = pin.startswith(("560", "641", "600"))
    is_serviceable = len(pin) == 6 and pin.isdigit()

    # Match locality
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
def get_user_addresses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Address).filter(Address.user_id == current_user.id).order_by(Address.is_default.desc(), Address.id.desc()).all()


@router.post("", response_model=AddressOut, status_code=status.HTTP_201_CREATED)
def create_address(
    address_in: AddressCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # If this is the user's first address, make it default automatically
    count = db.query(Address).filter(Address.user_id == current_user.id).count()
    is_default = address_in.is_default or (count == 0)

    if is_default:
        db.query(Address).filter(Address.user_id == current_user.id).update({"is_default": False})

    new_address = Address(
        user_id=current_user.id,
        label=address_in.label,
        recipient_name=address_in.recipient_name,
        phone=address_in.phone,
        street=address_in.street,
        apartment=address_in.apartment,
        house_number=address_in.house_number,
        locality=address_in.locality,
        landmark=address_in.landmark,
        city=address_in.city,
        state=address_in.state,
        postal_code=address_in.postal_code,
        latitude=address_in.latitude,
        longitude=address_in.longitude,
        accuracy_meters=address_in.accuracy_meters,
        formatted_address=address_in.formatted_address,
        confirmed_at=address_in.confirmed_at or datetime.datetime.utcnow(),
        is_default=is_default
    )
    db.add(new_address)
    db.commit()
    db.refresh(new_address)
    return new_address


@router.put("/{address_id}", response_model=AddressOut)
def update_address(
    address_id: int,
    address_in: AddressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    address = db.query(Address).filter(
        Address.id == address_id,
        Address.user_id == current_user.id
    ).first()

    if not address:
        raise HTTPException(status_code=404, detail="Address not found.")

    update_data = address_in.model_dump(exclude_unset=True)
    if update_data.get("is_default"):
        db.query(Address).filter(Address.user_id == current_user.id).update({"is_default": False})

    for field, val in update_data.items():
        setattr(address, field, val)

    db.commit()
    db.refresh(address)
    return address


@router.put("/{address_id}/set-default", response_model=AddressOut)
def set_default_address(
    address_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    address = db.query(Address).filter(
        Address.id == address_id,
        Address.user_id == current_user.id
    ).first()

    if not address:
        raise HTTPException(status_code=404, detail="Address not found.")

    db.query(Address).filter(Address.user_id == current_user.id).update({"is_default": False})
    address.is_default = True
    db.commit()
    db.refresh(address)
    return address


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_address(
    address_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    address = db.query(Address).filter(
        Address.id == address_id,
        Address.user_id == current_user.id
    ).first()

    if not address:
        raise HTTPException(status_code=404, detail="Address not found.")

    was_default = address.is_default
    db.delete(address)
    db.commit()

    # If it was default, assign default to another address if exists
    if was_default:
        next_addr = db.query(Address).filter(Address.user_id == current_user.id).first()
        if next_addr:
            next_addr.is_default = True
            db.commit()

    return None
