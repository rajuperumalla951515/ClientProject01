import React, { useEffect, useState, useMemo } from 'react';
import {
  Boxes,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  SlidersHorizontal,
  RefreshCw,
  History,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import { InventoryItem, InventoryLog } from '../types';
import { StatCard } from '../components/ui/StatCard';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';

export const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'logs'>('inventory');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Stock Adjustment Modal
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustMode, setAdjustMode] = useState<'add' | 'deduct' | 'set'>('add');
  const [adjustValue, setAdjustValue] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState('Restock shipment received');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const { showSuccess, showError } = useToast();

  const loadInventory = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [invData, logData] = await Promise.all([
        api.getInventory({ low_stock_only: lowStockFilter }),
        api.getInventoryLogs(100, 0),
      ]);
      setInventory(invData);
      setLogs(logData);
      if (isManual) {
        showSuccess('Inventory levels and audit logs synced.', 'Updated');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to load inventory data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [lowStockFilter]);

  // Compute Summary Metrics
  const metrics = useMemo(() => {
    const total = inventory.length;
    const healthy = inventory.filter((i) => i.stock >= 10).length;
    const low = inventory.filter((i) => i.stock > 0 && i.stock < 10).length;
    const out = inventory.filter((i) => i.stock <= 0).length;
    return { total, healthy, low, out };
  }, [inventory]);

  // Filtered List
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        q === '' ||
        item.name.toLowerCase().includes(q) ||
        item.category_name?.toLowerCase().includes(q) ||
        String(item.id) === q
      );
    });
  }, [inventory, searchQuery]);

  // Paginated List
  const paginatedInventory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInventory.slice(start, start + pageSize);
  }, [filteredInventory, currentPage]);

  const openAdjustModal = (item: InventoryItem) => {
    setAdjustItem(item);
    setAdjustMode('add');
    setAdjustValue(10);
    setAdjustReason('Restock shipment received');
    setAdjustNotes('');
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem) return;
    setIsAdjusting(true);

    try {
      let payload: any = {
        product_id: adjustItem.id,
        reason: adjustReason,
        notes: adjustNotes,
      };

      if (adjustMode === 'set') {
        payload.new_stock = Math.max(0, adjustValue);
      } else if (adjustMode === 'add') {
        payload.delta = Math.abs(adjustValue);
      } else if (adjustMode === 'deduct') {
        payload.delta = -Math.abs(adjustValue);
      }

      const res = await api.adjustInventory(payload);
      showSuccess(
        `Stock for "${adjustItem.name}" updated to ${res.new_stock} units. Audit log recorded.`,
        'Inventory Updated'
      );
      setAdjustItem(null);
      loadInventory();
    } catch (err: any) {
      showError(err.message || 'Failed to adjust inventory.');
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Catalog SKUs"
          value={metrics.total}
          subtitle="Organic items tracked in central inventory"
          icon={Boxes}
          colorScheme="blue"
        />
        <StatCard
          title="Healthy Stock"
          value={metrics.healthy}
          subtitle=">= 10 units available"
          icon={CheckCircle2}
          colorScheme="green"
        />
        <StatCard
          title="Low Stock Warning"
          value={metrics.low}
          subtitle="< 10 units remaining"
          icon={AlertTriangle}
          colorScheme="amber"
          onClick={() => setLowStockFilter(!lowStockFilter)}
        />
        <StatCard
          title="Out of Stock"
          value={metrics.out}
          subtitle="Immediate restocking needed"
          icon={XCircle}
          colorScheme="rose"
        />
      </div>

      {/* Tabs and Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'inventory'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stock Overview
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-brand-700" />
            <span>Audit Trail ({logs.length})</span>
          </button>
        </div>

        {/* Search & Actions */}
        {activeTab === 'inventory' && (
          <div className="flex items-center gap-3 flex-1 sm:justify-end">
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search stock by item name..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 select-none whitespace-nowrap">
              <input
                type="checkbox"
                checked={lowStockFilter}
                onChange={(e) => setLowStockFilter(e.target.checked)}
                className="rounded text-brand-700 focus:ring-brand-600 w-4 h-4"
              />
              <span>Low Stock Only</span>
            </label>

            <button
              onClick={() => loadInventory(true)}
              disabled={isRefreshing}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              title="Refresh inventory"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-700' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {activeTab === 'inventory' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
          {isLoading ? (
            <LoadingSpinner text="Reading real-time inventory..." />
          ) : filteredInventory.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No Inventory Matches"
              description="No items match your search or filter."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Organic Product</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Price / Pack</th>
                    <th className="py-3.5 px-4">Stock Level</th>
                    <th className="py-3.5 px-4">Stock Health</th>
                    <th className="py-3.5 px-4 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedInventory.map((item) => {
                    const isOut = item.stock <= 0;
                    const isLow = item.stock < 10 && !isOut;
                    // Visual stock bar calculation (max 100)
                    const percent = Math.min(100, Math.max(0, (item.stock / 50) * 100));

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100'}
                              alt={item.name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200/80 flex-shrink-0"
                            />
                            <div>
                              <span className="font-bold text-slate-900 block truncate">{item.name}</span>
                              <span className="text-[11px] text-slate-500 font-medium">SKU: SAO-{item.id.toString().padStart(4, '0')}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {item.category_name}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          ₹{item.price.toFixed(2)}
                          <span className="text-[10px] text-slate-400 font-normal block">{item.unit}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-sm font-bold ${
                              isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-900'
                            }`}
                          >
                            {item.stock} units
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="w-32">
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${percent}%` }}
                                className={`h-full rounded-full transition-all ${
                                  isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 mt-0.5 block">
                              {isOut ? 'Out of Stock' : isLow ? 'Reorder Warning' : 'Optimal'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => openAdjustModal(item)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-900 text-xs font-semibold transition-all inline-flex items-center gap-1.5"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-brand-700" />
                            <span>Adjust Stock</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalItems={filteredInventory.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      ) : (
        /* Inventory Logs Audit Trail Table */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Inventory Audit Logs</h3>
              <p className="text-xs text-slate-500">Authoritative audit ledger of all stock mutations</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>Synced with Central Database</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Log #</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Previous Stock</th>
                  <th className="py-3 px-4">Change</th>
                  <th className="py-3 px-4">New Stock</th>
                  <th className="py-3 px-4">Reason / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length > 0 ? (
                  logs.map((log) => {
                    const isPositive = log.changed_stock > 0;
                    return (
                      <tr key={log.log_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">#{log.log_id}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : 'Recent'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{log.product_name}</td>
                        <td className="py-3 px-4 text-slate-600">{log.previous_stock}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded-full ${
                              isPositive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {isPositive ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {isPositive ? `+${log.changed_stock}` : log.changed_stock}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{log.new_stock}</td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{log.reason}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No inventory audit records recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustItem && (
        <Modal
          isOpen={!!adjustItem}
          onClose={() => setAdjustItem(null)}
          title={`Adjust Stock: ${adjustItem.name}`}
          subtitle={`Current stock in database: ${adjustItem.stock} units`}
          maxWidth="md"
        >
          <form onSubmit={handleAdjustSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Adjustment Action
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustMode('add')}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                    adjustMode === 'add'
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  + Add Stock
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustMode('deduct')}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                    adjustMode === 'deduct'
                      ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  - Deduct Stock
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustMode('set')}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                    adjustMode === 'set'
                      ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  = Set Exact Stock
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {adjustMode === 'add' && 'Quantity to Add (Units) *'}
                {adjustMode === 'deduct' && 'Quantity to Deduct (Units) *'}
                {adjustMode === 'set' && 'New Total Stock (Units) *'}
              </label>
              <input
                type="number"
                min="0"
                required
                value={adjustValue}
                onChange={(e) => setAdjustValue(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Resulting stock after adjustment:{' '}
                <strong className="text-slate-900">
                  {adjustMode === 'add'
                    ? adjustItem.stock + adjustValue
                    : adjustMode === 'deduct'
                    ? Math.max(0, adjustItem.stock - adjustValue)
                    : adjustValue}{' '}
                  units
                </strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Adjustment *
              </label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="Restock shipment received">Restock shipment received</option>
                <option value="Physical count audit correction">Physical count audit correction</option>
                <option value="Damaged / expired produce write-off">Damaged / expired produce write-off</option>
                <option value="Returned customer order">Returned customer order</option>
                <option value="Internal farm reallocation">Internal farm reallocation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Audit Notes / Reference (Optional)
              </label>
              <input
                type="text"
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="e.g. Shipment invoice #4928, mill dispatch batch"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdjustItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAdjusting}
                className="px-5 py-2 rounded-xl bg-brand-800 hover:bg-brand-900 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                {isAdjusting ? 'Recording...' : 'Save & Record Audit'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
