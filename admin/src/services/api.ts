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
  StoreSettings
} from '../types';

const RAW_API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '' : 'https://clientproject01-tc3z.onrender.com');
// In development, empty VITE_API_URL proxies through Vite `/api`. In production, points to Render backend.
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

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
        errorMsg = errorData.detail || errorData.message || errorMsg;
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

  // --- Dashboard Overview ---
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/admin/dashboard-stats');
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

  // --- Categories ---
  async getCategories(): Promise<Category[]> {
    return this.request<Category[]>('/categories');
  }

  async createCategory(payload: {
    name: string;
    slug?: string;
    description?: string;
    image_url?: string;
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
}

export const api = new ApiClient();

