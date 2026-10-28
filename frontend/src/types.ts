export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'admin';
  is_active: boolean;
  created_at: string;
}

export interface Address {
  id: number;
  user_id?: number;
  label: string; // 'Home' | 'Work' | 'Other'
  recipient_name: string;
  phone: string;
  street: string;
  apartment?: string;
  landmark?: string;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
  created_at?: string;
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

export interface ProductVariant {
  id: number;
  product_id: number;
  unit: string;
  pack_size: string;
  price: number;
  mrp: number;
  stock: number;
  sku?: string;
  is_default: boolean;
}

export interface ProductImage {
  id: number;
  image_url: string;
  alt_text?: string;
  is_primary: boolean;
  display_order: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  category_id: number;
  description: string;
  short_description?: string;
  brand: string;
  origin_farm?: string;
  certifications?: string;
  storage_instructions?: string;
  allergens?: string;
  ingredients?: string;
  is_featured: boolean;
  is_fresh_today: boolean;
  is_deal: boolean;
  is_best_seller: boolean;
  is_active: boolean;
  created_at: string;
  category?: Category;
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
  user_id: number;
  status: 'pending' | 'confirmed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';
  subtotal: number;
  discount: number;
  delivery_fee: number;
  tax: number;
  total_amount: number;
  delivery_slot: string;
  delivery_address_json: string;
  notes?: string;
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

