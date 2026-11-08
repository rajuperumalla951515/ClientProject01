import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee,
  ShoppingBag,
  Package,
  Users,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  PackageX,
  Boxes,
  ArrowRight,
  Clock,
  Calendar,
  CheckCircle2,
  CalendarRange
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardStats, Order } from '../types';
import { StatCard } from '../components/ui/StatCard';
import { OrderStatusBadge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useToast } from '../context/ToastContext';

type DateFilterOption = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'all' | 'custom';

export const OverviewPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<DateFilterOption>('today');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showCustomDates, setShowCustomDates] = useState(false);

  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const fetchStats = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const data = await api.getDashboardStats({
        period: selectedPeriod,
        date_from: selectedPeriod === 'custom' ? customDateFrom : undefined,
        date_to: selectedPeriod === 'custom' ? customDateTo : undefined,
      });
      setStats(data);
      if (isManual) {
        showSuccess('Metrics updated with Cloudflare D1.', 'Synchronized');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to fetch executive dashboard metrics.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedPeriod, customDateFrom, customDateTo, showError, showSuccess]);

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

  const handlePeriodChange = (period: DateFilterOption) => {
    setSelectedPeriod(period);
    if (period === 'custom') {
      setShowCustomDates(true);
    } else {
      setShowCustomDates(false);
    }
  };

  const handleApplyCustomDates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDateFrom || !customDateTo) {
      showError('Please select both start and end dates.');
      return;
    }
    fetchStats(true);
  };

  const formatCurrency = (val?: number) => {
    return `₹${Number(val || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    })}`;
  };

  if (isLoading && !stats) {
    return <LoadingSpinner text="Connecting to Cloudflare D1 and generating executive overview..." size="lg" />;
  }

  const periodLabels: Record<DateFilterOption, string> = {
    today: "Today's",
    yesterday: "Yesterday's",
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    month: 'This Month',
    all: 'All Time',
    custom: 'Custom Period',
  };

  const activePeriodLabel = periodLabels[selectedPeriod] || 'Selected Period';
  const displayedRevenue = stats?.filtered_revenue !== undefined ? stats.filtered_revenue : stats?.today_revenue || 0;
  const displayedOrders = stats?.filtered_orders !== undefined ? stats.filtered_orders : stats?.today_orders || 0;
  const displayedAov = stats?.filtered_aov !== undefined ? stats.filtered_aov : (displayedOrders > 0 ? displayedRevenue / displayedOrders : 0);

  // Calculate highest revenue in sales trend for proportional bar heights
  const maxTrendRevenue = stats?.sales_trend?.length
    ? Math.max(...stats.sales_trend.map((s) => s.revenue), 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* Executive Filter & Controls Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#E6E7DD] shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#26352B]">Executive Business Overview</h2>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#E2E8D7] text-[#244B37] border border-[#8A9B69]/30">
              Live Production
            </span>
          </div>
          <p className="text-xs text-[#778176] mt-0.5">
            Real-time business performance for Sri Adithya Organics powered by Cloudflare D1
          </p>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center bg-[#FAF9F5] p-1 rounded-xl border border-[#E6E7DD]">
            {(['today', 'yesterday', '7d', '30d', 'month', 'all'] as DateFilterOption[]).map((period) => (
              <button
                key={period}
                onClick={() => handlePeriodChange(period)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedPeriod === period
                    ? 'bg-[#244B37] text-white shadow-xs'
                    : 'text-[#778176] hover:text-[#26352B] hover:bg-white'
                }`}
              >
                {period === 'today' && 'Today'}
                {period === 'yesterday' && 'Yesterday'}
                {period === '7d' && '7 Days'}
                {period === '30d' && '30 Days'}
                {period === 'month' && 'This Month'}
                {period === 'all' && 'All Time'}
              </button>
            ))}
            <button
              onClick={() => handlePeriodChange('custom')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedPeriod === 'custom'
                  ? 'bg-[#244B37] text-white shadow-xs'
                  : 'text-[#778176] hover:text-[#26352B] hover:bg-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Custom</span>
            </button>
          </div>

          <button
            onClick={() => fetchStats(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-[#E6E7DD] bg-white hover:bg-[#F6F5EF] text-[#26352B] transition-colors disabled:opacity-50"
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 text-[#496B45] ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker Accordion */}
      {showCustomDates && (
        <form
          onSubmit={handleApplyCustomDates}
          className="bg-white p-4 rounded-2xl border border-[#8A9B69]/40 bg-[#FAF9F5] flex flex-wrap items-center gap-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-[#496B45]" />
            <span className="text-xs font-bold text-[#26352B]">Custom Date Range:</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#778176]">From:</label>
            <input
              type="date"
              required
              value={customDateFrom}
              onChange={(e) => setCustomDateFrom(e.target.value)}
              className="px-3 py-1.5 bg-white border border-[#E6E7DD] rounded-xl text-xs font-semibold text-[#26352B] focus:outline-none focus:border-[#496B45]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#778176]">To:</label>
            <input
              type="date"
              required
              value={customDateTo}
              onChange={(e) => setCustomDateTo(e.target.value)}
              className="px-3 py-1.5 bg-white border border-[#E6E7DD] rounded-xl text-xs font-semibold text-[#26352B] focus:outline-none focus:border-[#496B45]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-xl bg-[#244B37] text-white text-xs font-bold shadow-xs hover:bg-[#1C3C2C] transition-colors"
          >
            Apply Range
          </button>
        </form>
      )}

      {/* Operational Alert Banners */}
      {((stats?.low_stock_products || 0) > 0 || (stats?.out_of_stock_products || 0) > 0 || (stats?.pending_orders || 0) > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(stats?.pending_orders || 0) > 0 && (
            <div className="p-4 rounded-2xl bg-[#F1F4EC] border border-[#8A9B69]/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#244B37] text-white flex items-center justify-center font-bold text-xs">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#244B37]">
                    {stats?.pending_orders} Pending Orders
                  </h4>
                  <p className="text-[11px] text-[#496B45]">Awaiting fulfillment</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/orders')}
                className="px-3 py-1 rounded-xl bg-white text-[#244B37] border border-[#E6E7DD] hover:bg-[#E2E8D7] text-xs font-bold transition-colors"
              >
                View
              </button>
            </div>
          )}

          {(stats?.low_stock_products || 0) > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    {stats?.low_stock_products} Low Stock SKUs
                  </h4>
                  <p className="text-[11px] text-amber-700">&lt; 10 units in warehouse</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/inventory')}
                className="px-3 py-1 rounded-xl bg-white text-amber-900 border border-amber-200 hover:bg-amber-100 text-xs font-bold transition-colors"
              >
                Adjust
              </button>
            </div>
          )}

          {(stats?.out_of_stock_products || 0) > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                  <PackageX className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-rose-900">
                    {stats?.out_of_stock_products} Out of Stock
                  </h4>
                  <p className="text-[11px] text-rose-700">Immediate farm restock needed</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/inventory')}
                className="px-3 py-1 rounded-xl bg-white text-rose-900 border border-rose-200 hover:bg-rose-100 text-xs font-bold transition-colors"
              >
                Restock
              </button>
            </div>
          )}
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={`${activePeriodLabel} Revenue`}
          value={formatCurrency(displayedRevenue)}
          subtitle={`All-time revenue: ${formatCurrency(stats?.total_revenue)}`}
          icon={IndianRupee}
          colorScheme="forest"
          onClick={() => navigate('/analytics')}
        />

        <StatCard
          title={`${activePeriodLabel} Orders`}
          value={displayedOrders}
          subtitle={`Total orders recorded: ${stats?.total_orders || 0}`}
          icon={ShoppingBag}
          colorScheme="sage"
          onClick={() => navigate('/orders')}
        />

        <StatCard
          title="Average Order Value"
          value={formatCurrency(displayedAov)}
          subtitle="Net revenue divided by fulfilled orders"
          icon={TrendingUp}
          colorScheme="earth"
          onClick={() => navigate('/analytics')}
        />

        <StatCard
          title="Active Customers"
          value={stats?.total_customers || 0}
          subtitle="Registered customer profiles in D1"
          icon={Users}
          colorScheme="forest"
          onClick={() => navigate('/customers')}
        />
      </div>

      {/* Secondary Operational Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E6E7DD] shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#778176] uppercase">Organic Catalogue</span>
            <Package className="w-4 h-4 text-[#496B45]" />
          </div>
          <p className="text-xl font-bold text-[#26352B] mt-2">{stats?.total_products || 0}</p>
          <p className="text-[11px] text-[#778176] mt-0.5">Active Products</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E6E7DD] shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#778176] uppercase">Inventory Valuation</span>
            <Boxes className="w-4 h-4 text-[#496B45]" />
          </div>
          <p className="text-xl font-bold text-[#26352B] mt-2">
            {formatCurrency(stats?.inventory_valuation || 0)}
          </p>
          <p className="text-[11px] text-[#778176] mt-0.5">Total Retail Asset Value</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E6E7DD] shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#778176] uppercase">Delivered Orders</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-[#26352B] mt-2">{stats?.delivered_orders || 0}</p>
          <p className="text-[11px] text-[#778176] mt-0.5">Completed Doorstep Deliveries</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E6E7DD] shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#778176] uppercase">Stock Shortages</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-[#26352B] mt-2">
            {(stats?.low_stock_products || 0) + (stats?.out_of_stock_products || 0)}
          </p>
          <p className="text-[11px] text-[#778176] mt-0.5">SKUs Requiring Action</p>
        </div>
      </div>

      {/* Two-Column Middle Section: Sales Trend Visualizer + Best Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Visualizer (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#E6E7DD] shadow-card">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E6E7DD]">
            <div>
              <h3 className="text-sm font-bold text-[#26352B]">Revenue & Sales Volume Trend</h3>
              <p className="text-[11px] text-[#778176]">Daily order revenue from production records</p>
            </div>
            <button
              onClick={() => navigate('/analytics')}
              className="text-xs font-bold text-[#244B37] hover:underline flex items-center gap-1"
            >
              <span>Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats?.sales_trend && stats.sales_trend.length > 0 ? (
            <div className="space-y-4">
              <div className="h-44 flex items-end gap-2 pt-4">
                {stats.sales_trend.map((pt, idx) => {
                  const barHeightPct = Math.max(8, Math.round((pt.revenue / maxTrendRevenue) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <div className="text-[10px] font-bold text-[#26352B] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        ₹{Math.round(pt.revenue)}
                      </div>
                      <div
                        style={{ height: `${barHeightPct}%` }}
                        className="w-full max-w-[36px] rounded-t-lg bg-[#244B37] group-hover:bg-[#496B45] transition-all"
                      />
                      <span className="text-[10px] font-medium text-[#778176] truncate max-w-full">
                        {pt.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-xs text-[#778176] pt-2 border-t border-[#E6E7DD]">
                <span>Bars reflect daily revenue (₹)</span>
                <span>Hover over any bar to view daily metrics</span>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[#778176]">
              No order data recorded in selected date range.
            </div>
          )}
        </div>

        {/* Best Selling Organic Products (1 Col) */}
        <div className="bg-white p-5 rounded-2xl border border-[#E6E7DD] shadow-card">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E6E7DD]">
            <div>
              <h3 className="text-sm font-bold text-[#26352B]">Top Selling Products</h3>
              <p className="text-[11px] text-[#778176]">Ranked by units dispatched</p>
            </div>
            <button
              onClick={() => navigate('/products')}
              className="text-xs font-bold text-[#244B37] hover:underline"
            >
              Catalogue
            </button>
          </div>

          <div className="space-y-3">
            {stats?.top_products && stats.top_products.length > 0 ? (
              stats.top_products.map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-[#F1F4EC] text-[#244B37] flex items-center justify-center font-bold text-[10px] shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-[#26352B] truncate">{item.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-[#26352B]">₹{item.revenue.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-[#778176]">{item.units_sold} units</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#778176] text-center py-6">
                No orders completed yet. Top products will rank automatically.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Two-Column Bottom Section: Recent Orders + Recent Stock Changes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E6E7DD] shadow-card overflow-hidden">
          <div className="p-5 border-b border-[#E6E7DD] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#26352B]">Recent Orders</h3>
              <p className="text-[11px] text-[#778176]">Latest customer purchases</p>
            </div>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-bold text-[#244B37] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F5] border-b border-[#E6E7DD] text-[11px] font-bold text-[#778176] uppercase">
                  <th className="px-5 py-3">Order ID</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E7DD] text-xs">
                {stats?.recent_orders && stats.recent_orders.length > 0 ? (
                  stats.recent_orders.map((ord: Order) => (
                    <tr
                      key={ord.id}
                      onClick={() => navigate('/orders')}
                      className="hover:bg-[#F6F5EF] cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5 font-bold text-[#244B37]">
                        #{ord.order_number}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-[#26352B]">
                        {ord.customer_name || 'Customer'}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-[#26352B]">
                        ₹{ord.total_amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5">
                        <OrderStatusBadge status={ord.status} />
                      </td>
                      <td className="px-5 py-3.5 text-[#778176]">
                        {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-xs text-[#778176]">
                      No orders placed yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Stock Changes (1 Col) */}
        <div className="bg-white rounded-2xl border border-[#E6E7DD] shadow-card overflow-hidden flex flex-col">
          <div className="p-5 border-b border-[#E6E7DD] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#26352B]">Recent Stock Changes</h3>
              <p className="text-[11px] text-[#778176]">Inventory movements & audit logs</p>
            </div>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs font-bold text-[#244B37] hover:underline"
            >
              Audit Log
            </button>
          </div>

          <div className="p-4 flex-1 divide-y divide-[#E6E7DD] overflow-y-auto max-h-[360px]">
            {stats?.recent_stock_changes && stats.recent_stock_changes.length > 0 ? (
              stats.recent_stock_changes.map((log) => (
                <div key={log.log_id} className="py-2.5 first:pt-0 last:pb-0 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#26352B] truncate">{log.product_name}</span>
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded-md text-[10px] ${
                        log.changed_stock > 0
                          ? 'bg-[#E2E8D7] text-[#244B37]'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {log.changed_stock > 0 ? `+${log.changed_stock}` : log.changed_stock} units
                    </span>
                  </div>
                  <p className="text-[11px] text-[#778176] mt-0.5 line-clamp-1">{log.reason}</p>
                  <div className="flex items-center justify-between text-[10px] text-[#778176] mt-1">
                    <span>
                      New Stock: <strong className="text-[#26352B]">{log.new_stock}</strong>
                    </span>
                    <span>{log.created_at ? log.created_at.slice(0, 16) : ''}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#778176] text-center py-8">
                No recent inventory adjustments logged.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
