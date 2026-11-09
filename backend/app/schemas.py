from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime

try:
    import email_validator
    from pydantic import EmailStr
except (ImportError, Exception):
    EmailStr = str

# --- Auth & User Schemas ---
class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None

class UserOut(UserBase):
    id: int
    role: str
    is_active: bool
    is_phone_verified: Optional[bool] = False
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class TokenPayload(BaseModel):
    sub: Optional[int] = None


# --- Address Schemas ---
class AddressBase(BaseModel):
    label: str = "Home"  # Home, Work, Other
    recipient_name: str
    phone: str
    street: str
    apartment: Optional[str] = None
    house_number: Optional[str] = None
    locality: Optional[str] = None
    landmark: Optional[str] = None
    city: str = "Hyderabad"
    state: str = "Telangana"
    postal_code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy_meters: Optional[float] = None
    formatted_address: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    is_default: bool = False

class AddressCreate(AddressBase):
    pass

class AddressUpdate(BaseModel):
    label: Optional[str] = None
    recipient_name: Optional[str] = None
    phone: Optional[str] = None
    street: Optional[str] = None
    apartment: Optional[str] = None
    house_number: Optional[str] = None
    locality: Optional[str] = None
    landmark: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy_meters: Optional[float] = None
    formatted_address: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    is_default: Optional[bool] = None

class AddressOut(AddressBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Category Schemas ---
class CategoryBase(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    icon: Optional[str] = None
    display_order: int = 0
    is_active: bool = True

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    icon: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

class CategoryOut(CategoryBase):
    id: int
    product_count: Optional[int] = 0

    class Config:
        from_attributes = True


# --- Product Variant & Image Schemas ---
class VariantBase(BaseModel):
    unit: str
    pack_size: str = "Standard Pack"
    price: float
    mrp: float
    stock: int = 50
    sku: Optional[str] = None
    is_default: bool = False

class VariantCreate(VariantBase):
    pass

class VariantUpdate(BaseModel):
    unit: Optional[str] = None
    pack_size: Optional[str] = None
    price: Optional[float] = None
    mrp: Optional[float] = None
    stock: Optional[int] = None
    sku: Optional[str] = None
    is_default: Optional[bool] = None

class VariantOut(VariantBase):
    id: int
    product_id: int

    class Config:
        from_attributes = True

class ProductImageOut(BaseModel):
    id: int
    image_url: str
    alt_text: Optional[str] = None
    is_primary: bool = True
    display_order: int = 0

    class Config:
        from_attributes = True

class ProductImageCreate(BaseModel):
    image_url: str
    alt_text: Optional[str] = None
    is_primary: bool = False
    display_order: int = 0


# --- Product Schemas ---
class ProductBase(BaseModel):
    name: str
    slug: Optional[str] = None
    category_id: int
    description: str
    short_description: Optional[str] = None
    brand: str = "Sri Adithya Organics"
    origin_farm: Optional[str] = None
    certifications: Optional[str] = None
    storage_instructions: Optional[str] = None
    allergens: Optional[str] = None
    ingredients: Optional[str] = None
    is_featured: bool = False
    is_fresh_today: bool = False
    is_deal: bool = False
    is_best_seller: bool = False
    is_active: bool = True

class ProductCreate(ProductBase):
    variants: List[VariantCreate] = []
    images: List[ProductImageCreate] = []

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    brand: Optional[str] = None
    origin_farm: Optional[str] = None
    certifications: Optional[str] = None
    storage_instructions: Optional[str] = None
    allergens: Optional[str] = None
    ingredients: Optional[str] = None
    is_featured: Optional[bool] = None
    is_fresh_today: Optional[bool] = None
    is_deal: Optional[bool] = None
    is_best_seller: Optional[bool] = None
    is_active: Optional[bool] = None

class ProductOut(ProductBase):
    id: int
    created_at: datetime
    category: Optional[CategoryOut] = None
    variants: List[VariantOut] = []
    images: List[ProductImageOut] = []
    
    # Calculated convenient helper fields for the frontend
    primary_image: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    mrp: Optional[float] = None
    discount_percentage: Optional[int] = None
    in_stock: Optional[bool] = True

    class Config:
        from_attributes = True


# --- Cart Schemas ---
class CartItemAdd(BaseModel):
    product_id: int
    variant_id: int
    quantity: int = 1

class CartItemUpdate(BaseModel):
    quantity: int

class CartItemSetQuantity(BaseModel):
    product_id: int
    variant_id: int
    quantity: int

class CartItemOut(BaseModel):
    id: int
    product_id: int
    variant_id: int
    quantity: int
    product: ProductOut
    variant: VariantOut

    class Config:
        from_attributes = True

class CartOut(BaseModel):
    id: Optional[int] = None
    items: List[CartItemOut] = []
    item_count: int = 0
    subtotal: float = 0.0
    discount: float = 0.0
    delivery_fee: float = 0.0
    taxes: float = 0.0
    total_amount: float = 0.0
    free_delivery_threshold: float = 499.0
    free_delivery_progress: float = 0.0
    amount_needed_for_free_delivery: float = 0.0


# --- Order Schemas ---
class OrderItemCreate(BaseModel):
    product_id: int
    variant_id: int
    quantity: int

class OrderCreate(BaseModel):
    address_id: int
    delivery_slot: str = "Instant 15-30 Mins"
    payment_method: str = "cod"  # "cod", "upi", "card", "netbanking"
    notes: Optional[str] = None
    payment_id: Optional[str] = None
    idempotency_key: Optional[str] = None

class OrderItemOut(BaseModel):
    id: int
    product_id: int
    variant_id: int
    product_name: str
    variant_name: str
    unit_price: float
    mrp: float
    quantity: int
    total_price: float
    image_url: Optional[str] = None

    class Config:
        from_attributes = True

class OrderOut(BaseModel):
    id: int
    order_number: str
    user_id: Optional[int] = None
    status: str
    subtotal: float
    discount: float
    delivery_fee: float
    distance_km: Optional[float] = None
    tax: float
    total_amount: float
    delivery_slot: str
    delivery_address_json: str
    notes: Optional[str] = None
    admin_notes: Optional[str] = None
    payment_method: str
    payment_status: str
    payment_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None
    admin_notes: Optional[str] = None

class WhatsAppOrderItemInput(BaseModel):
    product_id: int
    variant_id: int
    quantity: int

class WhatsAppOrderCreate(BaseModel):
    customer_name: str
    customer_phone: str
    address_id: Optional[int] = None
    delivery_address: Optional[Dict[str, Any]] = None
    delivery_slot: str = "Instant 15-30 Mins"
    payment_method: str = "cod"  # "cod" or "online"
    notes: Optional[str] = None
    items: Optional[List[WhatsAppOrderItemInput]] = None
    idempotency_key: Optional[str] = None

class WhatsAppOrderResponse(BaseModel):
    order: OrderOut
    whatsapp_url: str
    whatsapp_message: str
    whatsapp_number: str


# --- Wishlist Schemas ---
class WishlistToggleRequest(BaseModel):
    product_id: int

class WishlistItemOut(BaseModel):
    id: int
    product_id: int
    created_at: datetime
    product: ProductOut

    class Config:
        from_attributes = True


# --- Delivery & Store Settings Schemas ---
class DeliverySettingOut(BaseModel):
    id: int
    min_order_amount: float
    free_delivery_threshold: float
    standard_delivery_fee: float
    express_delivery_fee: float
    active_slots_json: Optional[str] = None
    announcement_text: Optional[str] = None
    whatsapp_number: Optional[str] = "919515159006"
    store_name: Optional[str] = "Sri Aditya Organics & Oil Mill"
    store_address: Optional[str] = "Jilla Parishad Complex, Babu Camp Road, Ganeshbasthi, Opp. Babu Camp Ramalayam"
    store_city: Optional[str] = "Kothagudem"
    store_district: Optional[str] = "Bhadradri Kothagudem"
    store_state: Optional[str] = "Telangana"
    store_pincode: Optional[str] = "507101"
    store_latitude: Optional[float] = 17.5376
    store_longitude: Optional[float] = 80.6210
    store_maps_url: Optional[str] = "https://share.google/e1aO3V8FJQ7USIKzU"
    delivery_radius_km: Optional[float] = 35.0
    max_express_radius_km: Optional[float] = 15.0
    distance_slabs_json: Optional[str] = None
    courier_enabled: Optional[bool] = True
    courier_free_threshold: Optional[float] = 999.0
    courier_partners_json: Optional[str] = None
    courier_default_partner: Optional[str] = "Delhivery"
    courier_delhivery_api_key: Optional[str] = None
    courier_delhivery_client_id: Optional[str] = None
    courier_shiprocket_email: Optional[str] = None
    courier_shiprocket_token: Optional[str] = None
    courier_rates_json: Optional[str] = None
    courier_blacklisted_pins: Optional[str] = None

    class Config:
        from_attributes = True

class DeliverySettingUpdate(BaseModel):
    min_order_amount: Optional[float] = None
    free_delivery_threshold: Optional[float] = None
    standard_delivery_fee: Optional[float] = None
    express_delivery_fee: Optional[float] = None
    active_slots_json: Optional[str] = None
    announcement_text: Optional[str] = None
    whatsapp_number: Optional[str] = None
    store_name: Optional[str] = None
    store_address: Optional[str] = None
    store_city: Optional[str] = None
    store_district: Optional[str] = None
    store_state: Optional[str] = None
    store_pincode: Optional[str] = None
    store_latitude: Optional[float] = None
    store_longitude: Optional[float] = None
    store_maps_url: Optional[str] = None
    delivery_radius_km: Optional[float] = None
    max_express_radius_km: Optional[float] = None
    distance_slabs_json: Optional[str] = None
    courier_enabled: Optional[bool] = None
    courier_free_threshold: Optional[float] = None
    courier_partners_json: Optional[str] = None
    courier_default_partner: Optional[str] = None
    courier_delhivery_api_key: Optional[str] = None
    courier_delhivery_client_id: Optional[str] = None
    courier_shiprocket_email: Optional[str] = None
    courier_shiprocket_token: Optional[str] = None
    courier_rates_json: Optional[str] = None
    courier_blacklisted_pins: Optional[str] = None


# --- Admin Dashboard Stats & Operations ---
class TopProductStat(BaseModel):
    id: int
    name: str
    units_sold: int
    revenue: float
    image_url: Optional[str] = None

class DashboardStatsOut(BaseModel):
    total_revenue: float
    total_orders: int
    total_products: int
    total_customers: int
    pending_orders: int
    low_stock_products: int
    recent_orders: List[OrderOut] = []

class SalesTrendPoint(BaseModel):
    date: str
    revenue: float
    orders: int

class EnhancedDashboardStatsOut(BaseModel):
    total_revenue: float
    today_revenue: float
    filtered_revenue: float = 0.0
    total_orders: int
    today_orders: int
    filtered_orders: int = 0
    filtered_aov: float = 0.0
    total_products: int
    total_customers: int
    pending_orders: int
    delivered_orders: int
    cancelled_orders: int
    low_stock_products: int
    out_of_stock_products: int = 0
    inventory_valuation: float = 0.0
    order_status_counts: Dict[str, int] = {}
    top_products: List[TopProductStat] = []
    recent_orders: List[OrderOut] = []
    sales_trend: List[SalesTrendPoint] = []
    recent_stock_changes: List[Any] = []

class CouponBase(BaseModel):
    code: str
    description: Optional[str] = None
    discount_type: str = "percentage"  # 'percentage' or 'flat'
    discount_value: float
    min_order_amount: float = 0.0
    max_discount_amount: Optional[float] = None
    usage_limit: Optional[int] = 100
    is_active: bool = True
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None

class CouponCreate(CouponBase):
    pass

class CouponUpdate(BaseModel):
    code: Optional[str] = None
    description: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    min_order_amount: Optional[float] = None
    max_discount_amount: Optional[float] = None
    usage_limit: Optional[int] = None
    is_active: Optional[bool] = None
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None

class CouponOut(CouponBase):
    id: int
    usage_count: int = 0
    created_at: str

    class Config:
        from_attributes = True

class ReviewOut(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    customer_name: str
    rating: int
    title: Optional[str] = None
    comment: str
    is_verified_buyer: bool = True
    status: str = "approved"  # 'approved', 'pending', 'rejected'
    created_at: str

class ReviewStatusUpdate(BaseModel):
    status: str  # 'approved', 'rejected', 'pending'

class DeliveryZoneBase(BaseModel):
    pincode: str
    area_name: str
    is_active: bool = True
    delivery_fee: float = 39.0
    estimated_delivery_time: str = "15-30 Mins"

class DeliveryZoneCreate(DeliveryZoneBase):
    pass

class DeliveryZoneUpdate(BaseModel):
    pincode: Optional[str] = None
    area_name: Optional[str] = None
    is_active: Optional[bool] = None
    delivery_fee: Optional[float] = None
    estimated_delivery_time: Optional[str] = None

class DeliveryZoneOut(DeliveryZoneBase):
    id: int
    created_at: str

    class Config:
        from_attributes = True

class CategoryAnalyticsItem(BaseModel):
    category_id: int
    category_name: str
    units_sold: int
    revenue: float
    percentage_share: float

class InventoryCategoryValuation(BaseModel):
    category_id: int
    category_name: str
    sku_count: int
    total_units: int
    retail_valuation: float

class AnalyticsReportOut(BaseModel):
    period: str
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    total_revenue: float
    total_orders: int
    average_order_value: float
    total_units_sold: int
    sales_trend: List[SalesTrendPoint] = []
    category_breakdown: List[CategoryAnalyticsItem] = []
    top_selling_products: List[TopProductStat] = []
    slow_moving_products: List[Dict[str, Any]] = []
    inventory_by_category: List[InventoryCategoryValuation] = []
    repeat_customer_rate: float = 0.0

class InventoryAdjustRequest(BaseModel):
    product_id: int
    delta: Optional[int] = None
    new_stock: Optional[int] = None
    reason: str = "Manual Admin Adjustment"
    notes: Optional[str] = None

class InventoryLogOut(BaseModel):
    log_id: int
    product_id: int
    product_name: Optional[str] = None
    previous_stock: int
    changed_stock: int
    new_stock: int
    reason: str
    created_at: str

class CustomerMetricOut(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    total_orders: int = 0
    total_spend: float = 0.0
    created_at: str
    last_order_date: Optional[str] = None

class CustomerDetailOut(CustomerMetricOut):
    addresses: List[AddressOut] = []
    orders: List[OrderOut] = []

class OrderCancelRequest(BaseModel):
    reason: str = "Customer requested cancellation"



# --- Geolocation & Serviceability Schemas ---
class ReverseGeocodeRequest(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None

class ReverseGeocodeOut(BaseModel):
    formatted_address: str
    house_number: Optional[str] = None
    building: Optional[str] = None
    apartment: Optional[str] = None
    road: Optional[str] = None
    street: Optional[str] = None
    locality: str
    neighbourhood: Optional[str] = None
    landmark: Optional[str] = None
    city: str
    district: Optional[str] = None
    state: str
    postal_code: str
    country: str = "India"
    latitude: float
    longitude: float
    accuracy_meters: Optional[float] = None
    is_serviceable: bool = True
    delivery_mode: str = "local_express"  # "local_express" | "nationwide_courier" | "unserviceable"
    delivery_type: str = "Local Express Delivery"
    courier_partner: Optional[str] = None
    estimated_delivery_days: Optional[str] = None
    parcel_weight_kg: Optional[float] = None
    estimated_delivery_minutes: int = 30
    service_hub: str = "Sri Aditya Organics & Oil Mill (Kothagudem)"
    message: str = "Delivery location resolved"
    distance_km: Optional[float] = None
    delivery_fee: Optional[float] = None
    matched_slab: Optional[str] = None
    is_incomplete: bool = False
    source: str = "gps_detected"

class AddressSearchResultItem(BaseModel):
    place_id: Optional[str] = None
    formatted_address: str
    locality: str
    city: str
    district: Optional[str] = None
    state: str
    postal_code: str
    latitude: float
    longitude: float

class ServiceabilityCheckRequest(BaseModel):
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    cart_subtotal: Optional[float] = None
    cart_weight_kg: Optional[float] = None

class ServiceabilityCheckOut(BaseModel):
    is_serviceable: bool
    status: str = "Delivery Available"  # "Delivery Available", "Delivery Available with Additional Charges", "Delivery Not Available", "Address Verification Required"
    delivery_mode: str = "local_express"  # "local_express" | "nationwide_courier" | "unserviceable"
    delivery_type: str = "Local Express Delivery"
    courier_partner: Optional[str] = None
    courier_zone: Optional[str] = None
    estimated_delivery_days: Optional[str] = None
    parcel_weight_kg: Optional[float] = None
    postal_code: Optional[str] = None
    city: str
    locality: str
    estimated_delivery_minutes: int
    delivery_fee: float = 39.0
    distance_km: Optional[float] = None
    distance_source: Optional[str] = None
    matched_slab: Optional[str] = None
    min_order_amount: float
    free_delivery_threshold: float
    service_hub: str
    message: str
    store_address: Optional[str] = None
    store_maps_url: Optional[str] = "https://share.google/e1aO3V8FJQ7USIKzU"

class CourierRateTestRequest(BaseModel):
    destination_pincode: str
    weight_kg: float = 1.0
    cart_subtotal: float = 0.0

class CourierRateTestOut(BaseModel):
    is_serviceable: bool
    delivery_mode: str
    zone: str
    zone_name: str
    courier_partner: str
    pickup_pincode: str
    destination_pincode: str
    actual_weight_kg: float
    billable_weight_kg: float
    shipping_fee: float
    is_free_shipping: bool
    estimated_days: Optional[str] = None
    estimated_delivery_dates: Optional[str] = None
    message: str



