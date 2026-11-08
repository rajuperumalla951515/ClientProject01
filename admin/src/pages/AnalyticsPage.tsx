import React, { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp,
  IndianRupee,
  ShoppingBag,
  Users,
  Calendar,
  RefreshCw,
  Package,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Award,
  Clock,
  PieChart,
  BarChart3,
  Filter,
} from 'lucide-react';
import { api } from '../services/api';
import { AnalyticsReport } from '../types';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [period, setPeriod] = useState<string>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'products' | 'inventory'>('overview');

  const { showSuccess, showError } = useToast();

  const loadAnalytics = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const params: { period?: string; date_from?: string; date_to?: string } = {
        period,
      };
      if (period === 'custom' && customFrom && customTo) {
        params.date_from = customFrom;
        params.date_to = customTo;
      }
      const res = await api.getAnalytics(params);
      setData(res);
      if (isManual) {
        showSuccess('Analytics data updated from Cloudflare D1.', 'Synchronized');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to load store analytics.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const handleApplyCustomDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFrom || !customTo) {
      showError('Please specify both Start and End dates.');
      return;
    }
    loadAnalytics(true);
  };

  // Find max sales in trend for chart scaling
  const maxTrendRevenue = useMemo(() => {
    if (!data?.sales_trend || data.sales_trend.length === 0) return 1000;
    return Math.max(...data.sales_trend.map((t) => t.revenue), 100);
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Top Filter and Controls */}
      <div className="bg-white p-4 rounded-2xl border border-[#E6E7DD] shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#26352B] font-serif">Executive Business Intelligence</h2>
          <p className="text-xs text-[#778176]">
            Real-time performance analytics, revenue trajectories, and inventory velocity
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Preset Period Buttons */}
          <div className="flex items-center gap-1 p-1 bg-[#F6F5EF] rounded-xl border border-[#E6E7DD]">
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All Time' },
              { id: 'custom', label: 'Custom' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === p.id
                    ? 'bg-white text-[#244B37] shadow-xs'
                    : 'text-[#778176] hover:text-[#26352B]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadAnalytics(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-[#E6E7DD] text-[#778176] hover:text-[#26352B] hover:bg-[#F6F5EF] transition-colors"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#244B37]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom Date Inputs if selected */}
      {period === 'custom' && (
        <form
          onSubmit={handleApplyCustomDate}
          className="bg-white p-3.5 rounded-xl border border-[#E6E7DD] flex flex-wrap items-center gap-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#26352B]">From:</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#E6E7DD] text-xs text-[#26352B]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#26352B]">To:</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#E6E7DD] text-xs text-[#26352B]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-[#244B37] text-white text-xs font-semibold hover:bg-[#1b3829]"
          >
            Apply Range
          </button>
        </form>
      )}

      {/* Primary KPI Grid */}
      {isLoading ? (
        <LoadingSpinner text="Computing store metrics and revenue breakdown..." />
      ) : !data ? (
        <EmptyState
          icon={TrendingUp}
          title="No Analytics Available"
          description="Unable to compute analytics at this time."
          action={{ label: 'Retry', onClick: () => loadAnalytics(true) }}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue */}
            <div className="bg-white rounded-2xl p-5 border border-[#E6E7DD] shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#778176] uppercase tracking-wider">
                  Total Revenue
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#26352B] mt-2 font-serif">
                ₹{Number(data.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#496B45]">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Gross sales in selected window</span>
              </div>
            </div>

            {/* Total Orders */}
            <div className="bg-white rounded-2xl p-5 border border-[#E6E7DD] shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#778176] uppercase tracking-wider">
                  Orders Completed
                </span>
                <div className="w-9 h-9 rounded-xl bg-[#F6F5EF] text-[#244B37] flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#26352B] mt-2 font-serif">
                {data.total_orders}
              </p>
              <p className="mt-2 text-[11px] text-[#778176]">
                Confirmed & fulfilled transactions
              </p>
            </div>

            {/* Average Order Value */}
            <div className="bg-white rounded-2xl p-5 border border-[#E6E7DD] shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#778176] uppercase tracking-wider">
                  Average Order (AOV)
                </span>
                <div className="w-9 h-9 rounded-xl bg-[#F6F5EF] text-[#496B45] flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#26352B] mt-2 font-serif">
                ₹{Number(data.average_order_value || 0).toFixed(0)}
              </p>
              <p className="mt-2 text-[11px] text-[#778176]">
                Average spend per organic cart
              </p>
            </div>

            {/* Repeat Customer Rate */}
            <div className="bg-white rounded-2xl p-5 border border-[#E6E7DD] shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#778176] uppercase tracking-wider">
                  Customer Loyalty
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#26352B] mt-2 font-serif">
                {Number(data.repeat_customer_rate || 0).toFixed(1)}%
              </p>
              <p className="mt-2 text-[11px] text-[#778176]">
                Repeat buyer retention rate
              </p>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <div className="border-b border-[#E6E7DD] flex items-center gap-6">
            {[
              { id: 'overview', label: 'Sales Velocity & Trend', icon: BarChart3 },
              { id: 'categories', label: 'Category Performance', icon: Layers },
              { id: 'products', label: 'Top & Slow Moving SKUs', icon: Award },
              { id: 'inventory', label: 'Valuation & Assets', icon: Package },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-[#244B37] text-[#244B37]'
                      : 'border-transparent text-[#778176] hover:text-[#26352B]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Sales Velocity & Trend */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-[#E6E7DD] shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-[#26352B]">Daily Revenue Trajectory</h3>
                    <p className="text-xs text-[#778176]">
                      Aggregated sales volume and transaction count across selected period
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5 text-[#244B37] font-semibold">
                      <span className="w-3 h-3 rounded bg-[#244B37]" />
                      Revenue (₹)
                    </span>
                    <span className="flex items-center gap-1.5 text-[#8A9B69] font-semibold">
                      <span className="w-3 h-3 rounded bg-[#8A9B69]" />
                      Order Count
                    </span>
                  </div>
                </div>

                {data.sales_trend.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#778176]">
                    No completed order records found within the selected date timeframe.
                  </div>
                ) : (
                  <div className="h-64 flex items-end gap-2 pt-6 pb-2 border-b border-[#E6E7DD] overflow-x-auto">
                    {data.sales_trend.map((point, idx) => {
                      const heightPercent = Math.max(
                        Math.round((point.revenue / maxTrendRevenue) * 100),
                        point.orders > 0 ? 8 : 2
                      );
                      return (
                        <div
                          key={idx}
                          className="flex-1 min-w-[32px] flex flex-col items-center gap-2 group relative"
                        >
                          {/* Hover Tooltip */}
                          <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center bg-[#26352B] text-white text-[10px] p-2 rounded-lg shadow-lg z-20 whitespace-nowrap pointer-events-none">
                            <span className="font-semibold">{point.date}</span>
                            <span className="text-emerald-300">₹{point.revenue.toLocaleString()}</span>
                            <span className="text-slate-300">{point.orders} orders</span>
                          </div>

                          {/* Bar */}
                          <div className="w-full flex flex-col items-center justify-end h-48 bg-[#F6F5EF] rounded-t-lg overflow-hidden">
                            <div
                              style={{ height: `${heightPercent}%` }}
                              className="w-full bg-[#244B37] group-hover:bg-[#496B45] transition-all rounded-t"
                            />
                          </div>

                          {/* X-axis Label */}
                          <span className="text-[10px] text-[#778176] truncate max-w-[42px] font-mono">
                            {point.date.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Category Performance */}
          {activeTab === 'categories' && (
            <div className="bg-white rounded-2xl p-6 border border-[#E6E7DD] shadow-sm space-y-5">
              <div>
                <h3 className="text-sm font-bold text-[#26352B]">Revenue Contribution by Organic Category</h3>
                <p className="text-xs text-[#778176]">
                  Sales distribution across traditional oils, honey, grains, and cold-pressed staples
                </p>
              </div>

              {(!data.category_breakdown || data.category_breakdown.length === 0) ? (
                <div className="py-8 text-center text-xs text-[#778176]">
                  No category sales recorded in this period.
                </div>
              ) : (
                <div className="space-y-4">
                  {data.category_breakdown.map((cat, i) => (
                    <div key={i} className="p-3.5 rounded-xl border border-[#E6E7DD] bg-[#FAF9F5]">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#26352B]">{cat.category_name}</span>
                          <span className="text-[11px] text-[#778176]">({cat.units_sold} units sold)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[#244B37] font-mono">
                            ₹{Number(cat.revenue).toLocaleString('en-IN')}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#244B37]/10 text-[#244B37]">
                            {cat.percentage_share}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-2 rounded-full bg-[#E6E7DD] overflow-hidden">
                        <div
                          style={{ width: `${Math.min(cat.percentage_share, 100)}%` }}
                          className="h-full bg-[#244B37] rounded-full transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Top & Slow Moving SKUs */}
          {activeTab === 'products' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Sellers */}
              <div className="bg-white rounded-2xl p-5 border border-[#E6E7DD] shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E6E7DD]">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#26352B]">Fastest Moving Harvest Products</h3>
                    <p className="text-xs text-[#778176]">Top performing organic SKUs by volume and revenue</p>
                  </div>
                </div>

                {(!data.top_selling_products || data.top_selling_products.length === 0) ? (
                  <p className="text-xs text-[#778176] py-6 text-center">No sales data recorded.</p>
                ) : (
                  <div className="divide-y divide-[#E6E7DD]">
                    {data.top_selling_products.map((p, idx) => (
                      <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-[#F6F5EF] text-[#244B37] font-bold text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-[#26352B] truncate">{p.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-[#244B37]">₹{p.revenue.toLocaleString('en-IN')}</p>
                          <p className="text-[11px] text-[#778176]">{p.units_sold} units sold</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Slow Movers */}
              <div className="bg-white rounded-2xl p-5 border border-[#E6E7DD] shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E6E7DD]">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#26352B]">Low Velocity Stock / Attention Needed</h3>
                    <p className="text-xs text-[#778176]">High shelf stock with 0 or low order frequency</p>
                  </div>
                </div>

                {(!data.slow_moving_products || data.slow_moving_products.length === 0) ? (
                  <p className="text-xs text-[#778176] py-6 text-center">Healthy stock rotation across all SKUs.</p>
                ) : (
                  <div className="divide-y divide-[#E6E7DD]">
                    {data.slow_moving_products.map((p, idx) => (
                      <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold text-[#26352B] truncate">{p.name}</p>
                          <p className="text-[11px] text-[#778176]">{p.category_name}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800">
                            {p.stock} units on shelf
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Inventory Valuation by Category */}
          {activeTab === 'inventory' && (
            <div className="bg-white rounded-2xl p-6 border border-[#E6E7DD] shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#26352B]">Warehouse Inventory Asset Valuation</h3>
                <p className="text-xs text-[#778176]">
                  Retail capital valuation of organic products stored across inventory categories
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E6E7DD] text-[#778176] uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4 font-semibold">Category</th>
                      <th className="py-3 px-4 font-semibold text-center">Active SKUs</th>
                      <th className="py-3 px-4 font-semibold text-center">Total Units</th>
                      <th className="py-3 px-4 font-semibold text-right">Retail Asset Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E7DD]">
                    {(data.inventory_by_category || []).map((row, i) => (
                      <tr key={i} className="hover:bg-[#F6F5EF]/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-[#26352B]">{row.category_name}</td>
                        <td className="py-3 px-4 text-center font-mono text-[#778176]">{row.sku_count}</td>
                        <td className="py-3 px-4 text-center font-mono text-[#26352B] font-semibold">{row.total_units}</td>
                        <td className="py-3 px-4 text-right font-bold text-[#244B37] font-mono">
                          ₹{Number(row.retail_valuation).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
