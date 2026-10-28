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

# Known Indian Metropolitan Location Clusters for Instant Accurate Offline Fallback
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
    # Tamil Nadu / Coimbatore Hubs (Sri Adithya Farm Cluster)
    {"name": "RS Puram", "city": "Coimbatore", "state": "Tamil Nadu", "pin": "641002", "lat": 11.0069, "lon": 76.9490, "hub": "Coimbatore Extraction Mill Hub", "minutes": 30},
    {"name": "Peelamedu", "city": "Coimbatore", "state": "Tamil Nadu", "pin": "641004", "lat": 11.0267, "lon": 77.0102, "hub": "Coimbatore Extraction Mill Hub", "minutes": 30},
    # Chennai Hubs
    {"name": "Adyar", "city": "Chennai", "state": "Tamil Nadu", "pin": "600020", "lat": 13.0012, "lon": 80.2565, "hub": "Chennai South Hub", "minutes": 35},
    {"name": "T. Nagar", "city": "Chennai", "state": "Tamil Nadu", "pin": "600017", "lat": 13.0418, "lon": 80.2341, "hub": "Chennai Central Hub", "minutes": 35},
]

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@router.post("/reverse-geocode", response_model=ReverseGeocodeOut)
def reverse_geocode(geo: ReverseGeocodeRequest, db: Session = Depends(get_db)):
    """Convert browser coordinates into readable Indian address and verify serviceability."""
    lat, lon = geo.latitude, geo.longitude
    
    # Try online OpenStreetMap Nominatim with strict 2.5s timeout
    resolved_locality = None
    resolved_city = "Bengaluru"
    resolved_state = "Karnataka"
    resolved_pin = "560038"
    resolved_formatted = None

    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={lat}&lon={lon}&addressdetails=1"
        req = urllib.request.Request(url, headers={"User-Agent": "SriAdithyaOrganicsECommerce/1.0"})
        with urllib.request.urlopen(req, timeout=2.5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                addr = data.get("address", {})
                resolved_locality = addr.get("suburb") or addr.get("neighbourhood") or addr.get("residential") or addr.get("road")
                resolved_city = addr.get("city") or addr.get("town") or addr.get("state_district") or "Bengaluru"
                resolved_state = addr.get("state", "Karnataka")
                resolved_pin = addr.get("postcode", "560038")
                resolved_formatted = data.get("display_name")
    except Exception:
        # Graceful fallback: find closest known Indian cluster
        pass

    # If online geocoding didn't resolve or was sandboxed, use closest coordinate cluster
    closest_cluster = min(
        KNOWN_LOCALITY_CLUSTERS,
        key=lambda c: calculate_distance(lat, lon, c["lat"], c["lon"])
    )
    dist = calculate_distance(lat, lon, closest_cluster["lat"], closest_cluster["lon"])

    if not resolved_locality or dist < 20.0:
        resolved_locality = resolved_locality or closest_cluster["name"]
        resolved_city = closest_cluster["city"]
        resolved_state = closest_cluster["state"]
        resolved_pin = closest_cluster["pin"]
        resolved_formatted = f"{resolved_locality}, {resolved_city}, {resolved_state} - {resolved_pin}"

    # Determine serviceability
    # Serviceable if pin starts with 560 (Bangalore), 641 (Coimbatore), 600 (Chennai)
    is_serviceable = resolved_pin.startswith(("560", "641", "600")) or (dist < 45.0)
    minutes = closest_cluster["minutes"] if is_serviceable else 0
    hub = closest_cluster["hub"] if is_serviceable else "Outside Serviceable Area"
    msg = (
        f"✅ Express delivery active! Dispatched from {hub} in {minutes} mins."
        if is_serviceable else
        "⚠️ Delivery is currently unavailable for this area. We are expanding to your sector soon!"
    )

    return ReverseGeocodeOut(
        formatted_address=resolved_formatted or f"{resolved_locality}, {resolved_city} - {resolved_pin}",
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
    settings = db.query(DeliverySetting).first()
    min_order = settings.min_order_amount if settings else 99.0
    free_thresh = settings.free_delivery_threshold if settings else 499.0

    pin = req.postal_code or "560038"
    is_serviceable = pin.startswith(("560", "641", "600"))

    # Match locality
    matching = next((c for c in KNOWN_LOCALITY_CLUSTERS if c["pin"] == pin), None)
    locality = matching["name"] if matching else "Local Sector"
    city = matching["city"] if matching else ("Bengaluru" if pin.startswith("560") else "India")
    minutes = matching["minutes"] if matching else (25 if is_serviceable else 0)
    hub = matching["hub"] if matching else ("Central Bengaluru Hub" if is_serviceable else "None")

    msg = (
        f"Delivery available in {minutes} mins from {hub}"
        if is_serviceable else
        f"PIN code {pin} is currently outside our express organic delivery zones."
    )

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

