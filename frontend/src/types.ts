export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: 'customer' | 'admin';
  is_active: boolean;
  is_phone_verified?: boolean;
  created_at: string;
}

export interface Address {
  id: number;
  user_id?: number | null;
  label: string; // 'Home' | 'Work' | 'Other'
  recipient_name: string;
  phone: string;
  street: string;
  apartment?: string | null;
  house_number?: string | null;
  locality?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  postal_code: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracy_meters?: number | null;
  formatted_address?: string | null;
  confirmed_at?: string | null;
  is_default: boolean;
  created_at?: string | null;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  icon?: string | null;
  display_order: number;
  is_active: boolean;
  product_count?: number | null;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  unit: string;
  pack_size: string;
  price: number;
  mrp: number;
  stock: number;
  sku?: string | null;
  is_default: boolean;
}

export interface ProductImage {
  id: number;
  image_url: string;
  alt_text?: string | null;
  is_primary: boolean;
  display_order: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  category_id: number;
  description: string;
  short_description?: string | null;
  brand: string;
  origin_farm?: string | null;
  certifications?: string | null;
  storage_instructions?: string | null;
  allergens?: string | null;
  ingredients?: string | null;
  is_featured: boolean;
  is_fresh_today: boolean;
  is_deal: boolean;
  is_best_seller: boolean;
  is_active: boolean;
  created_at: string;
  category?: Category | null;
  variants: ProductVariant[];
  images: ProductImage[];
  primary_image?: string;
  min_price?: number;
  max_price?: number;
  mrp?: number;
  discount_percentage?: number;
  in_stock?: boolean;
}

export interface CartItem {
  id: number;
  product_id: number;
  variant_id: number;
  quantity: number;
  product: Product;
  variant: ProductVariant;
}

export interface CartData {
  id?: number;
  items: CartItem[];
  item_count: number;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  taxes: number;
  total_amount: number;
  free_delivery_threshold: number;
  free_delivery_progress: number;
  amount_needed_for_free_delivery: number;
}

export interface OrderItem {
  id: number;
  product_id: number;
  variant_id: number;
  product_name: string;
  variant_name: string;
  unit_price: number;
  mrp: number;
  quantity: number;
  total_price: number;
  image_url?: string;
}

export interface Order {
  id: number;
  order_number: string;
  user_id?: number | null;
  status: 'pending_whatsapp' | 'pending' | 'confirmed' | 'processing' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled' | string;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  tax: number;
  total_amount: number;
  delivery_slot: string;
  delivery_address_json: string;
  notes?: string;
  admin_notes?: string | null;
  payment_method: string;
  payment_status: string;
  payment_id?: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface DeliverySetting {
  id: number;
  min_order_amount: number;
  free_delivery_threshold: number;
  standard_delivery_fee: number;
  express_delivery_fee: number;
  active_slots_json?: string;
  announcement_text?: string;
  whatsapp_number?: string;
  store_name?: string;
  store_address?: string;
  store_city?: string;
  store_district?: string;
  store_state?: string;
  store_pincode?: string;
  store_latitude?: number;
  store_longitude?: number;
  delivery_radius_km?: number;
  max_express_radius_km?: number;
}

export interface PhoneOtpResponse {
  success: boolean;
  message: string;
  phone: string;
  provider_configured: boolean;
  expires_in_seconds?: number;
  cooldown_seconds?: number;
  dev_otp?: string;
}

export interface PhoneVerifyResponse {
  success: boolean;
  message: string;
  phone: string;
  is_verified: boolean;
}

export interface WhatsAppOrderPayload {
  customer_name: string;
  customer_phone: string;
  address_id?: number;
  delivery_address?: {
    label?: string;
    recipient_name?: string;
    phone?: string;
    house_number?: string;
    street: string;
    apartment?: string;
    locality?: string;
    landmark?: string;
    city: string;
    state: string;
    postal_code: string;
    latitude?: number;
    longitude?: number;
    accuracy_meters?: number | null;
    formatted_address?: string;
  };
  delivery_slot?: string;
  payment_method?: string;
  notes?: string;
  items?: {
    product_id: number;
    variant_id: number;
    quantity: number;
  }[];
  idempotency_key?: string;
}

export interface WhatsAppOrderResponse {
  order: Order;
  whatsapp_url: string;
  whatsapp_message: string;
  whatsapp_number: string;
}

export interface DashboardStats {
  total_revenue: number;
  total_orders: number;
  total_products: number;
  total_customers: number;
  pending_orders: number;
  low_stock_products: number;
  recent_orders: Order[];
}

export interface ReverseGeocodeResult {
  formatted_address: string;
  house_number?: string | null;
  building?: string | null;
  road?: string | null;
  locality: string;
  neighbourhood?: string | null;
  landmark?: string | null;
  city: string;
  district?: string | null;
  state: string;
  postal_code: string;
  country: string;
  latitude: number;
  longitude: number;
  accuracy_meters?: number | null;
  is_serviceable: boolean;
  estimated_delivery_minutes: number;
  service_hub: string;
  message: string;
  is_incomplete?: boolean;
  source?: string;
}

export interface AddressSearchResult {
  place_id?: string;
  formatted_address: string;
  locality: string;
  city: string;
  state: string;
  postal_code: string;
  latitude: number;
  longitude: number;
}

