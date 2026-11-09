import {
  AuthResponse,
  DashboardStats,
  Order,
  OrderStatus,
  Product,
  Category,
  InventoryItem,
  InventoryLog,
  CustomerMetric,
  CustomerDetail,
  StoreSettings,
  CourierRateTestResult,
  Coupon,
  Review,
  DeliveryZone,
  AnalyticsReport,
  AIProviderConfig,
  AIUsageLog,
  AITitleResponse,
  AIDescriptionResponse,
  AISEOResponse,
  AITransformResponse,
  AIPromotion,
  AIActionApproval,
  AIProductRecognitionResponse
} from '../types';

const RAW_API_URL = (import.meta.env.VITE_API_URL || 'https://sriadithyaorganics.devraj951515.workers.dev').trim();
export const API_BASE = RAW_API_URL.replace(/\/+$/, '');

class ApiClient {
  private tokenKey = 'sri_adithya_admin_token';
  private userKey = 'sri_adithya_admin_user';

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setSession(token: string, user: any): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  getUser(): any | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const token = this.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      // Unauthorized: clear token and redirect to login if not already on login
      this.clearSession();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      throw new Error('Your session has expired. Please log in again.');
    }

    if (!res.ok) {
      let errorMsg = `Server error (${res.status})`;
      try {
        const errorData = await res.json();
        if (typeof errorData.detail === 'string') {
          errorMsg = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMsg = errorData.detail
            .map((d: any) => {
              const field = d.loc ? d.loc.filter((l: any) => l !== 'body').join('.') : 'field';
              return `${field}: ${d.msg}`;
            })
            .join('; ');
        } else if (errorData.message && typeof errorData.message === 'string') {
          errorMsg = errorData.message;
        } else if (errorData.detail && typeof errorData.detail === 'object') {
          errorMsg = JSON.stringify(errorData.detail);
        }
      } catch {
        // Non-JSON error
      }
      throw new Error(errorMsg);
    }

    if (res.status === 204) {
      return null as any;
    }

    return (await res.json()) as T;
  }

  // --- Auth ---
  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password }),
    });

    if (data.user.role !== 'admin') {
      throw new Error('Access restricted: Administrator role required.');
    }

    this.setSession(data.access_token, data.user);
    return data;
  }

  // --- Health & Diagnostic ---
  async getHealth(): Promise<{ status: string; database?: { connected: boolean; type: string; products_count?: number } }> {
    return this.request<{ status: string; database?: { connected: boolean; type: string; products_count?: number } }>('/health');
  }

  // --- Dashboard Overview ---
  async getDashboardStats(params?: {
    period?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<DashboardStats> {
    const q = new URLSearchParams();
    if (params?.period) q.append('period', params.period);
    if (params?.date_from) q.append('date_from', params.date_from);
    if (params?.date_to) q.append('date_to', params.date_to);
    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return this.request<DashboardStats>(`/admin/dashboard-stats${queryStr}`);
  }

  // --- Analytics & Reports ---
  async getAnalytics(params?: {
    period?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<AnalyticsReport> {
    const q = new URLSearchParams();
    if (params?.period) q.append('period', params.period);
    if (params?.date_from) q.append('date_from', params.date_from);
    if (params?.date_to) q.append('date_to', params.date_to);
    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return this.request<AnalyticsReport>(`/admin/analytics${queryStr}`);
  }

  // --- Orders ---
  async getAllOrders(params?: {
    status_filter?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Order[]> {
    const q = new URLSearchParams();
    if (params?.status_filter && params.status_filter !== 'all') {
      q.append('status_filter', params.status_filter);
    }
    if (params?.date_from) q.append('date_from', params.date_from);
    if (params?.date_to) q.append('date_to', params.date_to);
    if (params?.search && params.search.trim()) q.append('search', params.search.trim());
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.offset !== undefined) q.append('offset', String(params.offset));

    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return this.request<Order[]>(`/orders/admin/all${queryStr}`);
  }

  async getOrder(id: string | number): Promise<Order> {
    return this.request<Order>(`/orders/${id}`);
  }

  async updateOrderStatus(
    orderId: string | number,
    status: OrderStatus,
    adminNotes?: string
  ): Promise<Order> {
    return this.request<Order>(`/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, admin_notes: adminNotes }),
    });
  }

  async cancelOrder(orderId: string | number, reason: string): Promise<Order> {
    return this.request<Order>(`/admin/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // --- Products ---
  async getProducts(params?: {
    category_id?: number;
    search?: string;
    in_stock_only?: boolean;
    limit?: number;
  }): Promise<Product[]> {
    const q = new URLSearchParams();
    if (params?.category_id) q.append('category_id', String(params.category_id));
    if (params?.search) q.append('search', params.search);
    if (params?.in_stock_only) q.append('in_stock_only', 'true');
    if (params?.limit) q.append('limit', String(params.limit));

    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return this.request<Product[]>(`/products${queryStr}`);
  }

  async createProduct(payload: any): Promise<Product> {
    return this.request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateProduct(id: number, payload: any): Promise<Product> {
    return this.request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteProduct(id: number): Promise<void> {
    return this.request<void>(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  async updateVariant(productId: number, variantId: number, payload: any): Promise<Product> {
    return this.request<Product>(`/products/${productId}/variants/${variantId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async createVariant(productId: number, payload: any): Promise<Product> {
    return this.request<Product>(`/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteVariant(productId: number, variantId: number): Promise<void> {
    return this.request<void>(`/products/${productId}/variants/${variantId}`, {
      method: 'DELETE',
    });
  }

  // --- Categories ---
  async getCategories(): Promise<Category[]> {
    return this.request<Category[]>('/categories');
  }

  async createCategory(payload: {
    name: string;
    slug?: string;
    description?: string;
    image_url?: string;
    is_active?: boolean;
  }): Promise<Category> {
    return this.request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateCategory(id: number, payload: Partial<Category>): Promise<Category> {
    return this.request<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteCategory(id: number): Promise<void> {
    return this.request<void>(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Inventory ---
  async getInventory(params?: {
    search?: string;
    category_id?: number;
    low_stock_only?: boolean;
  }): Promise<InventoryItem[]> {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.category_id) q.append('category_id', String(params.category_id));
    if (params?.low_stock_only) q.append('low_stock_only', 'true');

    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return this.request<InventoryItem[]>(`/admin/inventory${queryStr}`);
  }

  async adjustInventory(payload: {
    product_id: number;
    delta?: number;
    new_stock?: number;
    reason: string;
    notes?: string;
  }): Promise<any> {
    return this.request<any>('/admin/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getInventoryLogs(limit = 50, offset = 0): Promise<InventoryLog[]> {
    return this.request<InventoryLog[]>(`/admin/inventory/logs?limit=${limit}&offset=${offset}`);
  }

  // --- Customers ---
  async getCustomers(search?: string): Promise<CustomerMetric[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<CustomerMetric[]>(`/admin/customers${query}`);
  }

  async getCustomerDetail(id: number): Promise<CustomerDetail> {
    return this.request<CustomerDetail>(`/admin/customers/${id}`);
  }

  // --- Store Settings ---
  async getSettings(): Promise<StoreSettings> {
    return this.request<StoreSettings>('/settings');
  }

  async updateSettings(payload: Partial<StoreSettings>): Promise<StoreSettings> {
    return this.request<StoreSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async testCourierRate(payload: {
    destination_pincode: string;
    weight_kg?: number;
    length_cm?: number;
    width_cm?: number;
    height_cm?: number;
    cart_subtotal?: number;
  }): Promise<CourierRateTestResult> {
    return this.request<CourierRateTestResult>('/settings/test-courier-rate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Discounts & Coupons ---
  async getCoupons(): Promise<Coupon[]> {
    return this.request<Coupon[]>('/admin/coupons');
  }

  async createCoupon(payload: Partial<Coupon>): Promise<Coupon> {
    return this.request<Coupon>('/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateCoupon(id: number, payload: Partial<Coupon>): Promise<Coupon> {
    return this.request<Coupon>(`/admin/coupons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteCoupon(id: number): Promise<void> {
    return this.request<void>(`/admin/coupons/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Reviews Moderation ---
  async getReviews(statusFilter?: string): Promise<Review[]> {
    const q = statusFilter && statusFilter !== 'all' ? `?status_filter=${statusFilter}` : '';
    return this.request<Review[]>(`/admin/reviews${q}`);
  }

  async updateReviewStatus(id: number, status: 'approved' | 'rejected' | 'pending'): Promise<Review> {
    return this.request<Review>(`/admin/reviews/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async deleteReview(id: number): Promise<void> {
    return this.request<void>(`/admin/reviews/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Delivery Zones ---
  async getDeliveryZones(): Promise<DeliveryZone[]> {
    return this.request<DeliveryZone[]>('/admin/delivery-zones');
  }

  async createDeliveryZone(payload: Partial<DeliveryZone>): Promise<DeliveryZone> {
    return this.request<DeliveryZone>('/admin/delivery-zones', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateDeliveryZone(id: number, payload: Partial<DeliveryZone>): Promise<DeliveryZone> {
    return this.request<DeliveryZone>(`/admin/delivery-zones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteDeliveryZone(id: number): Promise<void> {
    return this.request<void>(`/admin/delivery-zones/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Admin Profile & Security ---
  async updateProfile(payload: { name?: string; phone?: string; password?: string }): Promise<any> {
    return this.request<any>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // --- Production Multi-Model AI Administration System ---

  async getAIProviders(): Promise<AIProviderConfig[]> {
    return this.request<AIProviderConfig[]>('/ai/providers');
  }

  async toggleAIProvider(name: string): Promise<{ provider: string; is_enabled: boolean }> {
    return this.request<{ provider: string; is_enabled: boolean }>(`/ai/providers/${name}/toggle`, {
      method: 'POST',
    });
  }

  async getAIUsageLogs(limit = 50): Promise<AIUsageLog[]> {
    return this.request<AIUsageLog[]>(`/ai/usage?limit=${limit}`);
  }

  async generateAITitle(payload: { product_name: string; category_name: string; unit?: string }): Promise<AITitleResponse> {
    return this.request<AITitleResponse>('/ai/content/title', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async generateAIDescription(payload: {
    product_name: string;
    category_name: string;
    features?: string;
    verified_ingredients?: string;
    verified_storage?: string;
  }): Promise<AIDescriptionResponse> {
    return this.request<AIDescriptionResponse>('/ai/content/description', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async generateAISEO(payload: {
    product_name: string;
    category_name: string;
    description_summary: string;
  }): Promise<AISEOResponse> {
    return this.request<AISEOResponse>('/ai/content/seo', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async transformAIContent(payload: {
    content: string;
    mode: 'rewrite' | 'grammar' | 'concise' | 'expand' | 'telugu' | 'bilingual';
    product_name?: string;
  }): Promise<AITransformResponse> {
    return this.request<AITransformResponse>('/ai/content/transform', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async generateBulkAIContent(productIds: number[]): Promise<any[]> {
    return this.request<any[]>('/ai/content/bulk', {
      method: 'POST',
      body: JSON.stringify({ product_ids: productIds }),
    });
  }

  async applyAIContentDraft(draftId: number): Promise<any> {
    return this.request<any>(`/ai/content/apply/${draftId}`, {
      method: 'POST',
    });
  }

  async recommendAIPromotion(payload: {
    product_id?: number;
    category_id?: number;
    campaign_goal?: string;
    min_margin_percent?: number;
  }): Promise<any> {
    return this.request<any>('/ai/promotions/recommend', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getAIPromotions(): Promise<AIPromotion[]> {
    return this.request<AIPromotion[]>('/ai/promotions');
  }

  async approveAIPromotion(id: number): Promise<any> {
    return this.request<any>(`/ai/promotions/approve/${id}`, {
      method: 'POST',
    });
  }

  async askAIAssistant(question: string, conversation_history?: any[]): Promise<{
    answer: string;
    tool_used: string;
    verified_data: any;
    provider: string;
    model: string;
  }> {
    return this.request<any>('/ai/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ question, conversation_history }),
    });
  }

  async suggestPricingOffers(payload: {
    product_name: string;
    selling_price: number;
    mrp?: number;
    cost_price?: number;
    min_margin_percent?: number;
  }): Promise<{
    product_name: string;
    selling_price: number;
    mrp: number;
    cost_price: number;
    min_margin_percent: number;
    offers: Array<{
      id: string;
      name: string;
      badge: string;
      original_price: number;
      mrp: number;
      offer_price: number;
      discount_amount: number;
      discount_percent: number;
      cost_price: number;
      gross_margin_percent: number;
      is_margin_safe: boolean;
      rationale: string;
    }>;
  }> {
    return this.request<any>('/ai/pricing/suggest-offers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async validateAndImportImageUrl(image_url: string): Promise<{
    valid: boolean;
    image_url: string;
    content_type: string;
    size_kb: number;
    message: string;
  }> {
    return this.request<any>('/ai/images/validate-import', {
      method: 'POST',
      body: JSON.stringify({ image_url }),
    });
  }

  async searchUnsplashImages(query: string, category?: string, limit: number = 12): Promise<{
    query: string;
    category?: string;
    count: number;
    results: Array<{
      id: string;
      title: string;
      category: string;
      image_url: string;
      thumbnail_url: string;
      banner_url: string;
      tags: string[];
      alt_text: string;
    }>;
  }> {
    return this.request<any>('/ai/images/unsplash-suggestions', {
      method: 'POST',
      body: JSON.stringify({ query, category, limit }),
    });
  }

  async suggestCategoryDetails(category_name: string): Promise<{
    description: string;
    short_summary: string;
    slug: string;
    seo_title: string;
    seo_description: string;
    keywords: string[];
    provider?: string;
    model?: string;
  }> {
    return this.request<any>('/ai/categories/suggest', {
      method: 'POST',
      body: JSON.stringify({ category_name }),
    });
  }

  async getSystemOverview(): Promise<any> {
    return this.request<any>('/ai/assistant/system-overview');
  }

  async getAIPendingApprovals(): Promise<AIActionApproval[]> {
    return this.request<AIActionApproval[]>('/ai/approvals');
  }

  async proposeAIStockAdjustment(payload: {
    product_id: number;
    variant_id?: number;
    delta: number;
    reason?: string;
  }): Promise<any> {
    return this.request<any>('/ai/approvals/propose/stock', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async proposeAIPriceUpdate(payload: {
    product_id: number;
    variant_id?: number;
    new_price: number;
    reason?: string;
  }): Promise<any> {
    return this.request<any>('/ai/approvals/propose/price', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async resolveAIApproval(id: number, approved: boolean): Promise<any> {
    return this.request<any>(`/ai/approvals/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ approved }),
    });
  }

  async recognizeProduct(productName: string, existingCategories?: any[]): Promise<AIProductRecognitionResponse> {
    return this.request<AIProductRecognitionResponse>('/ai/products/recognize', {
      method: 'POST',
      body: JSON.stringify({
        product_name: productName,
        existing_categories: existingCategories,
      }),
    });
  }
}

export const api = new ApiClient();

export const aiApi = {
  getProviders: () => api.getAIProviders(),
  recognizeProduct: (productName: string, existingCategories?: any[]) =>
    api.recognizeProduct(productName, existingCategories),
  updateProviderConfig: (name: string, _data?: any) => api.toggleAIProvider(name),
  getUsageLogs: (limit = 50) => api.getAIUsageLogs(limit),
  testProviders: async () => {
    const provs = await api.getAIProviders();
    return {
      results: provs.map(p => ({
        provider: p.provider_name || p.provider,
        status: p.is_enabled ? 'ok' : 'disabled',
        latency_ms: p.last_success_at ? 120 : 0
      }))
    };
  },

  generateTitle: (payload: { product_name: string; category?: string; tone?: string }) =>
    api.generateAITitle({ product_name: payload.product_name, category_name: payload.category || 'Wood-Pressed Oils' }),

  generateDescription: (payload: { product_name: string; category?: string; key_features?: string[]; tone?: string }) =>
    api.generateAIDescription({
      product_name: payload.product_name,
      category_name: payload.category || 'Wood-Pressed Oils',
      features: payload.key_features ? payload.key_features.join(', ') : undefined
    }),

  generateSEO: (payload: { product_name: string; category?: string }) =>
    api.generateAISEO({
      product_name: payload.product_name,
      category_name: payload.category || 'Wood-Pressed Oils',
      description_summary: payload.product_name
    }),

  transformContent: (payload: { text: string; mode: any; target_language?: string }) =>
    api.transformAIContent({
      content: payload.text,
      mode: payload.mode
    }),

  applyContentToProduct: (payload: { product_id: string | number; name?: string; description?: string; meta_title?: string; meta_description?: string; keywords?: string }) =>
    api.request<any>(`/products/${payload.product_id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  generateBulkContent: async (payload: { product_ids: (string | number)[]; tone?: string }) => {
    const drafts = await api.generateBulkAIContent(payload.product_ids.map(Number));
    return { drafts };
  },

  generatePromotion: (payload: { product_id?: string | number; goal?: string; min_margin_percent?: number; target_audience?: string }) =>
    api.recommendAIPromotion({
      product_id: payload.product_id ? Number(payload.product_id) : undefined,
      campaign_goal: payload.goal,
      min_margin_percent: payload.min_margin_percent
    }),

  getPromotions: () => api.getAIPromotions(),

  publishPromotion: (id: string | number) => api.approveAIPromotion(Number(id)),

  assistantChat: async (payload: { message: string; conversation_history?: any[]; auto_tool?: boolean }) => {
    const res = await api.askAIAssistant(payload.message, payload.conversation_history);
    return {
      reply: res.answer,
      tool_executed: res.tool_used,
      tool_data: res.verified_data,
      provider: res.provider,
      model: res.model,
      cached: (res as any).cached
    };
  },

  suggestOffers: (payload: {
    product_name: string;
    selling_price: number;
    mrp?: number;
    cost_price?: number;
    min_margin_percent?: number;
  }) => api.suggestPricingOffers(payload),

  validateImageUrl: (imageUrl: string) => api.validateAndImportImageUrl(imageUrl),

  suggestCategory: (categoryName: string) => api.suggestCategoryDetails(categoryName),

  searchUnsplash: (query: string, category?: string, limit: number = 12) =>
    api.searchUnsplashImages(query, category, limit),

  getSystemOverview: () => api.getSystemOverview(),

  getApprovals: (_status?: string) => api.getAIPendingApprovals(),

  proposeApproval: (payload: { action_type: string; target_entity: string; entity_id: string | number; current_value: any; proposed_value: any; reason: string }) => {
    if (payload.action_type === 'price_change') {
      const price = typeof payload.proposed_value === 'object' ? payload.proposed_value.price : Number(payload.proposed_value);
      return api.proposeAIPriceUpdate({
        product_id: Number(payload.entity_id),
        new_price: price,
        reason: payload.reason
      });
    } else {
      const stock = typeof payload.proposed_value === 'object' ? payload.proposed_value.stock : Number(payload.proposed_value);
      return api.proposeAIStockAdjustment({
        product_id: Number(payload.entity_id),
        delta: stock,
        reason: payload.reason
      });
    }
  },

  executeApproval: (id: string | number, decision: 'approve' | 'reject') =>
    api.resolveAIApproval(Number(id), decision === 'approve')
};

