import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee,
  ShoppingBag,
  Package,
  Users,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  MapPin,
  Clock,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardStats, Order } from '../types';
import { StatCard } from '../components/ui/StatCard';
import { OrderStatusBadge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useToast } from '../context/ToastContext';

export const OverviewPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const fetchStats = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
      if (isManual) {
        showSuccess('Dashboard metrics updated from Google Sheets.', 'Synchronized');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to fetch dashboard metrics.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showError, showSuccess]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Periodic Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStats]);

  if (isLoading) {
    return <LoadingSpinner text="Loading real-time Google Sheets analytics..." size="lg" />;
  }

  const formatCurrency = (val: number) => {
    return `₹${Number(val || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Sri Adithya Organics Overview</h2>
          <p className="text-xs text-slate-500">
            Real-time fulfillment metrics synced with Google Sheets
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded text-brand-700 focus:ring-brand-600 w-4 h-4"
            />
            <span>Auto-refresh (30s)</span>
          </label>

          <button
            onClick={() => fetchStats(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-700' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.total_revenue || 0)}
          subtitle="Non-cancelled orders"
          icon={IndianRupee}
          colorScheme="emerald"
        />
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(stats?.today_revenue || 0)}
          subtitle="Collected today"
          icon={TrendingUp}
          colorScheme="green"
        />
        <StatCard
          title="Total Orders"
          value={stats?.total_orders || 0}
          subtitle={`${stats?.pending_orders || 0} orders pending`}
          icon={ShoppingBag}
          colorScheme="blue"
          onClick={() => navigate('/orders')}
        />
        <StatCard
          title="Today's Orders"
          value={stats?.today_orders || 0}
          subtitle="Placed today"
          icon={Clock}
          colorScheme="purple"
          onClick={() => navigate('/orders')}
        />
        <StatCard
          title="Low Stock Alert"
          value={stats?.low_stock_products || 0}
          subtitle="Items < 10 units"
          icon={AlertTriangle}
          colorScheme={stats?.low_stock_products ? 'rose' : 'green'}
          onClick={() => navigate('/inventory')}
        />
        <StatCard
          title="Total Customers"
          value={stats?.total_customers || 0}
          subtitle="Registered accounts"
          icon={Users}
          colorScheme="amber"
          onClick={() => navigate('/customers')}
        />
      </div>

      {/* Orders Status Breakdown Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
          Order Status Breakdown
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <div
            onClick={() => navigate('/orders?status=pending_whatsapp')}
            className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/60 cursor-pointer hover:bg-amber-100/70 transition-colors"
          >
            <span className="text-[11px] font-semibold text-amber-800 uppercase block">Pending WhatsApp</span>
            <span className="text-xl font-bold text-amber-950 mt-1 block">
              {stats?.order_status_counts?.['pending_whatsapp'] || 0}
            </span>
          </div>
          <div
            onClick={() => navigate('/orders?status=confirmed')}
            className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/60 cursor-pointer hover:bg-blue-100/70 transition-colors"
          >
            <span className="text-[11px] font-semibold text-blue-800 uppercase block">Confirmed</span>
            <span className="text-xl font-bold text-blue-950 mt-1 block">
              {stats?.order_status_counts?.['confirmed'] || 0}
            </span>
          </div>
          <div
            onClick={() => navigate('/orders?status=processing')}
            className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200/60 cursor-pointer hover:bg-purple-100/70 transition-colors"
          >
            <span className="text-[11px] font-semibold text-purple-800 uppercase block">Processing</span>
            <span className="text-xl font-bold text-purple-950 mt-1 block">
              {stats?.order_status_counts?.['processing'] || 0}
            </span>
          </div>
          <div
            onClick={() => navigate('/orders?status=delivered')}
            className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 cursor-pointer hover:bg-emerald-100/70 transition-colors"
          >
            <span className="text-[11px] font-semibold text-emerald-800 uppercase block">Delivered</span>
            <span className="text-xl font-bold text-emerald-950 mt-1 block">
              {stats?.order_status_counts?.['delivered'] || 0}
            </span>
          </div>
          <div
            onClick={() => navigate('/orders?status=cancelled')}
            className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/60 cursor-pointer hover:bg-rose-100/70 transition-colors"
          >
            <span className="text-[11px] font-semibold text-rose-800 uppercase block">Cancelled</span>
            <span className="text-xl font-bold text-rose-950 mt-1 block">
              {stats?.order_status_counts?.['cancelled'] || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Best-Selling Products & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Best Sellers */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <h3 className="text-sm font-bold text-slate-900">Best-Selling Products</h3>
            </div>
            <button
              onClick={() => navigate('/products')}
              className="text-xs font-semibold text-brand-700 hover:text-brand-900 flex items-center gap-1"
            >
              Catalogue <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {stats?.top_products && stats.top_products.length > 0 ? (
              stats.top_products.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                >
                  <div className="w-6 text-center text-xs font-bold text-slate-400">
                    #{idx + 1}
                  </div>
                  <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100'}
                    alt={item.name}
                    className="w-10 h-10 rounded-lg object-cover border border-slate-200/80"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                    <p className="text-[11px] text-slate-500">{item.units_sold} units sold</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900 block">{formatCurrency(item.revenue)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">No sales recorded yet</p>
            )}
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Customer Orders</h3>
              <p className="text-xs text-slate-500">Live order queue from customer checkout</p>
            </div>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-semibold text-brand-700 hover:text-brand-900 flex items-center gap-1"
            >
              View All Orders <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 pl-1">Order #</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Items</th>
                  <th className="pb-3">Total</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-1">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.recent_orders && stats.recent_orders.length > 0 ? (
                  stats.recent_orders.slice(0, 6).map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 pl-1 font-mono font-medium text-slate-800">
                        {order.order_number}
                      </td>
                      <td className="py-3">
                        <span className="font-semibold text-slate-900 block">{order.customer_name || 'Guest'}</span>
                        <span className="text-[11px] text-slate-500">{order.phone}</span>
                      </td>
                      <td className="py-3 text-slate-600">
                        {order.items?.length || 1} item{order.items?.length > 1 ? 's' : ''}
                      </td>
                      <td className="py-3 font-semibold text-slate-900">
                        {formatCurrency(order.total_amount)}
                      </td>
                      <td className="py-3">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="py-3 text-right pr-1">
                        <button
                          onClick={() => navigate(`/orders?highlight=${order.order_number}`)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No customer orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
