from typing import List, Optional, Any, Dict
import urllib.request
import urllib.parse
import json
import math
import os
import re
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
from backend.app.courier import (
    calculate_courier_shipping,
    determine_courier_zone,
    is_valid_indian_pincode,
    estimate_parcel_weight_kg,
    DEFAULT_COURIER_ZONES,
    STORE_PICKUP_PINCODE,
)

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

# Pan-India Delivery & Logistics Hubs (Local Express for <= 60km, Nationwide Courier across all Indian States)
KNOWN_LOCALITY_CLUSTERS = [
    # Telangana Local & Regional Hubs
    {"name": "Kothagudem (Babu Camp / Ganeshbasthi)", "city": "Kothagudem", "district": "Bhadradri Kothagudem", "state": "Telangana", "pin": "507101", "lat": 17.5376, "lon": 80.6210, "hub": "Sri Aditya Organics & Oil Mill", "minutes": 15},
    {"name": "Palwancha", "city": "Palwancha", "district": "Bhadradri Kothagudem", "state": "Telangana", "pin": "507115", "lat": 17.5968, "lon": 80.7061, "hub": "Sri Aditya Organics & Oil Mill", "minutes": 25},
    {"name": "Bhadrachalam", "city": "Bhadrachalam", "district": "Bhadradri Kothagudem", "state": "Telangana", "pin": "507111", "lat": 17.6689, "lon": 80.8936, "hub": "Sri Aditya Organics & Oil Mill", "minutes": 45},
    {"name": "Yellandu", "city": "Yellandu", "district": "Bhadradri Kothagudem", "state": "Telangana", "pin": "507123", "lat": 17.6015, "lon": 80.3340, "hub": "Sri Aditya Organics & Oil Mill", "minutes": 45},
    {"name": "Manuguru", "city": "Manuguru", "district": "Bhadradri Kothagudem", "state": "Telangana", "pin": "507117", "lat": 17.9863, "lon": 80.7511, "hub": "Sri Aditya Organics Regional Hub", "minutes": 60},
    {"name": "Sathupally", "city": "Sathupally", "district": "Khammam", "state": "Telangana", "pin": "507303", "lat": 17.2104, "lon": 80.8354, "hub": "Sri Aditya Organics Regional Hub", "minutes": 55},
    {"name": "Khammam Central", "city": "Khammam", "district": "Khammam", "state": "Telangana", "pin": "507001", "lat": 17.2473, "lon": 80.1514, "hub": "Khammam Regional Hub", "minutes": 40},
    {"name": "Madhira", "city": "Madhira", "district": "Khammam", "state": "Telangana", "pin": "507203", "lat": 16.9208, "lon": 80.3644, "hub": "Khammam Regional Hub", "minutes": 60},
    {"name": "Hyderabad Central (Abids / Koti)", "city": "Hyderabad", "district": "Hyderabad", "state": "Telangana", "pin": "500001", "lat": 17.3850, "lon": 78.4867, "hub": "Sri Adithya Organics Central Hub", "minutes": 60},
    {"name": "Banjara Hills", "city": "Hyderabad", "district": "Hyderabad", "state": "Telangana", "pin": "500034", "lat": 17.4156, "lon": 78.4357, "hub": "Hyderabad Central Hub", "minutes": 60},
    {"name": "Jubilee Hills", "city": "Hyderabad", "district": "Hyderabad", "state": "Telangana", "pin": "500033", "lat": 17.4319, "lon": 78.4073, "hub": "Hyderabad Central Hub", "minutes": 60},
    {"name": "Madhapur / Hitec City", "city": "Hyderabad", "district": "Rangareddy", "state": "Telangana", "pin": "500081", "lat": 17.4474, "lon": 78.3762, "hub": "Hyderabad Cyber Hub", "minutes": 60},
    {"name": "Ghatkesar", "city": "Ghatkesar", "district": "Medchal–Malkajgiri", "state": "Telangana", "pin": "501301", "lat": 17.4477, "lon": 78.6833, "hub": "Sri Adithya Organics Central Hub", "minutes": 60},
    {"name": "Secunderabad", "city": "Hyderabad", "district": "Hyderabad", "state": "Telangana", "pin": "500003", "lat": 17.4399, "lon": 78.4983, "hub": "Hyderabad North Hub", "minutes": 60},
    {"name": "Kukatpally", "city": "Hyderabad", "district": "Medchal–Malkajgiri", "state": "Telangana", "pin": "500072", "lat": 17.4875, "lon": 78.4059, "hub": "Hyderabad West Hub", "minutes": 60},
    {"name": "Gachibowli", "city": "Hyderabad", "district": "Rangareddy", "state": "Telangana", "pin": "500032", "lat": 17.4401, "lon": 78.3489, "hub": "Hyderabad Cyber Hub", "minutes": 60},
    {"name": "Kondapur", "city": "Hyderabad", "district": "Rangareddy", "state": "Telangana", "pin": "500084", "lat": 17.4682, "lon": 78.3621, "hub": "Hyderabad Cyber Hub", "minutes": 60},
    {"name": "Manikonda", "city": "Hyderabad", "district": "Rangareddy", "state": "Telangana", "pin": "500089", "lat": 17.4042, "lon": 78.3846, "hub": "Hyderabad West Hub", "minutes": 60},
    {"name": "Uppal", "city": "Hyderabad", "district": "Medchal–Malkajgiri", "state": "Telangana", "pin": "500039", "lat": 17.4018, "lon": 78.5602, "hub": "Hyderabad East Hub", "minutes": 60},
    {"name": "Dilsukhnagar / LB Nagar", "city": "Hyderabad", "district": "Rangareddy", "state": "Telangana", "pin": "500060", "lat": 17.3685, "lon": 78.5316, "hub": "Hyderabad South East Hub", "minutes": 60},
    {"name": "Shamshabad", "city": "Hyderabad", "district": "Rangareddy", "state": "Telangana", "pin": "501218", "lat": 17.2543, "lon": 78.4311, "hub": "Hyderabad Airport Hub", "minutes": 60},
    {"name": "Miyapur", "city": "Hyderabad", "district": "Medchal–Malkajgiri", "state": "Telangana", "pin": "500049", "lat": 17.4968, "lon": 78.3562, "hub": "Hyderabad West Hub", "minutes": 60},
    {"name": "Kompally", "city": "Hyderabad", "district": "Medchal–Malkajgiri", "state": "Telangana", "pin": "500014", "lat": 17.5385, "lon": 78.4897, "hub": "Hyderabad North Hub", "minutes": 60},
    {"name": "Warangal", "city": "Warangal", "district": "Hanamkonda", "state": "Telangana", "pin": "506001", "lat": 17.9689, "lon": 79.5941, "hub": "Warangal Regional Hub", "minutes": 60},
    {"name": "Hanamkonda", "city": "Warangal", "district": "Hanamkonda", "state": "Telangana", "pin": "506001", "lat": 18.0104, "lon": 79.5630, "hub": "Warangal Regional Hub", "minutes": 60},
    {"name": "Kazipet", "city": "Warangal", "district": "Hanamkonda", "state": "Telangana", "pin": "506003", "lat": 17.9792, "lon": 79.5165, "hub": "Warangal Regional Hub", "minutes": 60},
    {"name": "Karimnagar", "city": "Karimnagar", "district": "Karimnagar", "state": "Telangana", "pin": "505001", "lat": 18.4386, "lon": 79.1288, "hub": "Karimnagar Regional Hub", "minutes": 60},
    {"name": "Nizamabad", "city": "Nizamabad", "district": "Nizamabad", "state": "Telangana", "pin": "503001", "lat": 18.6725, "lon": 78.0941, "hub": "Nizamabad Regional Hub", "minutes": 60},
    {"name": "Ramagundam / Godavarikhani", "city": "Ramagundam", "district": "Peddapalli", "state": "Telangana", "pin": "505208", "lat": 18.7557, "lon": 79.5126, "hub": "Godavarikhani Hub", "minutes": 60},
    {"name": "Mahabubnagar", "city": "Mahabubnagar", "district": "Mahabubnagar", "state": "Telangana", "pin": "509001", "lat": 16.7488, "lon": 77.9863, "hub": "Mahabubnagar Regional Hub", "minutes": 60},
    {"name": "Nalgonda", "city": "Nalgonda", "district": "Nalgonda", "state": "Telangana", "pin": "508001", "lat": 17.0575, "lon": 79.2684, "hub": "Nalgonda Regional Hub", "minutes": 60},
    {"name": "Suryapet", "city": "Suryapet", "district": "Suryapet", "state": "Telangana", "pin": "508213", "lat": 17.1439, "lon": 79.6239, "hub": "Suryapet Hub", "minutes": 60},
    {"name": "Miryalaguda", "city": "Miryalaguda", "district": "Nalgonda", "state": "Telangana", "pin": "508207", "lat": 16.8741, "lon": 79.5638, "hub": "Miryalaguda Hub", "minutes": 60},
    {"name": "Siddipet", "city": "Siddipet", "district": "Siddipet", "state": "Telangana", "pin": "502103", "lat": 18.1018, "lon": 78.8520, "hub": "Siddipet Hub", "minutes": 60},
    {"name": "Mancherial", "city": "Mancherial", "district": "Mancherial", "state": "Telangana", "pin": "504208", "lat": 18.8679, "lon": 79.4639, "hub": "Mancherial Hub", "minutes": 60},
    {"name": "Adilabad", "city": "Adilabad", "district": "Adilabad", "state": "Telangana", "pin": "504001", "lat": 19.6641, "lon": 78.5320, "hub": "Adilabad Regional Hub", "minutes": 60},

    # Andhra Pradesh Hubs & Cities
    {"name": "Vijayawada Central", "city": "Vijayawada", "district": "NTR", "state": "Andhra Pradesh", "pin": "520001", "lat": 16.5062, "lon": 80.6480, "hub": "Vijayawada Regional Hub", "minutes": 60},
    {"name": "Governorpet / Benz Circle", "city": "Vijayawada", "district": "NTR", "state": "Andhra Pradesh", "pin": "520002", "lat": 16.5020, "lon": 80.6488, "hub": "Vijayawada Regional Hub", "minutes": 60},
    {"name": "Visakhapatnam (Vizag Central)", "city": "Visakhapatnam", "district": "Visakhapatnam", "state": "Andhra Pradesh", "pin": "530001", "lat": 17.6868, "lon": 83.2185, "hub": "Visakhapatnam Hub", "minutes": 60},
    {"name": "Gajuwaka", "city": "Visakhapatnam", "district": "Visakhapatnam", "state": "Andhra Pradesh", "pin": "530026", "lat": 17.6904, "lon": 83.1950, "hub": "Visakhapatnam Hub", "minutes": 60},
    {"name": "Guntur", "city": "Guntur", "district": "Guntur", "state": "Andhra Pradesh", "pin": "522001", "lat": 16.3067, "lon": 80.4365, "hub": "Guntur Regional Hub", "minutes": 60},
    {"name": "Nellore", "city": "Nellore", "district": "SPSR Nellore", "state": "Andhra Pradesh", "pin": "524001", "lat": 14.4426, "lon": 79.9865, "hub": "Nellore Hub", "minutes": 60},
    {"name": "Kurnool", "city": "Kurnool", "district": "Kurnool", "state": "Andhra Pradesh", "pin": "518001", "lat": 15.8281, "lon": 78.0373, "hub": "Kurnool Hub", "minutes": 60},
    {"name": "Rajahmundry", "city": "Rajahmundry", "district": "East Godavari", "state": "Andhra Pradesh", "pin": "533101", "lat": 17.0005, "lon": 81.8040, "hub": "Godavari Hub", "minutes": 60},
    {"name": "Kakinada", "city": "Kakinada", "district": "Kakinada", "state": "Andhra Pradesh", "pin": "533001", "lat": 16.9891, "lon": 82.2475, "hub": "Kakinada Hub", "minutes": 60},
    {"name": "Tirupati", "city": "Tirupati", "district": "Tirupati", "state": "Andhra Pradesh", "pin": "517501", "lat": 13.6288, "lon": 79.4192, "hub": "Tirupati Hub", "minutes": 60},
    {"name": "Kadapa", "city": "Kadapa", "district": "YSR Kadapa", "state": "Andhra Pradesh", "pin": "516001", "lat": 14.4673, "lon": 78.8242, "hub": "Kadapa Hub", "minutes": 60},
    {"name": "Anantapur", "city": "Anantapur", "district": "Anantapur", "state": "Andhra Pradesh", "pin": "515001", "lat": 14.6819, "lon": 77.6006, "hub": "Anantapur Hub", "minutes": 60},
    {"name": "Eluru", "city": "Eluru", "district": "Eluru", "state": "Andhra Pradesh", "pin": "534001", "lat": 16.7107, "lon": 81.0952, "hub": "Eluru Hub", "minutes": 60},
    {"name": "Ongole", "city": "Ongole", "district": "Prakasam", "state": "Andhra Pradesh", "pin": "523001", "lat": 15.5057, "lon": 80.0499, "hub": "Ongole Hub", "minutes": 60},

    # Karnataka Hubs & Cities
    {"name": "Bengaluru Central (MG Road / Majestic)", "city": "Bengaluru", "district": "Bengaluru Urban", "state": "Karnataka", "pin": "560001", "lat": 12.9716, "lon": 77.5946, "hub": "Bengaluru Fulfillment Hub", "minutes": 60},
    {"name": "Indiranagar", "city": "Bengaluru", "district": "Bengaluru Urban", "state": "Karnataka", "pin": "560038", "lat": 12.9784, "lon": 77.6408, "hub": "Bengaluru Fulfillment Hub", "minutes": 60},
    {"name": "Koramangala", "city": "Bengaluru", "district": "Bengaluru Urban", "state": "Karnataka", "pin": "560034", "lat": 12.9352, "lon": 77.6245, "hub": "Bengaluru Fulfillment Hub", "minutes": 60},
    {"name": "Whitefield", "city": "Bengaluru", "district": "Bengaluru Urban", "state": "Karnataka", "pin": "560066", "lat": 12.9698, "lon": 77.7500, "hub": "Bengaluru East Hub", "minutes": 60},
    {"name": "Electronic City", "city": "Bengaluru", "district": "Bengaluru Urban", "state": "Karnataka", "pin": "560100", "lat": 12.8452, "lon": 77.6602, "hub": "Bengaluru South Hub", "minutes": 60},
    {"name": "HSR Layout", "city": "Bengaluru", "district": "Bengaluru Urban", "state": "Karnataka", "pin": "560102", "lat": 12.9121, "lon": 77.6446, "hub": "Bengaluru South Hub", "minutes": 60},
    {"name": "Mysuru (Mysore)", "city": "Mysuru", "district": "Mysuru", "state": "Karnataka", "pin": "570001", "lat": 12.2958, "lon": 76.6394, "hub": "Mysuru Hub", "minutes": 60},
    {"name": "Mangaluru (Mangalore)", "city": "Mangaluru", "district": "Dakshina Kannada", "state": "Karnataka", "pin": "575001", "lat": 12.9141, "lon": 74.8560, "hub": "Mangaluru Coastal Hub", "minutes": 60},
    {"name": "Hubballi-Dharwad", "city": "Hubballi", "district": "Dharwad", "state": "Karnataka", "pin": "580020", "lat": 15.3647, "lon": 75.1240, "hub": "North Karnataka Hub", "minutes": 60},
    {"name": "Belagavi (Belgaum)", "city": "Belagavi", "district": "Belagavi", "state": "Karnataka", "pin": "590001", "lat": 15.8497, "lon": 74.4977, "hub": "Belagavi Hub", "minutes": 60},
    {"name": "Kalaburagi (Gulbarga)", "city": "Kalaburagi", "district": "Kalaburagi", "state": "Karnataka", "pin": "585101", "lat": 17.3297, "lon": 76.8343, "hub": "Kalaburagi Hub", "minutes": 60},

    # Tamil Nadu Hubs & Cities
    {"name": "Chennai Central", "city": "Chennai", "district": "Chennai", "state": "Tamil Nadu", "pin": "600001", "lat": 13.0827, "lon": 80.2707, "hub": "Chennai Fulfillment Hub", "minutes": 60},
    {"name": "T. Nagar", "city": "Chennai", "district": "Chennai", "state": "Tamil Nadu", "pin": "600017", "lat": 13.0418, "lon": 80.2341, "hub": "Chennai Central Hub", "minutes": 60},
    {"name": "Adyar / Velachery", "city": "Chennai", "district": "Chennai", "state": "Tamil Nadu", "pin": "600020", "lat": 13.0012, "lon": 80.2565, "hub": "Chennai South Hub", "minutes": 60},
    {"name": "Coimbatore", "city": "Coimbatore", "district": "Coimbatore", "state": "Tamil Nadu", "pin": "641001", "lat": 11.0168, "lon": 76.9558, "hub": "Coimbatore Textile Hub", "minutes": 60},
    {"name": "Madurai", "city": "Madurai", "district": "Madurai", "state": "Tamil Nadu", "pin": "625001", "lat": 9.9252, "lon": 78.1198, "hub": "Madurai Hub", "minutes": 60},
    {"name": "Tiruchirappalli (Trichy)", "city": "Tiruchirappalli", "district": "Tiruchirappalli", "state": "Tamil Nadu", "pin": "620001", "lat": 10.7905, "lon": 78.7047, "hub": "Trichy Hub", "minutes": 60},
    {"name": "Salem", "city": "Salem", "district": "Salem", "state": "Tamil Nadu", "pin": "636001", "lat": 11.6643, "lon": 78.1460, "hub": "Salem Hub", "minutes": 60},
    {"name": "Tiruppur", "city": "Tiruppur", "district": "Tiruppur", "state": "Tamil Nadu", "pin": "641601", "lat": 11.1085, "lon": 77.3411, "hub": "Tiruppur Hub", "minutes": 60},

    # Maharashtra Hubs & Cities
    {"name": "Mumbai Central (Fort / Nariman Point)", "city": "Mumbai", "district": "Mumbai City", "state": "Maharashtra", "pin": "400001", "lat": 18.9322, "lon": 72.8347, "hub": "Mumbai Central Hub", "minutes": 60},
    {"name": "Bandra West", "city": "Mumbai", "district": "Mumbai Suburban", "state": "Maharashtra", "pin": "400050", "lat": 19.0596, "lon": 72.8295, "hub": "Mumbai West Hub", "minutes": 60},
    {"name": "Andheri West", "city": "Mumbai", "district": "Mumbai Suburban", "state": "Maharashtra", "pin": "400053", "lat": 19.1136, "lon": 72.8397, "hub": "Mumbai West Hub", "minutes": 60},
    {"name": "Navi Mumbai (Vashi)", "city": "Navi Mumbai", "district": "Thane", "state": "Maharashtra", "pin": "400703", "lat": 19.0771, "lon": 72.9986, "hub": "Navi Mumbai Hub", "minutes": 60},
    {"name": "Thane", "city": "Thane", "district": "Thane", "state": "Maharashtra", "pin": "400601", "lat": 19.2183, "lon": 72.9781, "hub": "Thane Hub", "minutes": 60},
    {"name": "Pune Central (Shivajinagar)", "city": "Pune", "district": "Pune", "state": "Maharashtra", "pin": "411005", "lat": 18.5308, "lon": 73.8475, "hub": "Pune Fulfillment Hub", "minutes": 60},
    {"name": "Hinjewadi (IT Park)", "city": "Pune", "district": "Pune", "state": "Maharashtra", "pin": "411057", "lat": 18.5913, "lon": 73.7389, "hub": "Pune West Hub", "minutes": 60},
    {"name": "Kothrud", "city": "Pune", "district": "Pune", "state": "Maharashtra", "pin": "411038", "lat": 18.5074, "lon": 73.8077, "hub": "Pune West Hub", "minutes": 60},
    {"name": "Viman Nagar", "city": "Pune", "district": "Pune", "state": "Maharashtra", "pin": "411014", "lat": 18.5679, "lon": 73.9143, "hub": "Pune East Hub", "minutes": 60},
    {"name": "Nagpur", "city": "Nagpur", "district": "Nagpur", "state": "Maharashtra", "pin": "440001", "lat": 21.1458, "lon": 79.0882, "hub": "Nagpur Hub", "minutes": 60},
    {"name": "Nashik", "city": "Nashik", "district": "Nashik", "state": "Maharashtra", "pin": "422001", "lat": 19.9975, "lon": 73.7898, "hub": "Nashik Hub", "minutes": 60},
    {"name": "Chhatrapati Sambhajinagar (Aurangabad)", "city": "Chhatrapati Sambhajinagar", "district": "Chhatrapati Sambhajinagar", "state": "Maharashtra", "pin": "431001", "lat": 19.8762, "lon": 75.3433, "hub": "Marathwada Hub", "minutes": 60},

    # Delhi NCR Hubs & Cities
    {"name": "New Delhi (Connaught Place)", "city": "New Delhi", "district": "New Delhi", "state": "Delhi", "pin": "110001", "lat": 28.6315, "lon": 77.2167, "hub": "Delhi NCR Fulfillment Hub", "minutes": 60},
    {"name": "South Extension / Lajpat Nagar", "city": "New Delhi", "district": "South Delhi", "state": "Delhi", "pin": "110049", "lat": 28.5727, "lon": 77.2217, "hub": "South Delhi Hub", "minutes": 60},
    {"name": "Dwarka", "city": "New Delhi", "district": "South West Delhi", "state": "Delhi", "pin": "110075", "lat": 28.5921, "lon": 77.0460, "hub": "West Delhi Hub", "minutes": 60},
    {"name": "Rohini", "city": "New Delhi", "district": "North West Delhi", "state": "Delhi", "pin": "110085", "lat": 28.7495, "lon": 77.0565, "hub": "North Delhi Hub", "minutes": 60},
    {"name": "Gurugram (Cyber City / DLF)", "city": "Gurugram", "district": "Gurugram", "state": "Haryana", "pin": "122002", "lat": 28.4595, "lon": 77.0266, "hub": "Gurugram Cyber Hub", "minutes": 60},
    {"name": "Noida (Sector 18 / Atta)", "city": "Noida", "district": "Gautam Buddha Nagar", "state": "Uttar Pradesh", "pin": "201301", "lat": 28.5708, "lon": 77.3260, "hub": "Noida Commercial Hub", "minutes": 60},
    {"name": "Ghaziabad", "city": "Ghaziabad", "district": "Ghaziabad", "state": "Uttar Pradesh", "pin": "201001", "lat": 28.6692, "lon": 77.4538, "hub": "Ghaziabad Hub", "minutes": 60},
    {"name": "Faridabad", "city": "Faridabad", "district": "Faridabad", "state": "Haryana", "pin": "121001", "lat": 28.4089, "lon": 77.3178, "hub": "Faridabad Hub", "minutes": 60},

    # Gujarat Hubs & Cities
    {"name": "Ahmedabad (Navrangpura / SG Highway)", "city": "Ahmedabad", "district": "Ahmedabad", "state": "Gujarat", "pin": "380009", "lat": 23.0373, "lon": 72.5525, "hub": "Ahmedabad Central Hub", "minutes": 60},
    {"name": "Gandhinagar", "city": "Gandhinagar", "district": "Gandhinagar", "state": "Gujarat", "pin": "382010", "lat": 23.2156, "lon": 72.6369, "hub": "Gujarat Capital Hub", "minutes": 60},
    {"name": "Surat", "city": "Surat", "district": "Surat", "state": "Gujarat", "pin": "395003", "lat": 21.1702, "lon": 72.8311, "hub": "Surat Textile Hub", "minutes": 60},
    {"name": "Vadodara (Baroda)", "city": "Vadodara", "district": "Vadodara", "state": "Gujarat", "pin": "390001", "lat": 22.3072, "lon": 73.1812, "hub": "Vadodara Hub", "minutes": 60},
    {"name": "Rajkot", "city": "Rajkot", "district": "Rajkot", "state": "Gujarat", "pin": "360001", "lat": 22.3039, "lon": 70.8022, "hub": "Saurashtra Hub", "minutes": 60},

    # West Bengal Hubs & Cities
    {"name": "Kolkata (Park Street / BBD Bagh)", "city": "Kolkata", "district": "Kolkata", "state": "West Bengal", "pin": "700016", "lat": 22.5555, "lon": 88.3514, "hub": "Kolkata Fulfillment Hub", "minutes": 60},
    {"name": "Salt Lake / New Town", "city": "Kolkata", "district": "North 24 Parganas", "state": "West Bengal", "pin": "700091", "lat": 22.5867, "lon": 88.4178, "hub": "Kolkata Cyber Hub", "minutes": 60},
    {"name": "Howrah", "city": "Howrah", "district": "Howrah", "state": "West Bengal", "pin": "711101", "lat": 22.5958, "lon": 88.2636, "hub": "Howrah Hub", "minutes": 60},
    {"name": "Siliguri", "city": "Siliguri", "district": "Darjeeling", "state": "West Bengal", "pin": "734001", "lat": 26.7271, "lon": 88.3953, "hub": "North Bengal Hub", "minutes": 60},

    # Rajasthan Hubs & Cities
    {"name": "Jaipur (C-Scheme / Malviya Nagar)", "city": "Jaipur", "district": "Jaipur", "state": "Rajasthan", "pin": "302001", "lat": 26.9124, "lon": 75.7873, "hub": "Jaipur Fulfillment Hub", "minutes": 60},
    {"name": "Jodhpur", "city": "Jodhpur", "district": "Jodhpur", "state": "Rajasthan", "pin": "342001", "lat": 26.2389, "lon": 73.0243, "hub": "Marwar Hub", "minutes": 60},
    {"name": "Udaipur", "city": "Udaipur", "district": "Udaipur", "state": "Rajasthan", "pin": "313001", "lat": 24.5854, "lon": 73.7125, "hub": "Udaipur Hub", "minutes": 60},
    {"name": "Kota", "city": "Kota", "district": "Kota", "state": "Rajasthan", "pin": "324001", "lat": 25.2138, "lon": 75.8648, "hub": "Kota Hub", "minutes": 60},

    # Uttar Pradesh Hubs & Cities
    {"name": "Lucknow (Hazratganj / Gomti Nagar)", "city": "Lucknow", "district": "Lucknow", "state": "Uttar Pradesh", "pin": "226001", "lat": 26.8467, "lon": 80.9462, "hub": "Lucknow Fulfillment Hub", "minutes": 60},
    {"name": "Kanpur", "city": "Kanpur", "district": "Kanpur Nagar", "state": "Uttar Pradesh", "pin": "208001", "lat": 26.4499, "lon": 80.3319, "hub": "Kanpur Hub", "minutes": 60},
    {"name": "Varanasi (Banaras)", "city": "Varanasi", "district": "Varanasi", "state": "Uttar Pradesh", "pin": "221001", "lat": 25.3176, "lon": 82.9739, "hub": "Varanasi Cultural Hub", "minutes": 60},
    {"name": "Prayagraj (Allahabad)", "city": "Prayagraj", "district": "Prayagraj", "state": "Uttar Pradesh", "pin": "211001", "lat": 25.4358, "lon": 81.8463, "hub": "Prayagraj Hub", "minutes": 60},
    {"name": "Agra", "city": "Agra", "district": "Agra", "state": "Uttar Pradesh", "pin": "282001", "lat": 27.1767, "lon": 78.0081, "hub": "Agra Hub", "minutes": 60},
    {"name": "Meerut", "city": "Meerut", "district": "Meerut", "state": "Uttar Pradesh", "pin": "250001", "lat": 28.9845, "lon": 77.7064, "hub": "Meerut Hub", "minutes": 60},

    # Kerala Hubs & Cities
    {"name": "Kochi / Ernakulam", "city": "Kochi", "district": "Ernakulam", "state": "Kerala", "pin": "682001", "lat": 9.9312, "lon": 76.2673, "hub": "Kochi Port Hub", "minutes": 60},
    {"name": "Thiruvananthapuram (Trivandrum)", "city": "Thiruvananthapuram", "district": "Thiruvananthapuram", "state": "Kerala", "pin": "695001", "lat": 8.5241, "lon": 76.9366, "hub": "Kerala Capital Hub", "minutes": 60},
    {"name": "Kozhikode (Calicut)", "city": "Kozhikode", "district": "Kozhikode", "state": "Kerala", "pin": "673001", "lat": 11.2588, "lon": 75.7804, "hub": "Malabar Hub", "minutes": 60},

    # Madhya Pradesh Hubs & Cities
    {"name": "Indore (Vijay Nagar)", "city": "Indore", "district": "Indore", "state": "Madhya Pradesh", "pin": "452001", "lat": 22.7196, "lon": 75.8577, "hub": "Indore Commercial Hub", "minutes": 60},
    {"name": "Bhopal (MP Nagar)", "city": "Bhopal", "district": "Bhopal", "state": "Madhya Pradesh", "pin": "462001", "lat": 23.2599, "lon": 77.4126, "hub": "Bhopal Hub", "minutes": 60},
    {"name": "Gwalior", "city": "Gwalior", "district": "Gwalior", "state": "Madhya Pradesh", "pin": "474001", "lat": 26.2183, "lon": 78.1828, "hub": "Gwalior Hub", "minutes": 60},
    {"name": "Jabalpur", "city": "Jabalpur", "district": "Jabalpur", "state": "Madhya Pradesh", "pin": "482001", "lat": 23.1815, "lon": 79.9864, "hub": "Jabalpur Hub", "minutes": 60},

    # Punjab & Haryana & Chandigarh
    {"name": "Chandigarh Central (Sector 17)", "city": "Chandigarh", "district": "Chandigarh", "state": "Chandigarh", "pin": "160017", "lat": 30.7333, "lon": 76.7794, "hub": "Chandigarh Tricity Hub", "minutes": 60},
    {"name": "Ludhiana", "city": "Ludhiana", "district": "Ludhiana", "state": "Punjab", "pin": "141001", "lat": 30.9010, "lon": 75.8573, "hub": "Ludhiana Industrial Hub", "minutes": 60},
    {"name": "Amritsar", "city": "Amritsar", "district": "Amritsar", "state": "Punjab", "pin": "143001", "lat": 31.6340, "lon": 74.8723, "hub": "Amritsar Hub", "minutes": 60},

    # Bihar & Jharkhand
    {"name": "Patna (Bailey Road)", "city": "Patna", "district": "Patna", "state": "Bihar", "pin": "800001", "lat": 25.5941, "lon": 85.1376, "hub": "Patna Fulfillment Hub", "minutes": 60},
    {"name": "Ranchi", "city": "Ranchi", "district": "Ranchi", "state": "Jharkhand", "pin": "834001", "lat": 23.3441, "lon": 85.3096, "hub": "Ranchi Hub", "minutes": 60},
    {"name": "Jamshedpur (Tatanagar)", "city": "Jamshedpur", "district": "East Singhbhum", "state": "Jharkhand", "pin": "831001", "lat": 22.8046, "lon": 86.2029, "hub": "Jamshedpur Hub", "minutes": 60},

    # Odisha & Chhattisgarh
    {"name": "Bhubaneswar", "city": "Bhubaneswar", "district": "Khordha", "state": "Odisha", "pin": "751001", "lat": 20.2961, "lon": 85.8245, "hub": "Bhubaneswar Smart Hub", "minutes": 60},
    {"name": "Raipur", "city": "Raipur", "district": "Raipur", "state": "Chhattisgarh", "pin": "492001", "lat": 21.2514, "lon": 81.6296, "hub": "Raipur Central Hub", "minutes": 60},

    # Assam & North East & Goa
    {"name": "Guwahati (GS Road)", "city": "Guwahati", "district": "Kamrup Metropolitan", "state": "Assam", "pin": "781001", "lat": 26.1445, "lon": 91.7362, "hub": "North East Hub", "minutes": 60},
    {"name": "Panaji (Panjim)", "city": "Panaji", "district": "North Goa", "state": "Goa", "pin": "403001", "lat": 15.4909, "lon": 73.8278, "hub": "Goa Hub", "minutes": 60},
    {"name": "Dehradun", "city": "Dehradun", "district": "Dehradun", "state": "Uttarakhand", "pin": "248001", "lat": 30.3165, "lon": 78.0322, "hub": "Uttarakhand Hub", "minutes": 60},
    {"name": "Shimla", "city": "Shimla", "district": "Shimla", "state": "Himachal Pradesh", "pin": "171001", "lat": 31.1048, "lon": 77.1734, "hub": "Himachal Hub", "minutes": 60},
    {"name": "Srinagar", "city": "Srinagar", "district": "Srinagar", "state": "Jammu and Kashmir", "pin": "190001", "lat": 34.0837, "lon": 74.7973, "hub": "Kashmir Hub", "minutes": 60},
    {"name": "Puducherry (Pondicherry)", "city": "Puducherry", "district": "Puducherry", "state": "Puducherry", "pin": "605001", "lat": 11.9416, "lon": 79.8083, "hub": "Puducherry Hub", "minutes": 60},
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

    is_testing = bool(os.environ.get("PYTEST_CURRENT_TEST") or os.environ.get("TESTING") or os.environ.get("OFFLINE_ROUTING"))

    # 1. Google Maps Geocoding API if configured
    google_key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if not is_testing and google_key and not resolved_city:
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
    if not is_testing and (not resolved_city or not resolved_pin):
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
    if not is_testing and (not resolved_city or not resolved_pin):
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
    if not is_testing and (not resolved_city or not resolved_pin):
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

    # 5. Proximity and region fallback when geocoding network APIs are offline or timeout
    in_telangana = (15.8 <= lat <= 19.9) and (77.2 <= lon <= 81.8)

    if not resolved_pin:
        # Check proximity to known locality clusters (up to 35 km)
        closest = None
        min_d = float("inf")
        for c in KNOWN_LOCALITY_CLUSTERS:
            d = calculate_distance(lat, lon, c["lat"], c["lon"])
            if d < min_d:
                min_d = d
                closest = c
        if closest and min_d <= 35.0:
            resolved_pin = closest["pin"]
            resolved_city = resolved_city if (resolved_city and resolved_city != "Telangana") else closest["city"]
            resolved_district = resolved_district or closest.get("district")
            resolved_locality = resolved_locality if (resolved_locality and resolved_locality != "Telangana") else closest["name"]
            resolved_state = resolved_state or closest["state"]
        elif store_dist <= 5.0:
            resolved_pin = "507101"
            resolved_city = "Kothagudem"
            resolved_locality = resolved_locality or "Babu Camp"
            resolved_state = "Telangana"
        else:
            # Never invent 500001 or any fallback PIN. Mark incomplete so customer enters real PIN.
            is_incomplete = True

    if not resolved_city:
        resolved_city = resolved_district or ("Telangana" if in_telangana else "India")
        is_incomplete = True
    if not resolved_locality:
        resolved_locality = road or resolved_city
    if not resolved_state:
        resolved_state = "Telangana" if in_telangana else "India"

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

    # Hybrid Delivery Resolution:
    # 1. Local Express Delivery for nearby customers (<= 60 km)
    local_delivery_radius_km = 60.0
    is_local_eligible = road_dist <= local_delivery_radius_km

    if is_local_eligible:
        slabs = DEFAULT_DISTANCE_SLABS
        calculated_fee, is_serviceable, fee_msg, matched_slab = calculate_distance_based_delivery_fee(
            distance_km=road_dist,
            slabs=slabs,
            subtotal=0.0,
            free_delivery_threshold=499.0,
            max_delivery_radius_km=local_delivery_radius_km,
            default_fallback_fee=39.0
        )
        delivery_mode = "local_express"
        delivery_type = "Local Express Delivery"
        courier_partner = None
        estimated_days = "Same Day (15-30 Mins)"
        parcel_weight = None

        if road_dist <= 2.0:
            est_minutes = 15
        elif road_dist <= 5.0:
            est_minutes = 20
        elif road_dist <= 15.0:
            est_minutes = 30
        elif road_dist <= 35.0:
            est_minutes = 45
        else:
            est_minutes = 75

        serv_hub = "Sri Aditya Organics & Oil Mill (Kothagudem)"
        serv_msg = f"Local Express Delivery Available (~{road_dist:.1f} km from Kothagudem Mill)"
    else:
        # 2. Nationwide Courier Delivery for all Indian addresses outside local 60 km radius
        clean_pin = (resolved_pin or "").strip()
        if not is_valid_indian_pincode(clean_pin):
            closest_cluster = min(KNOWN_LOCALITY_CLUSTERS, key=lambda c: calculate_distance(lat, lon, c["lat"], c["lon"])) if KNOWN_LOCALITY_CLUSTERS else None
            if closest_cluster and calculate_distance(lat, lon, closest_cluster["lat"], closest_cluster["lon"]) <= 60.0:
                clean_pin = closest_cluster["pin"]
                resolved_pin = clean_pin

        if is_valid_indian_pincode(clean_pin):
            courier_quote = calculate_courier_shipping(
                dest_pincode=clean_pin,
                weight_kg=0.5,
                subtotal=0.0,
                pickup_pincode="507101",
                partner_name="Delhivery"
            )
            is_serviceable = courier_quote.get("is_serviceable", True)
            delivery_mode = "nationwide_courier"
            delivery_type = "Nationwide Courier Shipping"
            courier_partner = courier_quote.get("courier_partner", "Delhivery")
            estimated_days = courier_quote.get("estimated_days", "2–4 Business Days")
            parcel_weight = courier_quote.get("billable_weight_kg", 1.0)
            est_minutes = int(courier_quote.get("min_delivery_days", 2)) * 24 * 60
            calculated_fee = float(courier_quote.get("shipping_fee", 49.0))
            matched_slab = courier_quote.get("zone_name", "Nationwide Courier Zone")
            serv_hub = f"Sri Adithya Organics Central Fulfillment Facility → {resolved_city} ({courier_partner})"
            serv_msg = courier_quote.get("message", f"Nationwide Courier Available ({courier_partner} • {estimated_days})")
        else:
            # Beyond 60km without confirmed 6-digit PIN: Serviceable via Nationwide Courier upon PIN confirmation
            delivery_mode = "nationwide_courier"
            delivery_type = "Nationwide Courier Shipping"
            is_serviceable = True
            courier_partner = "Delhivery"
            estimated_days = "2–4 Business Days"
            parcel_weight = 1.0
            est_minutes = 48 * 60
            calculated_fee = 49.0
            matched_slab = "Nationwide Courier Standard"
            serv_hub = f"Sri Adithya Organics Central Fulfillment Facility → {resolved_city} (Delhivery)"
            serv_msg = "Pan-India delivery available via Courier. Please confirm your 6-digit postal PIN code."

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
        delivery_mode=delivery_mode,
        delivery_type=delivery_type,
        courier_partner=courier_partner,
        estimated_delivery_days=estimated_days,
        parcel_weight_kg=parcel_weight,
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


SEARCH_ADDRESS_CACHE: Dict[str, List[AddressSearchResultItem]] = {}


@router.get("/search", response_model=List[AddressSearchResultItem])
def search_address(query: Optional[str] = Query(None), q: Optional[str] = Query(None)):
    raw_query = ""
    if isinstance(query, str) and query.strip():
        raw_query = query.strip()
    elif isinstance(q, str) and q.strip():
        raw_query = q.strip()

    if not raw_query or len(raw_query) < 2:
        return []

    q_clean = raw_query

    cache_key = q_clean.lower()
    if cache_key in SEARCH_ADDRESS_CACHE:
        return SEARCH_ADDRESS_CACHE[cache_key]

    results: List[AddressSearchResultItem] = []
    seen_places = set()
    q_lower = q_clean.lower()

    # 1. Fast match against Pan-India clusters & major Indian cities
    for c in KNOWN_LOCALITY_CLUSTERS:
        c_name = c["name"].lower()
        c_city = c["city"].lower()
        c_dist = (c.get("district") or "").lower()
        c_state = c["state"].lower()
        c_pin = c["pin"]

        is_match = (
            q_lower == c_pin
            or q_lower in c_name
            or q_lower in c_city
            or q_lower in c_dist
            or q_lower in c_state
            or (len(q_clean) >= 3 and (c_name.startswith(q_lower) or c_city.startswith(q_lower) or c_pin.startswith(q_clean)))
        )

        if is_match:
            key = (round(c["lat"], 3), round(c["lon"], 3))
            if key not in seen_places:
                seen_places.add(key)
                dist_label = f", {c['district']}" if c.get("district") and c["district"] != c["city"] else ""
                disp = f"{c['name']}, {c['city']}{dist_label}, {c['state']} - {c['pin']}"
                results.append(AddressSearchResultItem(
                    place_id=f"cluster_{c['pin']}_{c['lat']}",
                    formatted_address=disp,
                    locality=c["name"],
                    city=c["city"],
                    district=c.get("district"),
                    state=c["state"],
                    postal_code=c["pin"],
                    latitude=c["lat"],
                    longitude=c["lon"]
                ))

    # 2. Smart Indian PIN code matching
    clean_digits = re.sub(r"\D", "", q_clean)
    if len(clean_digits) == 6:
        if not any(r.postal_code == clean_digits for r in results):
            circle_prefix = clean_digits[:2]
            if circle_prefix in PIN_REGION_MAP:
                reg_city, reg_state = PIN_REGION_MAP[circle_prefix]
                closest_circle_cluster = next((c for c in KNOWN_LOCALITY_CLUSTERS if c["pin"][:2] == circle_prefix), None)
                p_lat = closest_circle_cluster["lat"] if closest_circle_cluster else 17.5376
                p_lon = closest_circle_cluster["lon"] if closest_circle_cluster else 80.6210
                results.insert(0, AddressSearchResultItem(
                    place_id=f"pin_{clean_digits}",
                    formatted_address=f"PIN {clean_digits}, {reg_city}, {reg_state}",
                    locality=f"Postal Sector {clean_digits}",
                    city=reg_city,
                    district=reg_city,
                    state=reg_state,
                    postal_code=clean_digits,
                    latitude=p_lat,
                    longitude=p_lon
                ))

    # 3. Live Geocoding via Photon (Komoot OSM)
    encoded = urllib.parse.quote(q_clean)
    try:
        p_url = f"https://photon.komoot.io/api/?q={encoded}&limit=8"
        req = urllib.request.Request(p_url, headers={"User-Agent": "SriAdithyaOrganicsPlatform/2.0"})
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            if resp.status == 200:
                p_data = json.loads(resp.read().decode("utf-8"))
                for feat in p_data.get("features", []):
                    props = feat.get("properties", {})
                    c_code = props.get("countrycode") or props.get("country")
                    if c_code and str(c_code).upper() not in ("IN", "INDIA"):
                        continue
                    coords = feat.get("geometry", {}).get("coordinates", [])
                    if len(coords) >= 2:
                        lon_val, lat_val = float(coords[0]), float(coords[1])
                        if not (6.0 <= lat_val <= 38.0 and 68.0 <= lon_val <= 98.0):
                            continue
                        key = (round(lat_val, 3), round(lon_val, 3))
                        if key not in seen_places:
                            seen_places.add(key)
                            name_val = props.get("name") or props.get("street") or q_clean
                            city_val = props.get("city") or props.get("town") or props.get("county") or ""
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

    # 4. Live Geocoding via Nominatim (Pan-India OpenStreetMap) if needed
    if len(results) < 5:
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

    if len(SEARCH_ADDRESS_CACHE) > 500:
        SEARCH_ADDRESS_CACHE.clear()
    final_results = results[:12]
    SEARCH_ADDRESS_CACHE[cache_key] = final_results
    return final_results


@router.post("/check-serviceability", response_model=ServiceabilityCheckOut)
async def check_serviceability(req: ServiceabilityCheckRequest, d1: D1Database = Depends(get_d1)):
    # 1. Fetch store delivery settings
    min_order = 99.0
    free_thresh = 499.0
    std_fee = 39.0
    store_lat = 17.5376
    store_lon = 80.6210
    delivery_radius_km = 60.0
    max_express_radius_km = 15.0
    store_addr = "Sri Aditya Organics & Oil Mill, Jilla Parishad Complex, Babu Camp Road, Ganeshbasthi, Opp. Babu Camp Ramalayam, Kothagudem, Telangana 507101"
    store_maps = "https://share.google/e1aO3V8FJQ7USIKzU"

    setting = None
    if hasattr(d1, "fetch_one"):
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
            print(f"[Serviceability] Settings fetch notice: {e}", flush=True)

    pin = (req.postal_code or "").strip()
    is_valid_pin = len(pin) == 6 and pin.isdigit()
    matching_cluster = next((c for c in KNOWN_LOCALITY_CLUSTERS if c["pin"] == pin), None)

    if not is_valid_pin:
        return ServiceabilityCheckOut(
            is_serviceable=False,
            status="Address Verification Required",
            postal_code=pin,
            city="India",
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
    if hasattr(d1, "fetch_one"):
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
        city = reg[0] if reg else "India"
        locality = f"PIN {pin}"
        hub = f"Sri Adithya Organics Central Fulfillment Facility → {city}"

    subtotal = float(req.cart_subtotal or 0.0)

    # 5. Hybrid Delivery Evaluation: Local Express vs Nationwide Courier
    is_local_eligible = bool(zone) or (distance_km is not None and distance_km <= delivery_radius_km)

    if is_local_eligible:
        slabs = parse_distance_slabs(setting.get("distance_slabs_json") if setting else None)

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
            minutes = 30

        status_label = "Delivery Available" if (distance_km is not None and distance_km <= max_express_radius_km) or (subtotal >= free_thresh) else "Delivery Available with Distance Charges"

        return ServiceabilityCheckOut(
            is_serviceable=True,
            status=status_label,
            delivery_mode="local_express",
            delivery_type="Local Express Delivery",
            courier_partner=None,
            courier_zone=None,
            estimated_delivery_days="Same Day (15-30 Mins)",
            parcel_weight_kg=None,
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

    # 6. Nationwide Courier Shipping (For all Indian PINs outside local delivery radius)
    courier_enabled = bool(setting.get("courier_enabled", 1)) if setting else True
    partner_name = str(setting.get("courier_default_partner") or "Delhivery") if setting else "Delhivery"
    free_courier_thresh = float(setting.get("courier_free_threshold") if setting and setting.get("courier_free_threshold") is not None else 999.0)
    rates_json = setting.get("courier_rates_json") if setting else None
    rates_dict = None
    if rates_json:
        try:
            rates_dict = json.loads(rates_json)
        except Exception:
            pass
    blist = setting.get("courier_blacklisted_pins") if setting else None

    if not courier_enabled:
        return ServiceabilityCheckOut(
            is_serviceable=False,
            status="Delivery Not Available",
            delivery_mode="unserviceable",
            delivery_type="Local Express Delivery",
            postal_code=pin,
            city=city,
            locality=locality,
            estimated_delivery_minutes=0,
            delivery_fee=0.0,
            distance_km=distance_km,
            distance_source=distance_source,
            min_order_amount=min_order,
            free_delivery_threshold=free_thresh,
            service_hub="Out of Delivery Range",
            message=f"Local delivery is limited to {int(delivery_radius_km)} km from Kothagudem Mill and nationwide courier shipping is currently disabled.",
            store_address=store_addr,
            store_maps_url=store_maps
        )

    weight_input = float(req.cart_weight_kg or 0.5)
    courier_quote = calculate_courier_shipping(
        dest_pincode=pin,
        weight_kg=weight_input,
        subtotal=subtotal,
        pickup_pincode=str(setting.get("store_pincode") or STORE_PICKUP_PINCODE) if setting else STORE_PICKUP_PINCODE,
        courier_rates=rates_dict,
        free_threshold=free_courier_thresh,
        partner_name=partner_name,
        blacklisted_pins=blist
    )

    if not courier_quote.get("is_serviceable"):
        return ServiceabilityCheckOut(
            is_serviceable=False,
            status="Delivery Not Available",
            delivery_mode="unserviceable",
            delivery_type="Nationwide Courier Shipping",
            courier_partner=partner_name,
            postal_code=pin,
            city=city,
            locality=locality,
            estimated_delivery_minutes=0,
            delivery_fee=0.0,
            distance_km=distance_km,
            distance_source=distance_source,
            min_order_amount=min_order,
            free_delivery_threshold=free_courier_thresh,
            service_hub="Out of Delivery Range",
            message=courier_quote.get("message", f"Courier shipping unavailable to PIN {pin}."),
            store_address=store_addr,
            store_maps_url=store_maps
        )

    # 100% Serviceable via Nationwide Courier
    is_free_courier = courier_quote.get("is_free_shipping", False)
    status_label = "Free Nationwide Shipping" if is_free_courier else "Nationwide Courier Available"
    courier_fee = float(courier_quote.get("shipping_fee", 49.0))
    min_days = int(courier_quote.get("min_delivery_days", 2))
    courier_minutes = min_days * 24 * 60

    return ServiceabilityCheckOut(
        is_serviceable=True,
        status=status_label,
        delivery_mode="nationwide_courier",
        delivery_type="Nationwide Courier Shipping",
        courier_partner=courier_quote.get("courier_partner", partner_name),
        courier_zone=courier_quote.get("zone", "Zone D"),
        estimated_delivery_days=courier_quote.get("estimated_days", "2–4 Business Days"),
        parcel_weight_kg=courier_quote.get("billable_weight_kg", weight_input),
        postal_code=pin,
        city=city,
        locality=locality,
        estimated_delivery_minutes=courier_minutes,
        delivery_fee=courier_fee,
        distance_km=distance_km,
        distance_source=distance_source,
        matched_slab=courier_quote.get("zone_name"),
        min_order_amount=min_order,
        free_delivery_threshold=free_courier_thresh,
        service_hub=f"Sri Adithya Organics Central Fulfillment Facility → {city} ({partner_name})",
        message=courier_quote.get("message", "Nationwide Courier Shipping Available"),
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
