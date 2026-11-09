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
  category?: string;
  price?: number;
  stock?: number;
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
  filtered_revenue?: number;
  total_orders: number;
  today_orders: number;
  filtered_orders?: number;
  filtered_aov?: number;
  total_products: number;
  total_customers: number;
  pending_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  low_stock_products: number;
  out_of_stock_products?: number;
  inventory_valuation?: number;
  order_status_counts: Record<string, number>;
  top_products: TopProductStat[];
  recent_orders: Order[];
  sales_trend?: { date: string; revenue: number; orders: number }[];
  recent_stock_changes?: InventoryLog[];
}

export interface Coupon {
  id: number;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number;
  usage_limit?: number;
  usage_count: number;
  times_used?: number;
  is_active: boolean;
  valid_from?: string;
  valid_until?: string;
  created_at: string;
}

export interface Review {
  id: number;
  product_id: number;
  product_name?: string;
  customer_name: string;
  rating: number;
  title?: string;
  comment: string;
  is_verified_buyer: boolean;
  verified_purchase?: boolean;
  status: 'approved' | 'pending' | 'rejected';
  created_at: string;
}

export interface DeliveryZone {
  id: number;
  pincode: string;
  pincodes?: string;
  area_name: string;
  name?: string;
  is_active: boolean;
  delivery_fee: number;
  extra_delivery_fee?: number;
  estimated_delivery_time: string;
  estimated_time?: string;
  created_at?: string;
}

export interface CategoryAnalyticsItem {
  category_id: number;
  category_name: string;
  units_sold: number;
  revenue: number;
  percentage_share: number;
}

export interface InventoryCategoryValuation {
  category_id: number;
  category_name: string;
  sku_count: number;
  total_units: number;
  retail_valuation: number;
}

export interface AnalyticsReport {
  period: string;
  date_from?: string;
  date_to?: string;
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  total_units_sold: number;
  sales_trend: { date: string; revenue: number; orders: number }[];
  category_breakdown: CategoryAnalyticsItem[];
  top_selling_products: TopProductStat[];
  slow_moving_products: { id: number; name: string; category_name: string; stock: number; price: number }[];
  inventory_by_category: InventoryCategoryValuation[];
  repeat_customer_rate: number;
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

// --- Multi-Model AI Administration System Types ---

export interface AIProviderConfig {
  id: number;
  provider?: string;
  provider_name: 'cloudflare' | 'groq' | 'gemini' | string;
  display_name?: string;
  model_name: string;
  is_enabled: boolean | number;
  is_active?: boolean;
  priority: number;
  is_fallback?: boolean;
  is_currently_active_fallback?: boolean;
  status?: 'Active' | 'Available' | 'Rate Limited' | 'Quota Exhausted' | 'Temporarily Unavailable' | 'Configuration Required' | 'Unknown' | 'Disabled' | string;
  daily_request_limit: number;
  daily_limit?: number;
  remaining_requests?: number;
  daily_quota_limit?: number;
  daily_token_limit: number;
  requests_today: number;
  tokens_today: number;
  total_requests?: number;
  consecutive_errors: number;
  circuit_breaker_open?: boolean;
  cooldown_until?: string | null;
  last_success_at?: string | null;
  last_error_at?: string | null;
  last_error_message?: string | null;
  has_credentials?: boolean;
  provider_type?: string;
  provider_quota_info?: string;
  rate_limit_status?: string;
  updated_at?: string;
}

export interface AIProductRecognitionResponse {
  product_name: string;
  product_type: string;
  suggested_unit: string;
  suggested_units: string[];
  suggested_packaging: string;
  veg_classification?: string;
  storage_instructions: string;
  shelf_life?: string;
  suggested_brand?: string;
  suggested_certifications?: string;
  short_description: string;
  detailed_description: string;
  highlights: string[];
  seo_title: string;
  meta_description: string;
  keywords: string[];
  category_matched: boolean;
  matched_category?: Category | { id: number; name: string; slug: string } | null;
  suggested_category_name?: string;
  suggested_category_slug?: string;
  source?: string;
}

export interface AIUsageLog {
  id: number;
  provider: string;
  model: string;
  task_type: string;
  tokens_prompt: number;
  prompt_tokens?: number;
  tokens_completion: number;
  completion_tokens?: number;
  latency_ms: number;
  status: 'success' | 'timeout' | 'rate_limit' | 'error' | string;
  error_message?: string;
  admin_id?: number;
  created_at: string;
}

export interface AITitleResponse {
  primary_title: string;
  short_title: string;
  seo_title: string;
  alternatives: string[];
  traditional_name?: string;
  regional_telugu_name?: string;
  provider?: string;
  model?: string;
}

export interface AIDescriptionResponse {
  short_description: string;
  detailed_description: string;
  highlights: string[];
  usage_instructions?: string;
  storage_instructions?: string;
  packaging_details?: string;
  faqs?: { question: string; answer: string }[];
  provider?: string;
  model?: string;
}

export interface AISEOResponse {
  meta_title: string;
  meta_description: string;
  keywords: string[];
  tags?: string[];
  slug?: string;
  slug_suggestion?: string;
  provider?: string;
  model?: string;
}

export interface AITransformResponse {
  transformed_text: string;
  mode: string;
  notes?: string;
  provider?: string;
  model?: string;
}

export interface AIPromotion {
  id: number;
  title: string;
  promo_type?: string;
  product_id?: number;
  category_id?: number;
  original_price: number;
  discounted_price?: number;
  final_price?: number;
  discount_percent?: number;
  calculated_margin?: number;
  calculated_margin_percent?: number;
  was_margin_adjusted?: boolean;
  min_order_value?: number;
  reasoning?: string;
  description?: string;
  suggested_code?: string;
  coupon_code?: string;
  status: 'draft' | 'active' | 'paused' | 'expired' | 'rejected' | string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  provider?: string;
}

export interface AIActionApproval {
  id: number;
  action_type: 'stock_adjustment' | 'price_update' | string;
  target_id?: number;
  entity_id?: string | number;
  title?: string;
  summary?: string;
  reason?: string;
  current_value?: any;
  proposed_value?: any;
  payload_json?: string;
  preview_diff_json?: string;
  preview_diff?: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | string;
  idempotency_key: string;
  created_at: string;
  executed_at?: string;
}

export interface AIBulkDraftItem {
  id?: number;
  product_id: string;
  title: string;
  short_description: string;
  detailed_description?: string;
  highlights?: string[];
  category?: string;
  model?: string;
  provider?: string;
  status?: 'draft' | 'applied';
}


