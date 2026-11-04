export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'customer';
  is_active: boolean;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AdminUser;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  unit: string;
  pack_size?: string;
  price: number;
  mrp: number;
  stock: number;
  sku?: string;
  is_default: boolean;
}

export interface ProductImage {
  id: number;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  alt_text?: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  category_id: number;
  description: string;
  short_description?: string;
  brand?: string;
  origin_farm?: string;
  certifications?: string;
  storage_instructions?: string;
  is_featured: boolean;
  is_fresh_today?: boolean;
  is_deal?: boolean;
  is_best_seller?: boolean;
  is_active: boolean;
  min_price: number;
  max_price: number;
  mrp?: number;
  discount_percentage?: number;
  in_stock: boolean;
  primary_image?: string;
  created_at: string;
  variants: ProductVariant[];
  images: ProductImage[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  icon?: string;
  display_order: number;
  is_active: boolean;
  product_count?: number;
}

export interface DeliveryAddressSnapshot {
  id?: number;
  recipient_name?: string;
  phone?: string;
  house_number?: string;
  apartment?: string;
  street: string;
  locality?: string;
  landmark?: string;
  city: string;
  state?: string;
  postal_code: string;
  latitude?: number;
  longitude?: number;
  accuracy_meters?: number;
  formatted_address?: string;
  source?: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  variant_id: number;
  product_name: string;
  variant_name?: string;
  unit_price: number;
  mrp?: number;
  quantity: number;
  total_price: number;
  image_url?: string;
}

export type OrderStatus =
  | 'pending_whatsapp'
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: number;
  order_number: string;
  customer_id?: number;
  user_id?: number;
  customer_name?: string;
  phone?: string;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  tax: number;
  total_amount: number;
  delivery_slot: string;
  delivery_address_json: string;
  notes?: string;
  admin_notes?: string;
  payment_method: string;
  payment_status: string;
  payment_id?: string;
  created_at: string;
  updated_at?: string;
  items: OrderItem[];
}

export interface TopProductStat {
  id: number;
  name: string;
  units_sold: number;
  revenue: number;
  image_url?: string;
}

export interface DashboardStats {
  total_revenue: number;
  today_revenue: number;
  total_orders: number;
  today_orders: number;
  total_products: number;
  total_customers: number;
  pending_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  low_stock_products: number;
  order_status_counts: Record<string, number>;
  top_products: TopProductStat[];
  recent_orders: Order[];
}

export interface InventoryItem {
  id: number;
  name: string;
  slug: string;
  category_id?: number;
  category_name: string;
  price: number;
  stock: number;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  unit: string;
  image_url?: string;
  is_active: boolean;
}

export interface InventoryLog {
  log_id: number;
  product_id: number;
  product_name?: string;
  previous_stock: number;
  changed_stock: number;
  new_stock: number;
  reason: string;
  created_at: string;
}

export interface CustomerMetric {
  id: number;
  name: string;
  email: string;
  phone?: string;
  total_orders: number;
  total_spend: number;
  created_at: string;
  last_order_date?: string;
}

export interface CustomerDetail extends CustomerMetric {
  addresses: DeliveryAddressSnapshot[];
  orders: Order[];
}

export interface StoreSettings {
  id?: number;
  min_order_amount: number;
  free_delivery_threshold: number;
  standard_delivery_fee: number;
  express_delivery_fee: number;
  active_slots_json?: string;
  announcement_text?: string;
  whatsapp_number?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
}

