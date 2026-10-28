import {
  User, Address, Category, Product, CartData, Order, DeliverySetting, DashboardStats
} from '../types';

const API_BASE = '/api';

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

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

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

  return response.json();
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
    return request('/categories');
  },

  async getCategory(slug: string): Promise<Category> {
    return request(`/categories/${slug}`);
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
    return request(`/products?${query.toString()}`);
  },

  async getProduct(idOrSlug: string | number): Promise<Product> {
    return request(`/products/${idOrSlug}`);
  },

  async getRelatedProducts(idOrSlug: string | number, limit = 4): Promise<Product[]> {
    return request(`/products/${idOrSlug}/related?limit=${limit}`);
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

  async getOrders(): Promise<Order[]> {
    return request('/orders');
  },

  async getOrder(id: number): Promise<Order> {
    return request(`/orders/${id}`);
  },

  async getAllOrdersAdmin(statusFilter?: string): Promise<Order[]> {
    const url = statusFilter ? `/orders/admin/all?status_filter=${statusFilter}` : '/orders/admin/all';
    return request(url);
  },

  async updateOrderStatus(orderId: number, status: string, paymentStatus?: string): Promise<Order> {
    return request(`/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, payment_status: paymentStatus }),
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
    return request('/settings');
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
  async reverseGeocode(latitude: number, longitude: number): Promise<{
    formatted_address: string;
    locality: string;
    city: string;
    state: string;
    postal_code: string;
    is_serviceable: boolean;
    estimated_delivery_minutes: number;
    service_hub: string;
    message: string;
  }> {
    return request('/addresses/reverse-geocode', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    });
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

