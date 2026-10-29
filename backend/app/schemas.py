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
    landmark: Optional[str] = None
    city: str = "Bengaluru"
    state: str = "Karnataka"
    postal_code: str
    is_default: bool = False

class AddressCreate(AddressBase):
    pass

class AddressUpdate(BaseModel):
    label: Optional[str] = None
    recipient_name: Optional[str] = None
    phone: Optional[str] = None
    street: Optional[str] = None
    apartment: Optional[str] = None
    landmark: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
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
    slug: str
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
    is_primary: bool
    display_order: int

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
    slug: str
    category_id: int
    description: str
    short_description: Optional[str] = None
    brand: str = "Rootly Organics"
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
    # For instant test payment verification
    payment_id: Optional[str] = None

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
    user_id: int
    status: str
    subtotal: float
    discount: float
    delivery_fee: float
    tax: float
    total_amount: float
    delivery_slot: str
    delivery_address_json: str
    notes: Optional[str] = None
    payment_method: str
    payment_status: str
    payment_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: str
    payment_status: Optional[str] = None


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

    class Config:
        from_attributes = True

class DeliverySettingUpdate(BaseModel):
    min_order_amount: Optional[float] = None
    free_delivery_threshold: Optional[float] = None
    standard_delivery_fee: Optional[float] = None
    express_delivery_fee: Optional[float] = None
    active_slots_json: Optional[str] = None
    announcement_text: Optional[str] = None


# --- Admin Dashboard Stats ---
class DashboardStatsOut(BaseModel):
    total_revenue: float
    total_orders: int
    total_products: int
    total_customers: int
    pending_orders: int
    low_stock_products: int
    recent_orders: List[OrderOut] = []


# --- Geolocation & Serviceability Schemas ---
class ReverseGeocodeRequest(BaseModel):
    latitude: float
    longitude: float

class ReverseGeocodeOut(BaseModel):
    formatted_address: str
    locality: str
    city: str
    state: str
    postal_code: str
    country: str = "India"
    is_serviceable: bool
    estimated_delivery_minutes: int
    service_hub: str
    message: str

class ServiceabilityCheckRequest(BaseModel):
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ServiceabilityCheckOut(BaseModel):
    is_serviceable: bool
    postal_code: Optional[str] = None
    city: str
    locality: str
    estimated_delivery_minutes: int
    min_order_amount: float
    free_delivery_threshold: float
    service_hub: str
    message: str


