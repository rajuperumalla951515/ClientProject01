"""
Sri Adithya Organics — Nationwide Courier Logistics Engine
Supports Pan-India shipping via Delhivery, Shiprocket, and Admin-Configured Zonal Rate Cards.
"""
import re
import math
import os
import json
import datetime
import urllib.request
import urllib.parse
from typing import Dict, Any, Optional, List, Tuple

# Standard pickup origin: Sri Aditya Organics & Oil Mill, Kothagudem, Telangana
STORE_PICKUP_PINCODE = "507101"
STORE_PICKUP_CITY = "Kothagudem"
STORE_PICKUP_STATE = "Telangana"

# Standard courier volumetric divisor (cm^3 / 5000 = kg)
VOLUMETRIC_DIVISOR = 5000.0

# Standard Indian Courier Zones from Kothagudem Mill origin (507101)
DEFAULT_COURIER_ZONES: Dict[str, Dict[str, Any]] = {
    "Zone A": {
        "name": "Intra-District (Kothagudem & Khammam)",
        "description": "Local district courier fulfillment",
        "base_weight_grams": 500,
        "base_rate": 35.0,
        "addl_weight_grams": 500,
        "addl_rate": 25.0,
        "min_days": 1,
        "max_days": 2,
        "estimated_days": "1–2 Business Days",
    },
    "Zone B": {
        "name": "Intra-State (Telangana)",
        "description": "Hyderabad, Warangal, Karimnagar, Nizamabad, and all Telangana districts",
        "base_weight_grams": 500,
        "base_rate": 49.0,
        "addl_weight_grams": 500,
        "addl_rate": 30.0,
        "min_days": 2,
        "max_days": 3,
        "estimated_days": "2–3 Business Days",
    },
    "Zone C": {
        "name": "Regional South India",
        "description": "Andhra Pradesh, Karnataka (Bengaluru), Tamil Nadu (Chennai), Kerala",
        "base_weight_grams": 500,
        "base_rate": 65.0,
        "addl_weight_grams": 500,
        "addl_rate": 40.0,
        "min_days": 3,
        "max_days": 4,
        "estimated_days": "3–4 Business Days",
    },
    "Zone D": {
        "name": "Rest of India (Metros & Major States)",
        "description": "Maharashtra (Mumbai/Pune), Delhi NCR, Gujarat, UP, West Bengal, MP, Rajasthan, etc.",
        "base_weight_grams": 500,
        "base_rate": 85.0,
        "addl_weight_grams": 500,
        "addl_rate": 50.0,
        "min_days": 4,
        "max_days": 6,
        "estimated_days": "4–6 Business Days",
    },
    "Zone E": {
        "name": "Special & Remote Territories",
        "description": "Northeast States, Jammu & Kashmir, Ladakh, Andaman & Nicobar, Lakshadweep",
        "base_weight_grams": 500,
        "base_rate": 125.0,
        "addl_weight_grams": 500,
        "addl_rate": 75.0,
        "min_days": 5,
        "max_days": 8,
        "estimated_days": "5–8 Business Days",
    },
}

SUPPORTED_COURIER_PARTNERS = [
    {"id": "delhivery", "name": "Delhivery Express Cargo", "tracking_url": "https://www.delhivery.com/track/package/{awb}"},
    {"id": "bluedart", "name": "BlueDart Air / Surface", "tracking_url": "https://www.bluedart.com/tracking?trackNumber={awb}"},
    {"id": "shiprocket", "name": "Shiprocket Multi-Carrier", "tracking_url": "https://shiprocket.co/tracking/{awb}"},
    {"id": "indiapost", "name": "India Post Speed Post", "tracking_url": "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?consignmentid={awb}"},
]


def is_valid_indian_pincode(pin: Optional[str]) -> bool:
    """Validate 6-digit Indian postal code."""
    if not pin:
        return False
    clean = re.sub(r"\D", "", str(pin).strip())
    if len(clean) != 6:
        return False
    # First digit in India is 1 through 8
    first_char = clean[0]
    return first_char in "12345678"


def determine_courier_zone(pickup_pin: str, dest_pin: str) -> Tuple[str, Dict[str, Any]]:
    """
    Determine Indian courier logistics zone from pickup PIN to destination PIN.
    Returns: (zone_key, zone_data)
    """
    clean_dest = re.sub(r"\D", "", str(dest_pin).strip())
    clean_pickup = re.sub(r"\D", "", str(pickup_pin or STORE_PICKUP_PINCODE).strip())

    if not is_valid_indian_pincode(clean_dest):
        return ("Zone D", DEFAULT_COURIER_ZONES["Zone D"])

    # Zone A: Intra-District / Cluster (Khammam / Kothagudem PINs starting with 507)
    if clean_dest.startswith("507") and clean_pickup.startswith("507"):
        return ("Zone A", DEFAULT_COURIER_ZONES["Zone A"])

    # Zone B: Intra-State Telangana (All 50xxxx PINs)
    if clean_dest.startswith("50"):
        return ("Zone B", DEFAULT_COURIER_ZONES["Zone B"])

    # Zone C: Regional South India & Goa
    # Andhra Pradesh (51-53), Karnataka (56-59), Tamil Nadu (60-64), Kerala (67-69), Goa (403)
    c_prefixes = (
        "51", "52", "53",
        "56", "57", "58", "59",
        "60", "61", "62", "63", "64",
        "67", "68", "69",
        "403"
    )
    if clean_dest.startswith(c_prefixes):
        return ("Zone C", DEFAULT_COURIER_ZONES["Zone C"])

    # Zone E: Special / Remote / Northeast / J&K / Islands
    # Assam / Northeast (78, 79), J&K / Ladakh (18, 19), Andaman & Nicobar (744), Lakshadweep (682)
    e_prefixes = ("78", "79", "18", "19", "744", "682")
    if clean_dest.startswith(e_prefixes):
        return ("Zone E", DEFAULT_COURIER_ZONES["Zone E"])

    # Zone D: Rest of India (North, West, Central, East Metros)
    return ("Zone D", DEFAULT_COURIER_ZONES["Zone D"])


def estimate_parcel_weight_kg(items: Optional[List[Dict[str, Any]]] = None) -> float:
    """
    Estimate total parcel gross weight in kilograms based on cart or order items.
    Accounts for product packaging tare weight (glass bottles, tins, stand-up pouches, cardboard buffer).
    """
    if not items:
        return 0.8  # Standard baseline weight for 1 organic staple

    total_weight = 0.0

    for it in items:
        qty = int(it.get("quantity") or 1)
        raw_unit = str(it.get("variant_name") or it.get("unit") or it.get("pack_size") or "").lower()
        p_name = str(it.get("product_name") or it.get("name") or "").lower()

        # Item unit weight estimation
        item_unit_kg = 0.5  # default 500g

        if "5 kg" in raw_unit or "5kg" in raw_unit or "5 l" in raw_unit or "5l" in raw_unit:
            item_unit_kg = 5.25  # 5kg + can/tin weight
        elif "2 kg" in raw_unit or "2kg" in raw_unit or "2 l" in raw_unit or "2l" in raw_unit:
            item_unit_kg = 2.15
        elif "1 kg" in raw_unit or "1kg" in raw_unit or "1 litre" in raw_unit or "1l" in raw_unit or "1000ml" in raw_unit:
            # Oils in glass/HDPE bottle weigh ~1.15kg
            item_unit_kg = 1.15 if ("oil" in p_name or "ghee" in p_name) else 1.08
        elif "500" in raw_unit:
            item_unit_kg = 0.58 if ("oil" in p_name or "ghee" in p_name) else 0.53
        elif "250" in raw_unit:
            item_unit_kg = 0.30
        elif "100" in raw_unit:
            item_unit_kg = 0.15
        elif "piece" in raw_unit or "box" in raw_unit or "pack" in raw_unit:
            item_unit_kg = 0.40

        total_weight += item_unit_kg * qty

    # Packaging box tare weight (cardboard box + bubble wrap + tamper tape)
    packing_tare = 0.25 if total_weight <= 2.0 else 0.45
    return round(max(0.5, total_weight + packing_tare), 2)


def calculate_billable_weight_kg(
    actual_weight_kg: float,
    length_cm: Optional[float] = None,
    width_cm: Optional[float] = None,
    height_cm: Optional[float] = None
) -> float:
    """
    Calculate billable weight based on actual vs volumetric weight.
    Formula: Volumetric Weight = (Length * Width * Height) / 5000
    Standard Indian logistics rule: billable = max(actual, volumetric), rounded up to nearest 500g slab.
    If box dimensions are not explicitly specified, actual gross weight is used.
    """
    heavier = actual_weight_kg
    if length_cm is not None and width_cm is not None and height_cm is not None:
        volumetric_kg = (float(length_cm) * float(width_cm) * float(height_cm)) / VOLUMETRIC_DIVISOR
        heavier = max(actual_weight_kg, volumetric_kg)

    # Ceiling to nearest 0.5 kg slab
    slabs = math.ceil(max(0.01, heavier) / 0.5)
    billable = round(max(0.5, slabs * 0.5), 2)
    return billable


def calculate_courier_shipping(
    dest_pincode: str,
    weight_kg: float = 0.5,
    subtotal: float = 0.0,
    pickup_pincode: str = STORE_PICKUP_PINCODE,
    courier_rates: Optional[Dict[str, Any]] = None,
    free_threshold: float = 999.0,
    partner_name: str = "Delhivery",
    blacklisted_pins: Optional[str] = None,
    length_cm: Optional[float] = None,
    width_cm: Optional[float] = None,
    height_cm: Optional[float] = None
) -> Dict[str, Any]:
    """
    Calculate comprehensive nationwide courier shipping charges, courier zone, and estimated delivery dates.
    Returns structured courier quotation dictionary.
    """
    clean_dest = re.sub(r"\D", "", str(dest_pincode).strip())

    # 1. PIN Code Validation
    if not is_valid_indian_pincode(clean_dest):
        return {
            "is_serviceable": False,
            "error_code": "INVALID_PINCODE",
            "message": f"'{dest_pincode}' is not a valid 6-digit Indian PIN code. Please verify your postal code.",
            "shipping_fee": 0.0,
            "delivery_mode": "unserviceable",
            "courier_partner": partner_name,
            "zone": "Unknown",
            "estimated_days": None,
        }

    # 2. Check Blacklist / Exclusions
    if blacklisted_pins:
        blist = [p.strip() for p in blacklisted_pins.split(",") if p.strip()]
        if clean_dest in blist:
            return {
                "is_serviceable": False,
                "error_code": "PIN_EXCLUDED",
                "message": f"PIN code {clean_dest} is currently in an unserviceable courier zone. Please choose a nearby PIN code.",
                "shipping_fee": 0.0,
                "delivery_mode": "unserviceable",
                "courier_partner": partner_name,
                "zone": "Excluded",
                "estimated_days": None,
            }

    # 3. Determine Courier Zone
    zone_key, default_zone_data = determine_courier_zone(pickup_pincode, clean_dest)

    # Allow admin-overridden rates if passed
    zone_data = default_zone_data
    if courier_rates and isinstance(courier_rates, dict) and zone_key in courier_rates:
        merged = dict(default_zone_data)
        merged.update(courier_rates[zone_key])
        zone_data = merged

    # 4. Billable Weight Calculation
    billable_kg = calculate_billable_weight_kg(weight_kg, length_cm, width_cm, height_cm)
    slabs_500g = max(1, math.ceil(billable_kg / 0.5))

    base_rate = float(zone_data.get("base_rate", 49.0))
    addl_rate = float(zone_data.get("addl_rate", 30.0))

    # Base covers the first 500g slab (1 slab)
    additional_slabs = max(0, slabs_500g - 1)
    raw_shipping_fee = round(base_rate + (additional_slabs * addl_rate), 2)

    # 5. Free Shipping Qualification
    is_free = bool(free_threshold > 0 and subtotal >= free_threshold)
    final_shipping_fee = 0.0 if is_free else raw_shipping_fee

    # 6. Estimated Delivery Date (EDD)
    min_days = int(zone_data.get("min_days", 2))
    max_days = int(zone_data.get("max_days", 4))
    today = datetime.date.today()
    edd_min = today + datetime.timedelta(days=min_days)
    edd_max = today + datetime.timedelta(days=max_days)

    edd_min_str = edd_min.strftime("%a, %d %b")
    edd_max_str = edd_max.strftime("%a, %d %b")
    edd_display = f"{edd_min_str} – {edd_max_str}"

    fee_label = "FREE" if is_free else f"₹{final_shipping_fee:.0f}"
    status_msg = (
        f"Nationwide Courier Available via {partner_name} ({zone_data.get('estimated_days', '2–4 Business Days')}). "
        f"Delivery: {fee_label} (Weight: {billable_kg:.1f} kg)."
    )

    return {
        "is_serviceable": True,
        "delivery_mode": "nationwide_courier",
        "delivery_type": "Nationwide Courier Shipping",
        "zone": zone_key,
        "zone_name": zone_data.get("name"),
        "zone_description": zone_data.get("description"),
        "courier_partner": partner_name,
        "pickup_pincode": pickup_pincode or STORE_PICKUP_PINCODE,
        "destination_pincode": clean_dest,
        "actual_weight_kg": weight_kg,
        "billable_weight_kg": billable_kg,
        "weight_slabs_count": slabs_500g,
        "base_rate": base_rate,
        "addl_rate": addl_rate,
        "raw_shipping_fee": raw_shipping_fee,
        "shipping_fee": final_shipping_fee,
        "is_free_shipping": is_free,
        "free_shipping_threshold": free_threshold,
        "estimated_days": zone_data.get("estimated_days", "2–4 Business Days"),
        "estimated_delivery_dates": edd_display,
        "min_delivery_days": min_days,
        "max_delivery_days": max_days,
        "message": status_msg,
    }


def query_delhivery_api(
    pickup_pin: str,
    dest_pin: str,
    weight_grams: int,
    api_key: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Optional live integration with Delhivery API if DELHIVERY_API_KEY is configured.
    Falls back gracefully to standard rate card on timeout or error.
    """
    key = api_key or os.getenv("DELHIVERY_API_KEY", "").strip()
    if not key:
        return None

    try:
        url = f"https://track.delhivery.com/c/api/pin-codes/json/?filter_codes={dest_pin}"
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Token {key}",
                "Content-Type": "application/json",
                "User-Agent": "SriAdithyaOrganicsPlatform/2.0"
            }
        )
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                codes = data.get("delivery_codes", [])
                if codes and codes[0].get("postal_code", {}).get("pre_paid") == "Y":
                    return {"partner": "Delhivery Express", "status": "Serviceable", "raw": codes[0]}
    except Exception:
        pass

    return None
