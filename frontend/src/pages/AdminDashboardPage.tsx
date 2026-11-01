import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Package, DollarSign, Users, AlertTriangle, Settings, Plus, Search,
  Edit2, Check, RefreshCw, ChevronRight, ShieldAlert, ArrowUpRight,
  Calendar, Filter, X, Phone, MessageSquare, ExternalLink, FileText,
  Clock, CheckCircle, Truck, MapPin
} from 'lucide-react';
import { WhatsAppIcon } from '../components/WhatsAppIcon';
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

  // Order filters
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Order Details & Tracking Notes Modal
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<Order | null>(null);
  const [modalAdminNotes, setModalAdminNotes] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);
  const [notesSaveStatus, setNotesSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    loadAdminData();
  }, [isAdmin, orderStatusFilter, dateFrom, dateTo]);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [st, ords, prods, cats, sett] = await Promise.all([
        api.getDashboardStats(),
        api.getAllOrdersAdmin(orderStatusFilter || undefined, dateFrom || undefined, dateTo || undefined),
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

  const handleOpenOrderModal = (order: Order) => {
    setSelectedOrderForModal(order);
    setModalAdminNotes(order.admin_notes || '');
    setNotesSaveStatus(null);
  };

  const handleCloseOrderModal = () => {
    setSelectedOrderForModal(null);
    setNotesSaveStatus(null);
  };

  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const updated = await api.updateOrderStatus(orderId, newStatus);
      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus as any } : o)));
      if (selectedOrderForModal?.id === orderId) {
        setSelectedOrderForModal((prev) => prev ? { ...prev, status: newStatus as any } : null);
      }
      if (stats) {
        api.getDashboardStats().then(setStats);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update order status.');
    }
  };

  const handleSaveAdminNotes = async () => {
    if (!selectedOrderForModal) return;
    setIsSavingNotes(true);
    setNotesSaveStatus(null);
    try {
      const updated = await api.updateOrderStatus(
        selectedOrderForModal.id,
        undefined,
        undefined,
        modalAdminNotes
      );
      setOrders(orders.map((o) => (o.id === selectedOrderForModal.id ? { ...o, admin_notes: modalAdminNotes } : o)));
      setSelectedOrderForModal((prev) => prev ? { ...prev, admin_notes: modalAdminNotes } : null);
      setNotesSaveStatus('Notes saved successfully!');
      setTimeout(() => setNotesSaveStatus(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save admin notes.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleClearFilters = () => {
    setOrderStatusFilter('');
    setDateFrom('');
    setDateTo('');
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
        express_delivery_fee: settings.express_delivery_fee,
        announcement_text: settings.announcement_text,
        whatsapp_number: settings.whatsapp_number,
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
      <div className="flex border-b border-stone-200 gap-4 sm:gap-6 text-xs sm:text-sm font-bold overflow-x-auto no-scrollbar whitespace-nowrap pb-1 sm:pb-0">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 shrink-0 transition-all ${
            activeTab === 'overview' ? 'border-rootly-forest text-rootly-forest' : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          Overview & Metrics
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 border-b-2 shrink-0 transition-all ${
            activeTab === 'orders' ? 'border-rootly-forest text-rootly-forest' : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          Orders & Fulfillment ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 border-b-2 shrink-0 transition-all ${
            activeTab === 'products' ? 'border-rootly-forest text-rootly-forest' : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          Catalogue & Inventory ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 border-b-2 shrink-0 transition-all ${
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
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-stone-200 shadow-soft space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Total Store Revenue</span>
              <p className="font-display font-black text-2xl text-rootly-forest">₹{stats.total_revenue}</p>
              <p className="text-[10px] text-stone-500">From verified fulfilled orders</p>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-stone-200 shadow-soft space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Total Orders</span>
              <p className="font-display font-black text-2xl text-stone-900">{stats.total_orders}</p>
              <p className="text-[10px] text-emerald-600 font-semibold">{stats.pending_orders} pending fulfillment</p>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-stone-200 shadow-soft space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Active Products</span>
              <p className="font-display font-black text-2xl text-stone-900">{stats.total_products}</p>
              <p className="text-[10px] text-stone-500">Across 10 organic categories</p>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-stone-200 shadow-soft space-y-2">
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
                      <td className="py-3 font-mono font-bold text-stone-900">
                        <button
                          onClick={() => handleOpenOrderModal(ord)}
                          className="hover:underline text-rootly-forest text-left"
                        >
                          #{ord.order_number}
                        </button>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                          ord.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          ord.status === 'processing' ? 'bg-indigo-100 text-indigo-800' :
                          ord.status === 'pending_whatsapp' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                          ord.status === 'out_for_delivery' ? 'bg-purple-100 text-purple-800' :
                          ord.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                          'bg-stone-100 text-stone-700'
                        }`}>
                          {ord.status === 'pending_whatsapp' ? 'WhatsApp Pending' : ord.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 text-stone-500 max-w-[140px] truncate">{ord.delivery_slot}</td>
                      <td className="py-3 text-stone-600">{ord.items?.length || 0} items</td>
                      <td className="py-3 font-black text-stone-900">₹{ord.total_amount}</td>
                      <td className="py-3 flex items-center gap-2">
                        <select
                          value={ord.status}
                          onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                          className="p-1 rounded-lg border border-stone-200 text-[11px] font-semibold bg-white"
                        >
                          <option value="pending_whatsapp">Pending WhatsApp</option>
                          <option value="pending">Pending Online</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="packed">Packed</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button
                          onClick={() => handleOpenOrderModal(ord)}
                          className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold transition-all"
                        >
                          Details
                        </button>
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-stone-200 shadow-soft">
            <div>
              <h3 className="font-display font-bold text-lg text-stone-900">All Customer Orders</h3>
              <p className="text-xs text-stone-500">Filter orders by status or fulfillment date</p>
            </div>
            
            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-stone-500 font-semibold">Status:</span>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="p-2 rounded-xl border border-stone-200 text-xs font-semibold bg-stone-50 focus:bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="pending_whatsapp">Pending WhatsApp Confirmation</option>
                  <option value="pending">Pending Online</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="packed">Packed</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-stone-500 font-semibold">From:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="p-2 rounded-xl border border-stone-200 text-xs font-semibold bg-stone-50 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-stone-500 font-semibold">To:</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="p-2 rounded-xl border border-stone-200 text-xs font-semibold bg-stone-50 focus:bg-white"
                />
              </div>

              {(orderStatusFilter || dateFrom || dateTo) && (
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-stone-600 hover:text-red-600 hover:bg-red-50 flex items-center gap-1 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-soft overflow-x-auto">
            {orders.length === 0 ? (
              <div className="py-12 text-center text-stone-400">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="font-semibold text-sm">No orders match the selected filters.</p>
                <button
                  onClick={handleClearFilters}
                  className="mt-2 text-xs font-bold text-rootly-forest hover:underline"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px] font-bold">
                    <th className="py-3">Order Number</th>
                    <th className="py-3">Date</th>
                    <th className="py-3">Customer & Slot</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Total Amount</th>
                    <th className="py-3">Tracking Notes</th>
                    <th className="py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-stone-50/50">
                      <td className="py-3 font-mono font-bold text-stone-900">
                        <button
                          onClick={() => handleOpenOrderModal(ord)}
                          className="hover:underline text-rootly-forest font-bold text-left"
                        >
                          #{ord.order_number}
                        </button>
                      </td>
                      <td className="py-3 text-stone-500 whitespace-nowrap">
                        {new Date(ord.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 text-stone-600 max-w-[200px]">
                        <span className="font-semibold block truncate">{ord.delivery_slot}</span>
                        <span className="text-[10px] text-stone-400 truncate block">
                          {(() => {
                            try {
                              const parsed = JSON.parse(ord.delivery_address_json);
                              return parsed.recipient_name || parsed.phone || 'Customer';
                            } catch {
                              return 'Customer';
                            }
                          })()}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                          ord.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          ord.status === 'processing' ? 'bg-indigo-100 text-indigo-800' :
                          ord.status === 'pending_whatsapp' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                          ord.status === 'packed' ? 'bg-yellow-100 text-yellow-800' :
                          ord.status === 'out_for_delivery' ? 'bg-purple-100 text-purple-800' :
                          ord.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                          'bg-stone-100 text-stone-700'
                        }`}>
                          {ord.status === 'pending_whatsapp' ? 'WhatsApp Pending' : ord.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 font-black text-stone-900">₹{ord.total_amount}</td>
                      <td className="py-3 max-w-[160px]">
                        {ord.admin_notes ? (
                          <span className="text-[11px] text-stone-600 line-clamp-1 italic" title={ord.admin_notes}>
                            {ord.admin_notes}
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-300">None added</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={ord.status}
                            onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                            className="p-1.5 rounded-lg border border-stone-200 text-xs font-semibold bg-white"
                          >
                            <option value="pending_whatsapp">Pending WhatsApp</option>
                            <option value="pending">Pending Online</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="processing">Processing</option>
                            <option value="packed">Packed</option>
                            <option value="out_for_delivery">Out for Delivery</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <button
                            onClick={() => handleOpenOrderModal(ord)}
                            className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all whitespace-nowrap"
                          >
                            Details & Notes
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Store WhatsApp Business Number
            </label>
            <div className="flex items-center gap-2">
              <span className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-mono text-stone-600 flex items-center gap-1.5 shrink-0">
                <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                <span>wa.me/</span>
              </span>
              <input
                type="text"
                value={settings.whatsapp_number || ''}
                onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value.replace(/[^0-9]/g, '') })}
                placeholder="919876543210"
                className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-mono"
              />
            </div>
            <p className="text-[10px] text-stone-400 mt-1">
              Enter the WhatsApp phone number in international format without spaces, '+' or symbols (e.g. 919876543210 for India).
            </p>
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

      {/* Order Details & Tracking Notes Modal */}
      {selectedOrderForModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div onClick={handleCloseOrderModal} className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm" />
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <div className="relative w-full max-w-2xl rounded-3xl bg-white p-5 sm:p-7 shadow-2xl border border-stone-200 space-y-5 my-8">
              
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xl text-stone-900">
                      #{selectedOrderForModal.order_number}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                      selectedOrderForModal.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                      selectedOrderForModal.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      selectedOrderForModal.status === 'processing' ? 'bg-indigo-100 text-indigo-800' :
                      selectedOrderForModal.status === 'pending_whatsapp' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      selectedOrderForModal.status === 'packed' ? 'bg-yellow-100 text-yellow-800' :
                      selectedOrderForModal.status === 'out_for_delivery' ? 'bg-purple-100 text-purple-800' :
                      selectedOrderForModal.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                      'bg-stone-100 text-stone-700'
                    }`}>
                      {selectedOrderForModal.status === 'pending_whatsapp' ? 'WhatsApp Pending' : selectedOrderForModal.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Placed on {new Date(selectedOrderForModal.created_at).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <button
                  onClick={handleCloseOrderModal}
                  className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Update Quick Bar */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-xs font-bold text-stone-700">Update Order Status:</span>
                <select
                  value={selectedOrderForModal.status}
                  onChange={(e) => handleUpdateOrderStatus(selectedOrderForModal.id, e.target.value)}
                  className="p-2 rounded-xl border border-stone-300 text-xs font-bold bg-white text-stone-800"
                >
                  <option value="pending_whatsapp">Pending WhatsApp Confirmation</option>
                  <option value="pending">Pending Online</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="packed">Packed</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Customer & Address Details */}
              {(() => {
                let addr: any = {};
                try {
                  addr = JSON.parse(selectedOrderForModal.delivery_address_json);
                } catch {
                  addr = { street: selectedOrderForModal.delivery_address_json };
                }
                const phone = addr.phone || '';
                const cleanPhone = phone.replace(/[^0-9]/g, '');

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/80 space-y-2">
                      <div className="flex items-center gap-1.5 text-rootly-forest font-bold">
                        <Users className="w-3.5 h-3.5" />
                        <span>Customer Information</span>
                      </div>
                      <p className="font-bold text-stone-900 text-sm">
                        {addr.recipient_name || 'Customer'}
                      </p>
                      {phone && (
                        <p className="text-stone-600 flex items-center gap-1.5 font-mono">
                          <Phone className="w-3 h-3 text-stone-400" />
                          <span>{phone}</span>
                        </p>
                      )}
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 font-bold text-xs transition-colors mt-1"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                          <span>Chat on WhatsApp</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/80 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-rootly-forest font-bold">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Delivery Address & Slot</span>
                      </div>
                      <p className="text-stone-700 leading-relaxed">
                        {[addr.apartment, addr.street, addr.landmark, addr.city, addr.state, addr.postal_code]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                      <div className="pt-1 text-[11px] font-semibold text-stone-500">
                        <span>Slot: </span>
                        <span className="text-stone-900 font-bold">{selectedOrderForModal.delivery_slot}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Order Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Order Items ({selectedOrderForModal.items?.length || 0})
                  </h4>
                  <span className="text-xs font-bold text-stone-700">
                    Payment: {selectedOrderForModal.payment_method.toUpperCase()} ({selectedOrderForModal.payment_status})
                  </span>
                </div>
                <div className="border border-stone-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Item</th>
                        <th className="py-2.5 px-3">Unit</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3 text-right">Price</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {selectedOrderForModal.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2 px-3 font-semibold text-stone-900">{item.product_name}</td>
                          <td className="py-2 px-3 text-stone-500">{item.variant_name}</td>
                          <td className="py-2 px-3 text-right text-stone-700 font-bold">{item.quantity}</td>
                          <td className="py-2 px-3 text-right text-stone-600">₹{item.unit_price}</td>
                          <td className="py-2 px-3 text-right font-black text-stone-900">₹{item.total_price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Bill Summary */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1.5">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-stone-900">₹{selectedOrderForModal.subtotal}</span>
                </div>
                {selectedOrderForModal.discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount:</span>
                    <span>-₹{selectedOrderForModal.discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600">
                  <span>Delivery Fee:</span>
                  <span className="font-semibold text-stone-900">₹{selectedOrderForModal.delivery_fee}</span>
                </div>
                <div className="flex justify-between text-stone-900 font-black text-sm pt-1 border-t border-stone-200">
                  <span>Final Total:</span>
                  <span className="text-rootly-forest">₹{selectedOrderForModal.total_amount}</span>
                </div>
              </div>

              {/* Customer Instructions if any */}
              {selectedOrderForModal.notes && (
                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-1">
                  <span className="font-bold text-amber-900">Customer Delivery Instructions:</span>
                  <p className="text-amber-800">{selectedOrderForModal.notes}</p>
                </div>
              )}

              {/* Admin Tracking & Fulfillment Notes */}
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-rootly-forest" />
                    <span>Admin Tracking & Delivery Notes</span>
                  </label>
                  {notesSaveStatus && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{notesSaveStatus}</span>
                    </span>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={modalAdminNotes}
                  onChange={(e) => setModalAdminNotes(e.target.value)}
                  placeholder="Record courier tracking number, delivery executive phone, WhatsApp confirmation log, or custom handling instructions..."
                  className="w-full p-3 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-rootly-forest/20 focus:border-rootly-forest"
                />
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-stone-400">
                    Saved notes are visible only to administrators for order tracking.
                  </p>
                  <button
                    type="button"
                    onClick={handleSaveAdminNotes}
                    disabled={isSavingNotes}
                    className="px-4 py-2 rounded-xl bg-rootly-forest hover:bg-rootly-dark text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  >
                    {isSavingNotes ? (
                      <span>Saving Notes...</span>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Save Notes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Modal Footer Link */}
              <div className="flex justify-between items-center pt-3 border-t border-stone-100 text-xs">
                <Link
                  to={`/order-confirmation/${selectedOrderForModal.id}`}
                  target="_blank"
                  className="text-rootly-forest hover:underline font-bold flex items-center gap-1"
                >
                  <span>Open Public Order Confirmation Page</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <button
                  type="button"
                  onClick={handleCloseOrderModal}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

