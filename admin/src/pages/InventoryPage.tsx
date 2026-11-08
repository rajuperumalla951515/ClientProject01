import React, { useEffect, useState, useMemo } from 'react';
import {
  Boxes,
  AlertTriangle,
  CheckCircle2,
  PackageX,
  Search,
  SlidersHorizontal,
  RefreshCw,
  History,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  IndianRupee,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { InventoryItem, InventoryLog } from '../types';
import { StatCard } from '../components/ui/StatCard';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';

type StockStatusFilter = 'all' | 'healthy' | 'low' | 'out';

export const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'logs'>('inventory');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatusFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Stock Adjustment Modal
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustMode, setAdjustMode] = useState<'add' | 'deduct' | 'set'>('add');
  const [adjustValue, setAdjustValue] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState('Farm Batch Restock (Harvest arrival)');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const { showSuccess, showError } = useToast();

  const loadData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [invData, logData] = await Promise.all([
        api.getInventory(),
        api.getInventoryLogs(150, 0),
      ]);
      setInventory(invData);
      setLogs(logData);
      if (isManual) {
        showSuccess('Inventory levels and audit logs synchronized.', 'D1 Synchronized');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to load inventory data from D1.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Metrics
  const metrics = useMemo(() => {
    const totalSkus = inventory.length;
    const totalUnits = inventory.reduce((sum, item) => sum + (item.stock || 0), 0);
    const totalValuation = inventory.reduce((sum, item) => sum + (item.stock || 0) * (item.price || 0), 0);
    const healthyCount = inventory.filter((i) => i.stock >= 10).length;
    const lowStockCount = inventory.filter((i) => i.stock > 0 && i.stock < 10).length;
    const outOfStockCount = inventory.filter((i) => i.stock <= 0).length;

    return {
      totalSkus,
      totalUnits,
      totalValuation,
      healthyCount,
      lowStockCount,
      outOfStockCount,
    };
  }, [inventory]);

  // Unique categories
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach((i) => {
      if (i.category_name) set.add(i.category_name);
    });
    return Array.from(set);
  }, [inventory]);

  // Filtered Inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        item.name.toLowerCase().includes(q) ||
        item.category_name?.toLowerCase().includes(q) ||
        String(item.id) === q;

      let matchesStatus = true;
      if (statusFilter === 'healthy') matchesStatus = item.stock >= 10;
      if (statusFilter === 'low') matchesStatus = item.stock > 0 && item.stock < 10;
      if (statusFilter === 'out') matchesStatus = item.stock <= 0;

      const matchesCat =
        selectedCategory === 'all' || item.category_name === selectedCategory;

      return matchesSearch && matchesStatus && matchesCat;
    });
  }, [inventory, searchQuery, statusFilter, selectedCategory]);

  // Paginated Inventory
  const paginatedInventory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInventory.slice(start, start + pageSize);
  }, [filteredInventory, currentPage, pageSize]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    if (!logSearchQuery.trim()) return logs;
    const q = logSearchQuery.toLowerCase().trim();
    return logs.filter(
      (l) =>
        l.product_name?.toLowerCase().includes(q) ||
        l.reason?.toLowerCase().includes(q) ||
        String(l.product_id) === q
    );
  }, [logs, logSearchQuery]);

  const openAdjustModal = (item: InventoryItem) => {
    setAdjustItem(item);
    setAdjustMode('add');
    setAdjustValue(10);
    setAdjustReason('Farm Batch Restock (Harvest arrival)');
    setAdjustNotes('');
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem) return;

    if (adjustValue <= 0) {
      showError('Please enter a quantity greater than zero.');
      return;
    }

    let payload: any = {
      product_id: adjustItem.id,
      reason: adjustReason,
      notes: adjustNotes.trim() || undefined,
    };

    if (adjustMode === 'add') {
      payload.delta = adjustValue;
    } else if (adjustMode === 'deduct') {
      if (adjustItem.stock - adjustValue < 0) {
        showError('Deduction would result in negative stock. Please adjust quantity.');
        return;
      }
      payload.delta = -adjustValue;
    } else {
      payload.new_stock = adjustValue;
    }

    setIsAdjusting(true);
    try {
      await api.adjustInventory(payload);
      showSuccess(
        `Stock updated for "${adjustItem.name}".`,
        'Inventory Saved'
      );
      setAdjustItem(null);
      loadData();
    } catch (err: any) {
      showError(err.message || 'Failed to adjust stock in D1.');
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleExportInventoryCSV = () => {
    if (inventory.length === 0) return;

    const headers = [
      'SKU ID',
      'Product Name',
      'Category',
      'Unit',
      'Stock Quantity',
      'Unit Price (INR)',
      'Total Valuation (INR)',
      'Status'
    ];

    const rows = inventory.map((i) => {
      const val = (i.stock || 0) * (i.price || 0);
      const st = i.stock <= 0 ? 'Out of Stock' : i.stock < 10 ? 'Low Stock' : 'Healthy';
      return [
        i.id,
        `"${i.name.replace(/"/g, '""')}"`,
        `"${i.category_name || 'Organic Produce'}"`,
        `"${i.unit || 'Standard'}"`,
        i.stock,
        i.price,
        val,
        st
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sri_adithya_inventory_valuation_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess(`Exported inventory valuation report for ${inventory.length} SKUs.`, 'Export Downloaded');
  };

  if (isLoading) {
    return <LoadingSpinner text="Connecting to D1 and auditing warehouse inventory levels..." size="lg" />;
  }

  // Pre-calculate target stock for modal preview
  let previewStock = adjustItem?.stock || 0;
  if (adjustItem) {
    if (adjustMode === 'add') previewStock = adjustItem.stock + adjustValue;
    if (adjustMode === 'deduct') previewStock = Math.max(0, adjustItem.stock - adjustValue);
    if (adjustMode === 'set') previewStock = Math.max(0, adjustValue);
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E6E7DD] shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[#26352B]">Inventory Control Center</h2>
            <span className="px-2 py-0.5 rounded-full bg-[#E2E8D7] text-[#244B37] text-[11px] font-bold">
              {metrics.totalSkus} SKUs Monitored
            </span>
          </div>
          <p className="text-xs text-[#778176] mt-0.5">
            Real-time warehouse stock tracking, audit movement logs, and inventory valuation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tab Switcher */}
          <div className="flex items-center bg-[#FAF9F5] p-1 rounded-xl border border-[#E6E7DD]">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'inventory'
                  ? 'bg-[#244B37] text-white shadow-xs'
                  : 'text-[#778176] hover:text-[#26352B]'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Live Stock</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'logs'
                  ? 'bg-[#244B37] text-white shadow-xs'
                  : 'text-[#778176] hover:text-[#26352B]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Trail</span>
            </button>
          </div>

          <button
            onClick={handleExportInventoryCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E6E7DD] bg-white hover:bg-[#F6F5EF] text-[#26352B] text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-[#496B45]" />
            <span>Valuation CSV</span>
          </button>

          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-[#E6E7DD] bg-white hover:bg-[#F6F5EF] text-[#26352B] transition-colors disabled:opacity-50"
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 text-[#496B45] ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Inventory Valuation"
          value={`₹${metrics.totalValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          subtitle="Total retail value of active stock"
          icon={IndianRupee}
          colorScheme="forest"
        />

        <StatCard
          title="Total Stock Units"
          value={metrics.totalUnits.toLocaleString('en-IN')}
          subtitle={`Across ${metrics.totalSkus} organic SKUs`}
          icon={Boxes}
          colorScheme="sage"
        />

        <StatCard
          title="Low Stock Warning"
          value={metrics.lowStockCount}
          subtitle="SKUs with under 10 units"
          icon={AlertTriangle}
          colorScheme="amber"
          onClick={() => {
            setStatusFilter('low');
            setActiveTab('inventory');
          }}
        />

        <StatCard
          title="Out of Stock"
          value={metrics.outOfStockCount}
          subtitle="SKUs needing farm replenishment"
          icon={PackageX}
          colorScheme="rose"
          onClick={() => {
            setStatusFilter('out');
            setActiveTab('inventory');
          }}
        />
      </div>

      {/* MAIN TAB 1: LIVE INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#E6E7DD] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 text-[#778176] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search inventory by product, category or SKU..."
                className="w-full pl-10 pr-4 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs font-medium text-[#26352B] placeholder-[#778176] focus:outline-none focus:border-[#496B45] focus:bg-white transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs font-medium text-[#26352B] focus:outline-none focus:border-[#496B45]"
              >
                <option value="all">All Categories</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Status Chips */}
              <div className="flex items-center bg-[#FAF9F5] p-1 rounded-xl border border-[#E6E7DD] text-xs">
                {(['all', 'healthy', 'low', 'out'] as StockStatusFilter[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setStatusFilter(st);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      statusFilter === st
                        ? 'bg-[#244B37] text-white shadow-2xs'
                        : 'text-[#778176] hover:text-[#26352B]'
                    }`}
                  >
                    {st === 'all' && 'All'}
                    {st === 'healthy' && 'Healthy'}
                    {st === 'low' && 'Low'}
                    {st === 'out' && 'Out'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-2xl border border-[#E6E7DD] shadow-card overflow-hidden">
            {paginatedInventory.length === 0 ? (
              <EmptyState
                icon={Boxes}
                title="No inventory records matched your filter"
                description="Try clearing search filters to view your complete warehouse stock."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAF9F5] border-b border-[#E6E7DD] text-[11px] font-bold text-[#778176] uppercase tracking-wider">
                      <th className="p-4">Product & Category</th>
                      <th className="p-4">Unit / Pack</th>
                      <th className="p-4">Unit Price</th>
                      <th className="p-4">Total Value</th>
                      <th className="p-4">Stock Level</th>
                      <th className="p-4">Status Indicator</th>
                      <th className="p-4 text-right">Adjust Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E7DD] text-xs">
                    {paginatedInventory.map((item) => {
                      const itemValuation = (item.stock || 0) * (item.price || 0);
                      const isLow = item.stock > 0 && item.stock < 10;
                      const isOut = item.stock <= 0;

                      return (
                        <tr key={item.id} className="hover:bg-[#FAF9F5] transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#F6F5EF] border border-[#E6E7DD] overflow-hidden shrink-0">
                                {item.image_url ? (
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <Boxes className="w-5 h-5 text-[#778176] m-auto mt-2.5" />
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-[#26352B] line-clamp-1">{item.name}</p>
                                <p className="text-[11px] text-[#778176]">
                                  {item.category_name} • SKU #{item.id}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="p-4 font-semibold text-[#26352B]">{item.unit}</td>

                          <td className="p-4 font-bold text-[#26352B]">
                            ₹{item.price.toLocaleString('en-IN')}
                          </td>

                          <td className="p-4 font-bold text-[#496B45]">
                            ₹{itemValuation.toLocaleString('en-IN')}
                          </td>

                          <td className="p-4">
                            <span className="font-bold text-sm text-[#26352B]">{item.stock}</span>
                            <span className="text-[11px] text-[#778176] ml-1">units</span>
                          </td>

                          <td className="p-4">
                            {isOut ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                <span>Out of Stock</span>
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span>Low Stock (&lt; 10)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EBF3E8] text-[#2E6038] border border-[#A8C9A0]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Healthy Stock</span>
                              </span>
                            )}
                          </td>

                          <td className="p-4 text-right">
                            <button
                              onClick={() => openAdjustModal(item)}
                              className="px-3 py-1.5 rounded-xl border border-[#E6E7DD] bg-white hover:bg-[#F6F5EF] hover:border-[#8A9B69] text-[#244B37] text-xs font-bold transition-all shadow-2xs"
                            >
                              Adjust Stock
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
        </div>
      )}

      {/* MAIN TAB 2: AUDIT TRAIL LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Log Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#E6E7DD] shadow-card flex items-center justify-between gap-4">
            <div className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 text-[#778176] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                placeholder="Search audit trail by product name or reason..."
                className="w-full pl-10 pr-4 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs font-medium text-[#26352B] placeholder-[#778176] focus:outline-none focus:border-[#496B45]"
              />
            </div>
            <span className="text-xs font-semibold text-[#778176]">
              {filteredLogs.length} Stock Audit Records Logged in D1
            </span>
          </div>

          {/* Audit Log Table */}
          <div className="bg-white rounded-2xl border border-[#E6E7DD] shadow-card overflow-hidden">
            {filteredLogs.length === 0 ? (
              <EmptyState
                icon={History}
                title="No stock movements recorded"
                description="Adjust stock levels in Live Stock to automatically record immutable audit log entries."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAF9F5] border-b border-[#E6E7DD] text-[11px] font-bold text-[#778176] uppercase tracking-wider">
                      <th className="p-4">Date & Time</th>
                      <th className="p-4">Product Name</th>
                      <th className="p-4">Movement Delta</th>
                      <th className="p-4">Previous Stock</th>
                      <th className="p-4">New Stock</th>
                      <th className="p-4">Reason & Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E7DD] text-xs">
                    {filteredLogs.map((log) => {
                      const isPositive = log.changed_stock > 0;
                      return (
                        <tr key={log.log_id} className="hover:bg-[#FAF9F5] transition-colors">
                          <td className="p-4 text-[#778176] font-mono text-[11px]">
                            {log.created_at ? log.created_at.replace('T', ' ').slice(0, 19) : '—'}
                          </td>

                          <td className="p-4 font-bold text-[#26352B]">
                            {log.product_name || `Product #${log.product_id}`}
                          </td>

                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-xs ${
                                isPositive
                                  ? 'bg-[#E2E8D7] text-[#244B37]'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isPositive ? (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowDownRight className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {isPositive ? `+${log.changed_stock}` : log.changed_stock} units
                              </span>
                            </span>
                          </td>

                          <td className="p-4 text-[#778176] font-semibold">{log.previous_stock}</td>

                          <td className="p-4 font-bold text-[#26352B]">{log.new_stock} units</td>

                          <td className="p-4 font-medium text-[#26352B]">
                            {log.reason || 'Manual Adjustment'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustItem && (
        <Modal
          isOpen={!!adjustItem}
          onClose={() => setAdjustItem(null)}
          title={`Adjust Stock — ${adjustItem.name}`}
          subtitle={`Current warehouse stock: ${adjustItem.stock} units (${adjustItem.unit})`}
          maxWidth="md"
        >
          <form onSubmit={handleAdjustSubmit} className="space-y-4">
            {/* Mode selection buttons */}
            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-2 uppercase tracking-wider">
                Adjustment Action
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustMode('add')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    adjustMode === 'add'
                      ? 'bg-[#244B37] text-white shadow-xs'
                      : 'bg-[#FAF9F5] text-[#778176] border border-[#E6E7DD] hover:text-[#26352B]'
                  }`}
                >
                  + Add Stock
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustMode('deduct')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    adjustMode === 'deduct'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'bg-[#FAF9F5] text-[#778176] border border-[#E6E7DD] hover:text-[#26352B]'
                  }`}
                >
                  - Deduct Stock
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustMode('set')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    adjustMode === 'set'
                      ? 'bg-[#496B45] text-white shadow-xs'
                      : 'bg-[#FAF9F5] text-[#778176] border border-[#E6E7DD] hover:text-[#26352B]'
                  }`}
                >
                  = Exact Count
                </button>
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-1">
                {adjustMode === 'set' ? 'New Total Quantity' : 'Units to Adjust'} *
              </label>
              <input
                type="number"
                min="0"
                required
                value={adjustValue}
                onChange={(e) => setAdjustValue(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-sm font-bold text-[#26352B] focus:outline-none focus:border-[#496B45]"
              />
            </div>

            {/* Real-time Calculation Summary Box */}
            <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD] flex items-center justify-between text-xs">
              <span className="text-[#778176]">Resulting Warehouse Stock:</span>
              <span className="font-bold text-[#244B37] text-sm">
                {previewStock} units
              </span>
            </div>

            {/* Audit Reason Selection */}
            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-1">
                Official Audit Reason *
              </label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs text-[#26352B] focus:outline-none focus:border-[#496B45]"
              >
                <option value="Farm Batch Restock (Harvest arrival)">
                  Farm Batch Restock (Harvest arrival)
                </option>
                <option value="Customer Cancellation Restock">Customer Cancellation Restock</option>
                <option value="Spoilage / Quality Control Removal">
                  Spoilage / Quality Control Removal
                </option>
                <option value="Physical Stock Count Reconciliation">
                  Physical Stock Count Reconciliation
                </option>
                <option value="Damaged / Leaked Oil Container">Damaged / Leaked Oil Container</option>
                <option value="Manual Discrepancy Correction">Manual Discrepancy Correction</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-1">
                Internal Audit Notes (Optional)
              </label>
              <input
                type="text"
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="e.g. Batch #OG-2026-11 received from Mandya farm"
                className="w-full px-3.5 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs text-[#26352B] focus:outline-none focus:border-[#496B45]"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E6E7DD]">
              <button
                type="button"
                onClick={() => setAdjustItem(null)}
                className="px-4 py-2 rounded-xl border border-[#E6E7DD] bg-white hover:bg-[#F6F5EF] text-[#26352B] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAdjusting}
                className="px-5 py-2 rounded-xl bg-[#244B37] hover:bg-[#1C3C2C] text-white text-xs font-bold shadow-xs hover:shadow-card-hover disabled:opacity-50"
              >
                {isAdjusting ? 'Saving to D1...' : 'Confirm Stock Adjustment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
