from typing import List
import urllib.request
import json
import math
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import Address, User, DeliverySetting
from backend.app.schemas import (
    AddressOut, AddressCreate, AddressUpdate,
    ReverseGeocodeRequest, ReverseGeocodeOut,
    ServiceabilityCheckRequest, ServiceabilityCheckOut
)
from backend.app.deps import get_current_user

router = APIRouter(prefix="/addresses", tags=["Customer Addresses"])

# Known Indian Metropolitan Location Clusters for Instant Accurate Offline Fallback & Logistics Routing
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
    """Convert browser coordinates into exact readable address and check live delivery availability."""
    lat, lon = geo.latitude, geo.longitude
    
    resolved_locality = None
    resolved_city = None
    resolved_state = None
    resolved_pin = None
    resolved_formatted = None

    # Step 1: OpenStreetMap Nominatim with strict 3.5s timeout
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={lat}&lon={lon}&addressdetails=1"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "SriAdithyaOrganicsPlatform/2.0 (contact: info@sriadithyaorganics.com)",
                "Accept-Language": "en"
            }
        )
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                addr = data.get("address", {})
                resolved_locality = (
                    addr.get("suburb") or addr.get("neighbourhood") or 
                    addr.get("residential") or addr.get("road") or 
                    addr.get("village") or addr.get("county")
                )
                resolved_city = (
                    addr.get("city") or addr.get("town") or 
                    addr.get("city_district") or addr.get("district") or 
                    addr.get("state_district")
                )
                resolved_state = addr.get("state")
                resolved_pin = addr.get("postcode")
                resolved_formatted = data.get("display_name")
    except Exception:
        pass

    # Step 2: Fallback to BigDataCloud client API if Nominatim failed or was throttled
    if not (resolved_locality and resolved_pin):
        try:
            bdc_url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lon}&localityLanguage=en"
            req = urllib.request.Request(bdc_url, headers={"User-Agent": "SriAdithyaOrganics/2.0"})
            with urllib.request.urlopen(req, timeout=3.0) as resp:
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
        except Exception:
            pass

    # Step 3: Find closest logistics cluster for fulfillment routing
    closest_cluster = min(
        KNOWN_LOCALITY_CLUSTERS,
        key=lambda c: calculate_distance(lat, lon, c["lat"], c["lon"])
    )
    dist = calculate_distance(lat, lon, closest_cluster["lat"], closest_cluster["lon"])

    # Fallback to cluster ONLY if geocoding completely failed
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

    # Determine serviceability:
    # Express delivery (15-30 mins) if within 25 km of known cluster or express PIN
    is_express = resolved_pin.startswith(("560", "641", "600")) or (dist < 25.0)
    is_serviceable = True # Pan-India organic grocery delivery is supported!

    if is_express:
        minutes = closest_cluster["minutes"]
        hub = closest_cluster["hub"]
        msg = f"⚡ Express Delivery Active! Dispatched from {hub} in {minutes} mins."
    else:
        minutes = 48 * 60 # 2-3 business days
        hub = "Sri Adithya Organics Central Fulfillment Facility"
        msg = f"📦 Standard Courier Delivery Active! Dispatched to {resolved_city} via Express Courier."

    return ReverseGeocodeOut(
        formatted_address=resolved_formatted,
        locality=resolved_locality,
        city=resolved_city,
        state=resolved_state,
        postal_code=resolved_pin,
        is_serviceable=is_serviceable,
        estimated_delivery_minutes=minutes,
        service_hub=hub,
        message=msg
    )

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
        msg = f"⚡ Express Delivery Available: {minutes} mins from {hub}"
    elif is_serviceable:
        msg = f"📦 Pan-India Courier Delivery Available to PIN {pin} ({city}) in 2-3 business days"
    else:
        msg = f"Please enter a valid 6-digit Indian PIN code."

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
        landmark=address_in.landmark,
        city=address_in.city,
        state=address_in.state,
        postal_code=address_in.postal_code,
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

