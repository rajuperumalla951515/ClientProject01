import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Package, DollarSign, Users, AlertTriangle, Settings, Plus, Search,
  Edit2, Check, RefreshCw, ChevronRight, ShieldAlert, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Order, Product, Category, DeliverySetting, DashboardStats } from '../types';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products' | 'settings'>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<DeliverySetting | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // New Product Modal
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdSlug, setNewProdSlug] = useState('');
  const [newProdCatId, setNewProdCatId] = useState<number>(1);
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdOrigin, setNewProdOrigin] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('500g');
  const [newProdPrice, setNewProdPrice] = useState<number>(75);
  const [newProdMrp, setNewProdMrp] = useState<number>(95);
  const [newProdStock, setNewProdStock] = useState<number>(40);
  const [newProdImage, setNewProdImage] = useState('https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=800');

  // Order status filter
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('');

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    loadAdminData();
  }, [isAdmin, orderStatusFilter]);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [st, ords, prods, cats, sett] = await Promise.all([
        api.getDashboardStats(),
        api.getAllOrdersAdmin(orderStatusFilter || undefined),
        api.getProducts({ limit: 100 }),
        api.getCategories(),
        api.getSettings(),
      ]);
      setStats(st);
      setOrders(ords);
      setProducts(prods);
      setCategories(cats);
      setSettings(sett);
      if (cats.length > 0 && !newProdCatId) {
        setNewProdCatId(cats[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus as any } : o)));
      if (stats) {
        api.getDashboardStats().then(setStats);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update order status.');
    }
  };

  const handleUpdateStock = async (productId: number, variantId: number, currentStock: number) => {
    const newStockStr = prompt('Enter new stock quantity:', String(currentStock));
    if (newStockStr === null) return;
    const newStock = parseInt(newStockStr, 10);
    if (isNaN(newStock) || newStock < 0) return;

    try {
      await api.updateVariant(productId, variantId, { stock: newStock });
      setProducts(
        products.map((p) => {
          if (p.id === productId) {
            return {
              ...p,
              variants: p.variants.map((v) => (v.id === variantId ? { ...v, stock: newStock } : v)),
            };
          }
          return p;
        })
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update variant stock.');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createProduct({
        name: newProdName,
        slug: newProdSlug || newProdName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        category_id: newProdCatId,
        description: newProdDesc,
        short_description: newProdDesc.slice(0, 100),
        origin_farm: newProdOrigin || 'Karnataka Natural Co-op',
        is_active: true,
        variants: [
          {
            unit: newProdUnit,
            pack_size: 'Standard Pack',
            price: newProdPrice,
            mrp: newProdMrp,
            stock: newProdStock,
            is_default: true,
          },
        ],
        images: [
          {
            image_url: newProdImage,
            alt_text: newProdName,
            is_primary: true,
            display_order: 0,
          },
        ],
      });
      setProducts([created, ...products]);
      setIsAddProductOpen(false);
      // reset form
      setNewProdName('');
      setNewProdSlug('');
      setNewProdDesc('');
    } catch (err: any) {
      alert(err.message || 'Failed to create product.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const updated = await api.updateSettings({
        min_order_amount: settings.min_order_amount,
        free_delivery_threshold: settings.free_delivery_threshold,
        standard_delivery_fee: settings.standard_delivery_fee,
        announcement_text: settings.announcement_text,
      });
      setSettings(updated);
      alert('Store settings saved successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update settings.');
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-3" />
        <h2 className="font-display font-black text-xl text-stone-900">Restricted Admin Area</h2>
        <p className="text-xs text-stone-500 mt-1 mb-6">
          You must be logged in as an administrator (e.g. <code>admin@sriadithyaorganics.com</code>) to access store operations.
        </p>
        <Link to="/" className="px-5 py-2.5 rounded-xl bg-rootly-forest text-white text-xs font-bold">
          Return to Store
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider mb-1">
            Store Management Console
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-stone-900">
            Sri Adithya Organics Admin Dashboard
          </h1>
          <p className="text-xs text-stone-500">Live store metrics, order fulfillment, and catalogue inventory</p>
        </div>

        <button
          onClick={loadAdminData}
          className="px-4 py-2 rounded-xl bg-white border border-stone-200 text-xs font-bold text-stone-700 hover:border-rootly-forest hover:text-rootly-forest transition-all flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-stone-200 gap-6 text-xs sm:text-sm font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'overview' ? 'border-rootly-forest text-rootly-forest' : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          Overview & Metrics
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'orders' ? 'border-rootly-forest text-rootly-forest' : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          Orders & Fulfillment ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'products' ? 'border-rootly-forest text-rootly-forest' : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          Catalogue & Inventory ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'settings' ? 'border-rootly-forest text-rootly-forest' : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          Store Settings
        </button>
      </div>

      {/* TAB 1: OVERVIEW METRICS */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-8">
          {/* Metrics 4-grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-soft space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Total Store Revenue</span>
              <p className="font-display font-black text-2xl text-rootly-forest">₹{stats.total_revenue}</p>
              <p className="text-[10px] text-stone-500">From verified fulfilled orders</p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-soft space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Total Orders</span>
              <p className="font-display font-black text-2xl text-stone-900">{stats.total_orders}</p>
              <p className="text-[10px] text-emerald-600 font-semibold">{stats.pending_orders} pending fulfillment</p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-soft space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Active Products</span>
              <p className="font-display font-black text-2xl text-stone-900">{stats.total_products}</p>
              <p className="text-[10px] text-stone-500">Across 10 organic categories</p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-soft space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Registered Customers</span>
              <p className="font-display font-black text-2xl text-stone-900">{stats.total_customers}</p>
              <p className="text-[10px] text-stone-500">Bengaluru households</p>
            </div>
          </div>

          {/* Recent Orders table */}
          <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-stone-900">Recent Customer Orders</h3>
              <button
                onClick={() => setActiveTab('orders')}
                className="text-xs font-bold text-rootly-forest hover:underline"
              >
                View All Orders →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px] font-bold">
                    <th className="py-2.5">Order #</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5">Slot</th>
                    <th className="py-2.5">Items</th>
                    <th className="py-2.5">Total</th>
                    <th className="py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {stats.recent_orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-stone-50/50">
                      <td className="py-3 font-mono font-bold text-stone-900">#{ord.order_number}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                          ord.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          ord.status === 'out_for_delivery' ? 'bg-purple-100 text-purple-800' :
                          'bg-stone-100 text-stone-700'
                        }`}>
                          {ord.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 text-stone-500 max-w-[140px] truncate">{ord.delivery_slot}</td>
                      <td className="py-3 text-stone-600">{ord.items?.length || 0} items</td>
                      <td className="py-3 font-black text-stone-900">₹{ord.total_amount}</td>
                      <td className="py-3">
                        <select
                          value={ord.status}
                          onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                          className="p-1 rounded-lg border border-stone-200 text-[11px] font-semibold bg-white"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="packed">Packed</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-display font-bold text-lg text-stone-900">All Customer Orders</h3>
            
            {/* Filter by status */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 font-semibold">Filter:</span>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="p-2 rounded-xl border border-stone-200 text-xs font-semibold bg-white"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="packed">Packed</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-soft overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px] font-bold">
                  <th className="py-3">Order Number</th>
                  <th className="py-3">Date</th>
                  <th className="py-3">Slot & Address</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Total Amount</th>
                  <th className="py-3">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-stone-50/50">
                    <td className="py-3 font-mono font-bold text-stone-900">
                      <Link to={`/order-confirmation/${ord.id}`} className="hover:underline text-rootly-forest">
                        #{ord.order_number}
                      </Link>
                    </td>
                    <td className="py-3 text-stone-500">
                      {new Date(ord.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 text-stone-600 max-w-[200px] truncate">
                      <span className="font-semibold block truncate">{ord.delivery_slot}</span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                        ord.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        ord.status === 'out_for_delivery' ? 'bg-purple-100 text-purple-800' :
                        'bg-stone-100 text-stone-700'
                      }`}>
                        {ord.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 font-black text-stone-900">₹{ord.total_amount}</td>
                    <td className="py-3">
                      <select
                        value={ord.status}
                        onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                        className="p-1.5 rounded-lg border border-stone-200 text-xs font-semibold bg-white"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="packed">Packed</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCTS & INVENTORY */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-stone-900">Products & Stock Control</h3>
            <button
              onClick={() => setIsAddProductOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-rootly-forest text-white text-xs font-bold hover:bg-rootly-dark transition-all flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Organic Product</span>
            </button>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-soft overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px] font-bold">
                  <th className="py-3">Product</th>
                  <th className="py-3">Category</th>
                  <th className="py-3">Default Unit</th>
                  <th className="py-3">Price</th>
                  <th className="py-3">Stock Units</th>
                  <th className="py-3">Stock Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {products.map((p) => {
                  const defVar = p.variants?.find((v) => v.is_default) || p.variants?.[0];
                  return (
                    <tr key={p.id} className="hover:bg-stone-50/50">
                      <td className="py-3 flex items-center gap-3">
                        <img
                          src={p.primary_image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=150'}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover border border-stone-100"
                        />
                        <div>
                          <p className="font-bold text-stone-900">{p.name}</p>
                          <p className="text-[10px] text-stone-400">{p.origin_farm}</p>
                        </div>
                      </td>
                      <td className="py-3 text-stone-600 font-semibold">{p.category?.name || 'Category'}</td>
                      <td className="py-3 text-stone-600">{defVar?.unit || '1 pack'}</td>
                      <td className="py-3 font-bold text-stone-900">₹{defVar?.price}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded font-mono text-xs font-bold ${
                          (defVar?.stock || 0) < 10 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {defVar?.stock || 0} in stock
                        </span>
                      </td>
                      <td className="py-3">
                        {defVar && (
                          <button
                            onClick={() => handleUpdateStock(p.id, defVar.id, defVar.stock)}
                            className="px-2.5 py-1 rounded-lg border border-stone-200 text-[11px] font-bold text-stone-700 hover:border-rootly-forest hover:text-rootly-forest"
                          >
                            Edit Stock
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: STORE SETTINGS */}
      {activeTab === 'settings' && settings && (
        <form onSubmit={handleSaveSettings} className="p-8 rounded-3xl bg-white border border-stone-200 shadow-soft max-w-2xl space-y-5">
          <h3 className="font-display font-bold text-lg text-stone-900 pb-3 border-b border-stone-100">
            Delivery & Operational Settings
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Minimum Order Amount (₹)
              </label>
              <input
                type="number"
                value={settings.min_order_amount}
                onChange={(e) => setSettings({ ...settings, min_order_amount: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Free Delivery Threshold (₹)
              </label>
              <input
                type="number"
                value={settings.free_delivery_threshold}
                onChange={(e) => setSettings({ ...settings, free_delivery_threshold: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Standard Delivery Partner Fee (₹)
              </label>
              <input
                type="number"
                value={settings.standard_delivery_fee}
                onChange={(e) => setSettings({ ...settings, standard_delivery_fee: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Express Delivery Fee (₹)
              </label>
              <input
                type="number"
                value={settings.express_delivery_fee}
                onChange={(e) => setSettings({ ...settings, express_delivery_fee: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Top Announcement Banner Text
            </label>
            <input
              type="text"
              value={settings.announcement_text || ''}
              onChange={(e) => setSettings({ ...settings, announcement_text: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-stone-200 text-xs"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-rootly-forest text-white font-bold text-xs shadow-md hover:bg-rootly-dark transition-all"
            >
              Save Store Settings
            </button>
          </div>
        </form>
      )}

      {/* Add Product Modal */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div onClick={() => setIsAddProductOpen(false)} className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm" />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-4">
              <h3 className="font-display font-bold text-lg text-stone-900">Add New Organic Product</h3>
              
              <form onSubmit={handleCreateProduct} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Product Title</label>
                    <input
                      type="text"
                      required
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      placeholder="e.g. Organic Moringa Leaves"
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Category</label>
                    <select
                      value={newProdCatId}
                      onChange={(e) => setNewProdCatId(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    required
                    value={newProdDesc}
                    onChange={(e) => setNewProdDesc(e.target.value)}
                    placeholder="Describe honest sourcing, farm practices, and freshness..."
                    className="w-full p-2.5 rounded-xl border border-stone-200 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Farm Origin</label>
                    <input
                      type="text"
                      value={newProdOrigin}
                      onChange={(e) => setNewProdOrigin(e.target.value)}
                      placeholder="e.g. Hosur Organic Cluster"
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Image URL (Unsplash/Direct)</label>
                    <input
                      type="url"
                      required
                      value={newProdImage}
                      onChange={(e) => setNewProdImage(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-stone-100">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">Unit</label>
                    <input
                      type="text"
                      required
                      value={newProdUnit}
                      onChange={(e) => setNewProdUnit(e.target.value)}
                      className="w-full p-2 rounded-xl border border-stone-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">Price (₹)</label>
                    <input
                      type="number"
                      required
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(Number(e.target.value))}
                      className="w-full p-2 rounded-xl border border-stone-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">MRP (₹)</label>
                    <input
                      type="number"
                      required
                      value={newProdMrp}
                      onChange={(e) => setNewProdMrp(Number(e.target.value))}
                      className="w-full p-2 rounded-xl border border-stone-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">Stock</label>
                    <input
                      type="number"
                      required
                      value={newProdStock}
                      onChange={(e) => setNewProdStock(Number(e.target.value))}
                      className="w-full p-2 rounded-xl border border-stone-200 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddProductOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-rootly-forest text-white text-xs font-bold shadow-md hover:bg-rootly-dark"
                  >
                    Create Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

