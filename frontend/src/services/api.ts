import {
  User, Address, Category, Product, CartData, Order, DeliverySetting, DashboardStats,
  WhatsAppOrderPayload, WhatsAppOrderResponse
} from '../types';

const getApiBase = (): string => {
  const envUrl = ((import.meta as any).env?.VITE_API_URL as string)?.trim();
  if (envUrl) {
    return `${envUrl.replace(/\/$/, '')}/api`;
  }
  // In local development in browser, use relative /api (proxied by Vite)
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return '/api';
  }
  // In production, default to deployed Render backend URL
  return 'https://clientproject01-tc3z.onrender.com/api';
};
export const API_BASE = getApiBase();

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const apiCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 60_000; // 60 seconds SWR window

export function invalidateApiCache(filter?: string) {
  if (!filter) {
    apiCache.clear();
  } else {
    for (const key of apiCache.keys()) {
      if (key.includes(filter)) {
        apiCache.delete(key);
      }
    }
  }
}

// Helper to generate or get session ID for guest carts
export function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem('sri_adithya_session_id') || localStorage.getItem('rootly_session_id');
  if (!sessionId) {
    sessionId = 'guest_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
    localStorage.setItem('sri_adithya_session_id', sessionId);
  }
  return sessionId;
}

export function getAuthToken(): string | null {
  return localStorage.getItem('sri_adithya_token') || localStorage.getItem('rootly_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('sri_adithya_token', token);
  } else {
    localStorage.removeItem('sri_adithya_token');
    localStorage.removeItem('rootly_token');
  }
}

export function prewarmBackend(): void {
  try {
    const rootUrl = API_BASE.replace(/\/api$/, '');
    fetch(`${rootUrl}/health/live`, { method: 'GET' }).catch(() => {});
  } catch {}
}

async function request<T>(endpoint: string, options: RequestInit = {}, useCache = false): Promise<T> {
  const isGet = !options.method || options.method.toUpperCase() === 'GET';

  if (isGet && useCache) {
    const cached = apiCache.get(endpoint);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data;
    }
  }

  // Invalidate related cache entries on mutation requests
  if (!isGet) {
    if (endpoint.startsWith('/cart')) invalidateApiCache('/cart');
    if (endpoint.startsWith('/products')) invalidateApiCache('/products');
    if (endpoint.startsWith('/categories')) invalidateApiCache('/categories');
    if (endpoint.startsWith('/settings')) invalidateApiCache('/settings');
    if (endpoint.startsWith('/orders')) invalidateApiCache('/orders');
  }

  const token = getAuthToken();
  const sessionId = getOrCreateSessionId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Session-ID': sessionId,
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const maxRetries = isGet ? 2 : 1;
  let lastError: any = null;
  let response: Response | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      // If Render free tier is in the middle of waking up (502/503/504)
      if ((response.status === 502 || response.status === 503 || response.status === 504) && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      break;
    } catch (fetchErr: any) {
      lastError = fetchErr;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      if (fetchErr.name === 'TypeError' || fetchErr.message?.includes('fetch')) {
        throw new Error(
          'Unable to connect to Sri Adithya Organics backend server. The cloud service may be waking up from sleep mode (takes ~30s on Render free tier). Please try again in a few seconds.'
        );
      }
      throw fetchErr;
    }
  }

  if (!response) {
    throw lastError || new Error('Unable to connect to server.');
  }

  if (!response.ok) {
    let errorMsg = 'An error occurred. Please try again.';
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMsg = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
      }
    } catch {
      errorMsg = response.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json();
  if (isGet && useCache) {
    apiCache.set(endpoint, { data, timestamp: Date.now() });
  }
  return data;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(name: string, email: string, password: string, phone?: string): Promise<{ access_token: string; user: User }> {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone }),
    });
  },

  async getMe(): Promise<User> {
    return request('/auth/me');
  },

  async updateProfile(data: { name?: string; phone?: string; password?: string }): Promise<User> {
    return request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    return request<Category[]>('/categories', {}, true);
  },

  async getCategory(slug: string): Promise<Category> {
    return request<Category>(`/categories/${slug}`, {}, true);
  },

  async createCategory(data: Partial<Category>): Promise<Category> {
    return request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCategory(id: number, data: Partial<Category>): Promise<Category> {
    return request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteCategory(id: number): Promise<void> {
    return request(`/categories/${id}`, {
      method: 'DELETE',
    });
  },

  // Products
  async getProducts(params: {
    category_id?: number;
    category_slug?: string;
    collection?: string;
    search?: string;
    min_price?: number;
    max_price?: number;
    in_stock_only?: boolean;
    sort?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Product[]> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    const qs = query.toString();
    const endpoint = `/products${qs ? `?${qs}` : ''}`;
    return request<Product[]>(endpoint, {}, true);
  },

  async getProduct(idOrSlug: string | number): Promise<Product> {
    return request<Product>(`/products/${idOrSlug}`, {}, true);
  },

  async getRelatedProducts(idOrSlug: string | number, limit = 4): Promise<Product[]> {
    return request<Product[]>(`/products/${idOrSlug}/related?limit=${limit}`, {}, true);
  },

  async getSearchSuggestions(query: string): Promise<{ products: { name: string; slug: string }[]; categories: { name: string; slug: string }[] }> {
    if (!query.trim()) return { products: [], categories: [] };
    return request(`/products/search-suggestions?q=${encodeURIComponent(query)}`);
  },

  async createProduct(data: any): Promise<Product> {
    return request('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateProduct(id: number, data: any): Promise<Product> {
    return request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteProduct(id: number): Promise<void> {
    return request(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  async updateVariant(productId: number, variantId: number, data: any): Promise<any> {
    return request(`/products/${productId}/variants/${variantId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Cart
  async getCart(): Promise<CartData> {
    return request('/cart');
  },

  async addToCart(productId: number, variantId: number, quantity = 1): Promise<CartData> {
    return request('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, variant_id: variantId, quantity }),
    });
  },

  async updateCartItem(itemId: number, quantity: number): Promise<CartData> {
    return request(`/cart/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  },

  async removeCartItem(itemId: number): Promise<CartData> {
    return request(`/cart/items/${itemId}`, {
      method: 'DELETE',
    });
  },

  async clearCart(): Promise<CartData> {
    return request('/cart/clear', {
      method: 'POST',
    });
  },

  // Addresses
  async getAddresses(): Promise<Address[]> {
    return request('/addresses');
  },

  async createAddress(data: Omit<Address, 'id'>): Promise<Address> {
    return request('/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateAddress(id: number, data: Partial<Address>): Promise<Address> {
    return request(`/addresses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteAddress(id: number): Promise<void> {
    return request(`/addresses/${id}`, {
      method: 'DELETE',
    });
  },

  async setDefaultAddress(id: number): Promise<Address> {
    return request(`/addresses/${id}/set-default`, {
      method: 'PUT',
    });
  },

  // Orders
  async checkout(orderData: {
    address_id: number;
    delivery_slot: string;
    payment_method: string;
    notes?: string;
    payment_id?: string;
  }): Promise<Order> {
    return request('/orders/checkout', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  async createWhatsAppOrder(payload: WhatsAppOrderPayload): Promise<WhatsAppOrderResponse> {
    return request('/orders/whatsapp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getOrders(): Promise<Order[]> {
    return request('/orders');
  },

  async getOrder(id: number): Promise<Order> {
    return request(`/orders/${id}`);
  },

  async getAllOrdersAdmin(statusFilter?: string, dateFrom?: string, dateTo?: string): Promise<Order[]> {
    const params = new URLSearchParams();
    if (statusFilter) params.append('status_filter', statusFilter);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/orders/admin/all${query}`);
  },

  async updateOrderStatus(
    orderId: number,
    status?: string,
    paymentStatus?: string,
    adminNotes?: string
  ): Promise<Order> {
    return request(`/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({
        status: status || undefined,
        payment_status: paymentStatus || undefined,
        admin_notes: adminNotes !== undefined ? adminNotes : undefined,
      }),
    });
  },

  // Wishlist
  async getWishlist(): Promise<any[]> {
    return request('/wishlist');
  },

  async toggleWishlist(productId: number): Promise<{ in_wishlist: boolean; message: string }> {
    return request('/wishlist/toggle', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId }),
    });
  },

  // Settings
  async getSettings(): Promise<DeliverySetting> {
    try {
      return await request('/settings', {}, true);
    } catch {
      return {
        id: 1,
        min_order_amount: 99.0,
        free_delivery_threshold: 499.0,
        standard_delivery_fee: 39.0,
        express_delivery_fee: 59.0,
        active_slots_json: JSON.stringify([
          "Express Delivery (15-30 Mins)",
          "Morning Harvest Slot (7:00 AM - 9:30 AM)",
          "Evening Slot (5:30 PM - 8:00 PM)",
          "Tomorrow Morning (7:00 AM - 9:30 AM)"
        ]),
        announcement_text: "Sri Adithya Organics • 100% Pure Wood-Pressed Oils & Certified Organic Produce • Free Delivery over ₹499",
        whatsapp_number: "919515159006"
      };
    }
  },

  async updateSettings(data: Partial<DeliverySetting>): Promise<DeliverySetting> {
    return request('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Admin
  async getDashboardStats(): Promise<DashboardStats> {
    return request('/admin/dashboard-stats');
  },

  // Geolocation & Serviceability
  async reverseGeocode(latitude: number, longitude: number, accuracy?: number): Promise<import('../types').ReverseGeocodeResult> {
    return request('/addresses/reverse-geocode', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, accuracy }),
    });
  },

  async searchAddresses(query: string): Promise<import('../types').AddressSearchResult[]> {
    const encoded = encodeURIComponent(query.trim());
    return request(`/addresses/search?q=${encoded}`);
  },

  async checkServiceability(postalCode?: string, latitude?: number, longitude?: number): Promise<{
    is_serviceable: boolean;
    postal_code?: string;
    city: string;
    locality: string;
    estimated_delivery_minutes: number;
    min_order_amount: number;
    free_delivery_threshold: number;
    service_hub: string;
    message: string;
  }> {
    return request('/addresses/check-serviceability', {
      method: 'POST',
      body: JSON.stringify({ postal_code: postalCode, latitude, longitude }),
    });
  },
};

