import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  ShoppingBag,
  Package,
  Layers,
  Users,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const ReportsPage: React.FC = () => {
  const [period, setPeriod] = useState<string>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const { showSuccess, showError } = useToast();

  const getDateRange = () => {
    const now = new Date();
    let date_from: string | undefined = undefined;
    let date_to: string | undefined = now.toISOString().slice(0, 10);

    if (period === 'today') {
      date_from = now.toISOString().slice(0, 10);
    } else if (period === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      date_from = d.toISOString().slice(0, 10);
    } else if (period === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      date_from = d.toISOString().slice(0, 10);
    } else if (period === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      date_from = d.toISOString().slice(0, 10);
    } else if (period === 'custom') {
      date_from = customFrom || undefined;
      date_to = customTo || undefined;
    }

    return { date_from, date_to };
  };

  const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent = [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const val = cell === null || cell === undefined ? '' : String(cell);
            return `"${val.replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1. Export Orders Master Report
  const handleExportOrders = async () => {
    setIsExporting('orders');
    try {
      const { date_from, date_to } = getDateRange();
      const orders = await api.getAllOrders({
        date_from,
        date_to,
        limit: 500,
      });

      if (!orders || orders.length === 0) {
        showError('No orders found for the selected date range.');
        return;
      }

      const headers = [
        'Order ID',
        'Order Number',
        'Date',
        'Customer Name',
        'Customer Phone',
        'Customer Email',
        'Delivery Address',
        'Pincode',
        'Delivery Slot',
        'Payment Method',
        'Payment Status',
        'Subtotal (₹)',
        'Delivery Fee (₹)',
        'Discount (₹)',
        'Total Amount (₹)',
        'Order Status',
      ];

      const rows = orders.map((o) => {
        let addressStr = '';
        let pincodeStr = '';
        try {
          if (o.delivery_address_json) {
            const parsed = JSON.parse(o.delivery_address_json);
            addressStr = parsed.formatted_address || `${parsed.house_number || ''} ${parsed.street || ''}, ${parsed.city || ''}`.trim();
            pincodeStr = parsed.postal_code || '';
          }
        } catch {}

        return [
          o.id,
          o.order_number,
          o.created_at ? new Date(o.created_at).toLocaleString() : '',
          o.customer_name || 'Customer',
          o.phone || '',
          o.customer_id ? `Customer #${o.customer_id}` : '',
          addressStr,
          pincodeStr,
          o.delivery_slot || 'Standard',
          o.payment_method || 'cod',
          o.payment_status || 'pending',
          o.subtotal || 0,
          o.delivery_fee || 0,
          o.discount || 0,
          o.total_amount || 0,
          o.status,
        ];
      });

      const dateTag = new Date().toISOString().slice(0, 10);
      downloadCSV(`sri-adithya-orders-${period}-${dateTag}.csv`, headers, rows);
      showSuccess(`Exported ${orders.length} orders successfully.`, 'Export Complete');
    } catch (err: any) {
      showError(err.message || 'Failed to export orders.');
    } finally {
      setIsExporting(null);
    }
  };

  // 2. Export Products Catalogue Report
  const handleExportProducts = async () => {
    setIsExporting('products');
    try {
      const products = await api.getProducts({ limit: 500 });
      if (!products || products.length === 0) {
        showError('No products found to export.');
        return;
      }

      const headers = [
        'Product ID',
        'Product Name',
        'Slug',
        'Category ID',
        'Category Name',
        'Unit / Weight',
        'Regular Price (₹)',
        'Sale Price (₹)',
        'Current Stock',
        'Low Stock Threshold',
        'Active Status',
        'Featured',
        'Variants Count',
      ];

      const rows = products.map((p) => {
        const defaultVariant = p.variants?.[0];
        const totalStock = p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) ?? 0;
        return [
          p.id,
          p.name,
          p.slug,
          p.category_id,
          p.brand || 'Sri Adithya Organics',
          defaultVariant?.unit || 'Standard',
          p.mrp || p.min_price || 0,
          p.min_price || 0,
          totalStock,
          10,
          p.is_active ? 'Active' : 'Inactive',
          p.is_featured ? 'Yes' : 'No',
          p.variants ? p.variants.length : 0,
        ];
      });

      const dateTag = new Date().toISOString().slice(0, 10);
      downloadCSV(`sri-adithya-product-catalog-${dateTag}.csv`, headers, rows);
      showSuccess(`Exported ${products.length} organic products.`, 'Export Complete');
    } catch (err: any) {
      showError(err.message || 'Failed to export products.');
    } finally {
      setIsExporting(null);
    }
  };

  // 3. Export Inventory Valuation Report
  const handleExportInventory = async () => {
    setIsExporting('inventory');
    try {
      const items = await api.getInventory({});
      if (!items || items.length === 0) {
        showError('No inventory items found.');
        return;
      }

      const headers = [
        'Item ID',
        'Product Name',
        'Category',
        'Unit Price (₹)',
        'Units In Stock',
        'Low Stock Threshold',
        'Retail Valuation (₹)',
        'Inventory Status',
      ];

      const rows = items.map((item) => {
        const stock = item.stock ?? 0;
        const price = item.price ?? 0;
        const val = stock * price;
        const status = stock === 0 ? 'Out of Stock' : item.is_low_stock ? 'Low Stock' : 'Optimal';
        return [
          item.id,
          item.name,
          item.category_name || 'General',
          price,
          stock,
          10,
          val,
          status,
        ];
      });

      const dateTag = new Date().toISOString().slice(0, 10);
      downloadCSV(`sri-adithya-inventory-valuation-${dateTag}.csv`, headers, rows);
      showSuccess(`Exported inventory valuation for ${items.length} SKUs.`, 'Export Complete');
    } catch (err: any) {
      showError(err.message || 'Failed to export inventory report.');
    } finally {
      setIsExporting(null);
    }
  };

  // 4. Export Customers Directory Report
  const handleExportCustomers = async () => {
    setIsExporting('customers');
    try {
      const customers = await api.getCustomers();
      if (!customers || customers.length === 0) {
        showError('No customer records found.');
        return;
      }

      const headers = [
        'Customer ID',
        'Customer Name',
        'Phone Number',
        'Email Address',
        'Total Orders',
        'Lifetime Spend (₹)',
        'Average Order Value (₹)',
        'Last Order Date',
        'Registered Date',
      ];

      const rows = customers.map((c) => {
        const aov = c.total_orders > 0 ? (c.total_spend / c.total_orders).toFixed(0) : 0;
        return [
          c.id,
          c.name,
          c.phone || '',
          c.email || '',
          c.total_orders,
          c.total_spend,
          aov,
          c.last_order_date || 'N/A',
          c.created_at ? new Date(c.created_at).toLocaleDateString() : '',
        ];
      });

      const dateTag = new Date().toISOString().slice(0, 10);
      downloadCSV(`sri-adithya-customers-${dateTag}.csv`, headers, rows);
      showSuccess(`Exported ${customers.length} customer records.`, 'Export Complete');
    } catch (err: any) {
      showError(err.message || 'Failed to export customer directory.');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#E6E7DD] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#26352B] font-serif">Data Export & Business Reporting</h2>
          <p className="text-xs text-[#778176]">
            Generate clean CSV ledgers directly from live Cloudflare D1 production databases
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F6F5EF] rounded-xl border border-[#E6E7DD]">
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
      </div>

      {/* Custom Date Form */}
      {period === 'custom' && (
        <div className="bg-white p-4 rounded-xl border border-[#E6E7DD] flex flex-wrap items-center gap-3">
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
        </div>
      )}

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Report 1: Orders Ledger */}
        <div className="bg-white rounded-2xl p-6 border border-[#E6E7DD] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-4">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#26352B]">Orders Fulfillment & Sales Ledger</h3>
            <p className="text-xs text-[#778176] mt-1.5 leading-relaxed">
              Complete transaction records including order numbers, customer delivery addresses, time slots, payment statuses, discounts, and order amounts.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F6F5EF] text-[#778176] border border-[#E6E7DD]">
                order_id
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F6F5EF] text-[#778176] border border-[#E6E7DD]">
                customer_phone
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F6F5EF] text-[#778176] border border-[#E6E7DD]">
                delivery_slot
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F6F5EF] text-[#778176] border border-[#E6E7DD]">
                total_amount
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E6E7DD] flex items-center justify-between">
            <span className="text-[11px] text-[#778176]">Format: UTF-8 CSV</span>
            <button
              onClick={handleExportOrders}
              disabled={isExporting === 'orders'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#244B37] hover:bg-[#1b3829] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              {isExporting === 'orders' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Export Orders</span>
            </button>
          </div>
        </div>

        {/* Report 2: Product Catalog & Pricing */}
        <div className="bg-white rounded-2xl p-6 border border-[#E6E7DD] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#F6F5EF] text-[#244B37] flex items-center justify-center mb-4">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#26352B]">Product Catalog & Pricing Matrix</h3>
            <p className="text-xs text-[#778176] mt-1.5 leading-relaxed">
              Full inventory database of organic wood-pressed oils, honey, grains, sale pricing, package units, and variant options.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F6F5EF] text-[#778176] border border-[#E6E7DD]">
                sku_name
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F6F5EF] text-[#778176] border border-[#E6E7DD]">
                category
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F6F5EF] text-[#778176] border border-[#E6E7DD]">
                sale_price
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F6F5EF] text-[#778176] border border-[#E6E7DD]">
                unit_weight
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E6E7DD] flex items-center justify-between">
            <span className="text-[11px] text-[#778176]">Format: UTF-8 CSV</span>
            <button
              onClick={handleExportProducts}
              disabled={isExporting === 'products'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#244B37] hover:bg-[#1b3829] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              {isExporting === 'products' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Export Catalog</span>
            </button>
          </div>
        </div>

        {/* Report 3: Inventory Valuation */}
        <div className="bg-white rounded-2xl p-6 border border-[#E6E7DD] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#26352B]">Warehouse Inventory Asset Valuation</h3>
            <p className="text-xs text-[#778176] mt-1.5 leading-relaxed">
              Stock balance audit with per-item unit price, current on-shelf quantity, total retail asset valuation, and low-stock alert thresholds.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F6F5EF] text-[#778176] border border-[#E6E7DD]">
                current_stock
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F6F5EF] text-[#778176] border border-[#E6E7DD]">
                unit_price
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F6F5EF] text-[#778176] border border-[#E6E7DD]">
                asset_valuation
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F6F5EF] text-[#778176] border border-[#E6E7DD]">
                stock_status
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E6E7DD] flex items-center justify-between">
            <span className="text-[11px] text-[#778176]">Format: UTF-8 CSV</span>
            <button
              onClick={handleExportInventory}
              disabled={isExporting === 'inventory'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#244B37] hover:bg-[#1b3829] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              {isExporting === 'inventory' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Export Valuation</span>
            </button>
          </div>
        </div>

        {/* Report 4: Customer Directory */}
        <div className="bg-white rounded-2xl p-6 border border-[#E6E7DD] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#F6F5EF] text-[#496B45] flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#26352B]">Customer Directory & Lifetime Value (LTV)</h3>
            <p className="text-xs text-[#778176] mt-1.5 leading-relaxed">
              Customer contact information, lifetime order counts, total gross spend, and calculated average basket sizes for CRM & WhatsApp marketing.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F6F5EF] text-[#778176] border border-[#E6E7DD]">
                customer_name
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F6F5EF] text-[#778176] border border-[#E6E7DD]">
                phone_number
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F6F5EF] text-[#778176] border border-[#E6E7DD]">
                lifetime_spend
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F6F5EF] text-[#778176] border border-[#E6E7DD]">
                total_orders
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E6E7DD] flex items-center justify-between">
            <span className="text-[11px] text-[#778176]">Format: UTF-8 CSV</span>
            <button
              onClick={handleExportCustomers}
              disabled={isExporting === 'customers'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#244B37] hover:bg-[#1b3829] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              {isExporting === 'customers' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Export Customers</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
