import json
import math
import os
import urllib.request
import urllib.parse
from typing import List, Dict, Any, Optional, Tuple

DEFAULT_DISTANCE_SLABS: List[Dict[str, float]] = [
    {"min_km": 0.0, "max_km": 2.0, "fee": 20.0},
    {"min_km": 2.0, "max_km": 4.0, "fee": 30.0},
    {"min_km": 4.0, "max_km": 6.0, "fee": 40.0},
    {"min_km": 6.0, "max_km": 8.0, "fee": 50.0},
    {"min_km": 8.0, "max_km": 10.0, "fee": 60.0},
    {"min_km": 10.0, "max_km": 15.0, "fee": 75.0},
    {"min_km": 15.0, "max_km": 35.0, "fee": 99.0},
    {"min_km": 35.0, "max_km": 60.0, "fee": 149.0},
]

# Indian road network curvature coefficient (ratio of road distance to great-circle Haversine distance)
ROAD_DETOUR_FACTOR = 1.22

def parse_distance_slabs(raw: Any) -> List[Dict[str, float]]:
    """Parse and validate distance slabs JSON into sorted list of slabs."""
    if not raw:
        return [dict(s) for s in DEFAULT_DISTANCE_SLABS]

    parsed = None
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
        except Exception:
            return [dict(s) for s in DEFAULT_DISTANCE_SLABS]
    elif isinstance(raw, list):
        parsed = raw

    if not isinstance(parsed, list) or len(parsed) == 0:
        return [dict(s) for s in DEFAULT_DISTANCE_SLABS]

    valid_slabs: List[Dict[str, float]] = []
    for item in parsed:
        if isinstance(item, dict):
            try:
                min_k = float(item.get("min_km", 0.0))
                max_k = float(item.get("max_km", 0.0))
                fee_val = float(item.get("fee", 0.0))
                if max_k > min_k and fee_val >= 0:
                    valid_slabs.append({"min_km": min_k, "max_km": max_k, "fee": fee_val})
            except (ValueError, TypeError):
                continue

    if not valid_slabs:
        return [dict(s) for s in DEFAULT_DISTANCE_SLABS]

    valid_slabs.sort(key=lambda s: s["min_km"])
    return valid_slabs


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle spherical distance between two coordinate pairs in kilometers."""
    R = 6371.0 # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


def get_road_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> Tuple[float, str]:
    """
    Determine driving road distance between two points in kilometers.
    1. Attempts Google Distance Matrix API if GOOGLE_MAPS_API_KEY is configured.
    2. Attempts Open Source Routing Machine (OSRM) driving route API.
    3. Graceful fallback: Uses spherical Haversine formula adjusted by regional road detour coefficient.
    Returns: (distance_km, routing_source)
    """
    # Quick identity check
    if abs(lat1 - lat2) < 0.0001 and abs(lon1 - lon2) < 0.0001:
        return (0.1, "local_proximity")

    # 1. Google Distance Matrix if key available
    google_key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if google_key:
        try:
            url = f"https://maps.googleapis.com/maps/api/distancematrix/json?origins={lat1},{lon1}&destinations={lat2},{lon2}&mode=driving&key={google_key}"
            req = urllib.request.Request(url, headers={"User-Agent": "SriAdithyaOrganicsPlatform/2.0"})
            with urllib.request.urlopen(req, timeout=2.5) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    rows = data.get("rows", [])
                    if rows and rows[0].get("elements"):
                        elem = rows[0]["elements"][0]
                        if elem.get("status") == "OK" and "distance" in elem:
                            dist_km = round(elem["distance"]["value"] / 1000.0, 2)
                            return (dist_km, "google_matrix")
        except Exception:
            pass

    # 2. OSRM Driving Router
    try:
        url = f"http://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=false"
        req = urllib.request.Request(url, headers={"User-Agent": "SriAdithyaOrganicsPlatform/2.0"})
        with urllib.request.urlopen(req, timeout=2.5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                if data.get("code") == "Ok" and data.get("routes"):
                    meters = data["routes"][0]["distance"]
                    dist_km = round(meters / 1000.0, 2)
                    return (dist_km, "osrm_road")
    except Exception:
        pass

    # 3. Graceful fallback: Haversine distance * road network detour factor
    h_dist = calculate_haversine_distance(lat1, lon1, lat2, lon2)
    road_est = round(max(0.1, h_dist * ROAD_DETOUR_FACTOR), 2)
    return (road_est, "haversine_road_estimate")


def calculate_distance_based_delivery_fee(
    distance_km: Optional[float],
    slabs: List[Dict[str, float]],
    subtotal: float = 0.0,
    free_delivery_threshold: float = 499.0,
    max_delivery_radius_km: float = 60.0,
    default_fallback_fee: float = 39.0
) -> Tuple[float, bool, str, Optional[str]]:
    """
    Calculate dynamic delivery charges based on actual distance travelled.
    Returns: (fee, is_serviceable, status_message, matched_slab_label)
    """
    if distance_km is None:
        is_free = subtotal >= free_delivery_threshold
        fee = 0.0 if is_free else default_fallback_fee
        msg = "Free delivery on orders over ₹499" if is_free else "Standard delivery fee applied"
        return (fee, True, msg, None)

    # Check maximum serviceable distance boundary
    if distance_km > max_delivery_radius_km:
        return (
            0.0,
            False,
            f"Delivery not available: Address is {distance_km:.1f} km away (Maximum serviceable radius is {int(max_delivery_radius_km)} km).",
            None
        )

    # Check free delivery threshold
    if subtotal >= free_delivery_threshold:
        return (
            0.0,
            True,
            f"Free Delivery unlocked (Order ₹{subtotal:.2f} >= ₹{free_delivery_threshold:.2f}). Distance: {distance_km:.1f} km.",
            "Free Delivery"
        )

    # Find matching distance slab
    matched_fee = None
    matched_label = None

    for idx, slab in enumerate(slabs):
        min_k = slab["min_km"]
        max_k = slab["max_km"]
        is_last = (idx == len(slabs) - 1)

        # Lower bound inclusive, upper bound exclusive (or inclusive if last slab)
        if (min_k <= distance_km < max_k) or (is_last and min_k <= distance_km <= max_k):
            matched_fee = slab["fee"]
            matched_label = f"{int(min_k) if min_k.is_integer() else min_k}–{int(max_k) if max_k.is_integer() else max_k} km"
            break

    if matched_fee is not None:
        msg = f"Delivery fee ₹{matched_fee:.0f} for {matched_label} distance ({distance_km:.1f} km from store)."
        return (matched_fee, True, msg, matched_label)

    # If distance exceeds all slabs but is within max_delivery_radius_km
    last_slab = slabs[-1]
    last_fee = last_slab["fee"]
    excess_km = distance_km - last_slab["max_km"]
    extra_chunks = math.ceil(max(0.0, excess_km) / 5.0)
    extended_fee = last_fee + (extra_chunks * 15.0)
    label = f"> {last_slab['max_km']} km"
    msg = f"Extended delivery fee ₹{extended_fee:.0f} for {distance_km:.1f} km distance."
    return (extended_fee, True, msg, label)
