import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Eye,
  MapPin,
  MessageSquare,
  XCircle,
  RefreshCw,
  ExternalLink,
  Calendar,
  CheckCircle,
  Clock,
  Truck,
  PackageCheck,
  AlertCircle,
  ShoppingBag,
  Download,
  Phone,
  User,
  ArrowRight,
  ShieldCheck,
  Package
} from 'lucide-react';
import { api } from '../services/api';
import { Order, OrderStatus } from '../types';
import { OrderStatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';

export const OrdersPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Order Cancellation Dialog State
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('Customer requested cancellation');
  const [isCancelling, setIsCancelling] = useState(false);

  const { showSuccess, showError } = useToast();

  const fetchOrders = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const data = await api.getAllOrders({
        status_filter: statusFilter,
        search: searchQuery,
      });
      setOrders(data);
      if (isManual) {
        showSuccess('Order list synchronized with Cloudflare D1.', 'Orders Synced');
      }

      // If highlight param exists, auto-select that order
      const highlight = searchParams.get('highlight');
      if (highlight) {
        const found = data.find((o) => o.order_number === highlight);
        if (found) setSelectedOrder(found);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to fetch customer orders.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  // Real-time synchronization: refresh on incoming SSE order updates
  useEffect(() => {
    const handleRealtimeEvent = (e: any) => {
      const type = e.detail?.event_type;
      if (type === 'ORDER_CREATED' || type === 'ORDER_UPDATED' || type === 'ORDER_CANCELLED') {
        fetchOrders();
      }
    };
    window.addEventListener('admin_realtime_event', handleRealtimeEvent);
    return () => window.removeEventListener('admin_realtime_event', handleRealtimeEvent);
  }, [statusFilter, searchQuery]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleStatusChange = async (orderId: string | number, newStatus: OrderStatus) => {
    setIsUpdatingStatus(true);
    try {
      const updated = await api.updateOrderStatus(orderId, newStatus);
      showSuccess(`Order status updated to ${newStatus.replace(/_/g, ' ')}.`, 'Status Updated');
      setOrders((prev) => prev.map((o) => (o.order_number === updated.order_number ? updated : o)));
      if (selectedOrder && selectedOrder.order_number === updated.order_number) {
        setSelectedOrder(updated);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to update order status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCancelOrderConfirm = async () => {
    if (!orderToCancel) return;
    setIsCancelling(true);
    try {
      const updated = await api.cancelOrder(orderToCancel.order_number, cancelReason);
      showSuccess(
        `Order #${updated.order_number} cancelled and items automatically restocked in D1.`,
        'Order Cancelled'
      );
      setOrders((prev) => prev.map((o) => (o.order_number === updated.order_number ? updated : o)));
      if (selectedOrder && selectedOrder.order_number === updated.order_number) {
        setSelectedOrder(updated);
      }
      setOrderToCancel(null);
    } catch (err: any) {
      showError(err.message || 'Failed to cancel order.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Helper to parse delivery address JSON
  const parseAddress = (jsonStr: string) => {
    try {
      return JSON.parse(jsonStr || '{}');
    } catch {
      return {};
    }
  };

  // Generate WhatsApp customer chat link
  const getWhatsAppChatUrl = (order: Order, type: 'general' | 'confirm' | 'dispatch' | 'delivered' = 'general') => {
    const addr = parseAddress(order.delivery_address_json);
    const rawPhone = (order.phone || addr.phone || '').replace(/\D/g, '');
    const phone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

    let message = '';
    if (type === 'confirm') {
      message = `Hello ${order.customer_name || 'Customer'},\nYour order *#${order.order_number}* for ₹${order.total_amount} with Sri Adithya Organics has been *CONFIRMED*.\nWe are packing your pure wood-pressed oils and organic farm produce fresh.`;
    } else if (type === 'dispatch') {
      message = `Hello ${order.customer_name || 'Customer'},\nGreat news! Your Sri Adithya Organics order *#${order.order_number}* is *OUT FOR DELIVERY*.\nSlot: ${order.delivery_slot}.\nThank you for choosing healthy, authentic organic produce!`;
    } else if (type === 'delivered') {
      message = `Hello ${order.customer_name || 'Customer'},\nYour order *#${order.order_number}* has been *DELIVERED* successfully.\nWe hope you enjoy the authentic flavor of our wood-pressed products. Please let us know your feedback!`;
    } else {
      message = `Hello ${order.customer_name || 'Customer'},\nThis is Sri Adithya Organics regarding your order *#${order.order_number}*.\nPlease let us know if you have any questions or delivery instructions!`;
    }

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const formatCurrency = (val: number) => {
    return `₹${Number(val || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })}`;
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      let matchesPayment = true;
      if (paymentFilter === 'cod') matchesPayment = (o.payment_method || '').toLowerCase() === 'cod';
      if (paymentFilter === 'online') matchesPayment = (o.payment_method || '').toLowerCase() !== 'cod';
      return matchesPayment;
    });
  }, [orders, paymentFilter]);

  // Pagination Slice
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const statusTabs = [
    { label: 'All Orders', value: 'all' },
    { label: 'WhatsApp Pending', value: 'pending_whatsapp' },
    { label: 'Pending', value: 'pending' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Processing', value: 'processing' },
    { label: 'Packed', value: 'packed' },
    { label: 'Out for Delivery', value: 'out_for_delivery' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  const handleExportCSV = () => {
    if (orders.length === 0) return;

    const headers = [
      'Order Number',
      'Date',
      'Customer Name',
      'Phone',
      'Delivery Slot',
      'Distance (km)',
      'Items Count',
      'Payment Method',
      'Payment Status',
      'Subtotal',
      'Delivery Fee',
      'Total Amount',
      'Status'
    ];

    const rows = orders.map((o) => {
      const addr = parseAddress(o.delivery_address_json);
      return [
        `"${o.order_number}"`,
        `"${o.created_at || ''}"`,
        `"${(o.customer_name || addr.recipient_name || 'Customer').replace(/"/g, '""')}"`,
        `"${o.phone || addr.phone || ''}"`,
        `"${o.delivery_slot || 'Standard'}"`,
        o.distance_km != null ? o.distance_km : '',
        o.items?.length || 0,
        `"${o.payment_method}"`,
        `"${o.payment_status}"`,
        o.subtotal || 0,
        o.delivery_fee || 0,
        o.total_amount || 0,
        `"${o.status}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sri_adithya_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess(`Exported ${orders.length} orders to CSV.`, 'CSV Exported');
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E6E7DD] shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[#26352B]">Order Management</h2>
            <span className="px-2 py-0.5 rounded-full bg-[#E2E8D7] text-[#244B37] text-[11px] font-bold">
              {filteredOrders.length} Orders
            </span>
          </div>
          <p className="text-xs text-[#778176] mt-0.5">
            Process orders, manage fulfillment timeline, dispatch, and WhatsApp customer communication
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E6E7DD] bg-white hover:bg-[#F6F5EF] text-[#26352B] text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-[#496B45]" />
            <span>Export Orders CSV</span>
          </button>

          <button
            onClick={() => fetchOrders(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-[#E6E7DD] bg-white hover:bg-[#F6F5EF] text-[#26352B] transition-colors disabled:opacity-50"
            title="Refresh orders from D1"
          >
            <RefreshCw className={`w-4 h-4 text-[#496B45] ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E6E7DD] shadow-card space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="w-full sm:max-w-md relative">
            <Search className="w-4 h-4 text-[#778176] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order #, customer name, or phone..."
              className="w-full pl-10 pr-4 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs font-medium text-[#26352B] placeholder-[#778176] focus:outline-none focus:border-[#496B45] focus:bg-white transition-all"
            />
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs text-[#778176] font-semibold whitespace-nowrap">Payment:</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs font-medium text-[#26352B] focus:outline-none focus:border-[#496B45]"
            >
              <option value="all">All Payment Methods</option>
              <option value="cod">Cash on Delivery (COD)</option>
              <option value="online">Prepaid / Online UPI</option>
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pt-2 border-t border-[#E6E7DD] scrollbar-none">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === tab.value
                  ? 'bg-[#244B37] text-white shadow-2xs'
                  : 'bg-[#FAF9F5] border border-[#E6E7DD] text-[#778176] hover:text-[#26352B] hover:bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-[#E6E7DD] shadow-card overflow-hidden">
        {isLoading ? (
          <LoadingSpinner text="Fetching active orders from Cloudflare D1..." />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No orders found"
            description={
              searchQuery
                ? `No orders matching "${searchQuery}". Try searching with a different term.`
                : 'There are currently no orders in this status category.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF9F5] border-b border-[#E6E7DD] text-[11px] font-bold text-[#778176] uppercase tracking-wider">
                  <th className="p-4">Order Reference</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Delivery Slot</th>
                  <th className="p-4">Items</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E7DD]">
                {paginatedOrders.map((ord) => {
                  const addr = parseAddress(ord.delivery_address_json);
                  const custName = ord.customer_name || addr.recipient_name || 'Customer';
                  const phone = ord.phone || addr.phone || '';

                  return (
                    <tr
                      key={ord.id}
                      onClick={() => setSelectedOrder(ord)}
                      className="hover:bg-[#FAF9F5] cursor-pointer transition-colors"
                    >
                      {/* Reference */}
                      <td className="p-4">
                        <span className="font-bold text-[#244B37] block">#{ord.order_number}</span>
                        <span className="text-[10px] text-[#778176]">
                          {ord.created_at ? new Date(ord.created_at).toLocaleString() : '—'}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="p-4">
                        <span className="font-bold text-[#26352B] block">{custName}</span>
                        {phone && <span className="text-[11px] text-[#778176] block">{phone}</span>}
                        {addr.latitude && addr.longitude ? (
                          <a
                            href={`https://maps.google.com/?q=${addr.latitude},${addr.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 hover:underline mt-0.5"
                            title="Open Customer Location on Google Maps"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>GPS Location ↗</span>
                          </a>
                        ) : null}
                      </td>

                      {/* Delivery Slot */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-[#26352B] font-medium">
                          <Clock className="w-3.5 h-3.5 text-[#496B45]" />
                          <span>{ord.delivery_slot || 'Standard Delivery'}</span>
                        </div>
                      </td>

                      {/* Items */}
                      <td className="p-4">
                        <span className="font-semibold text-[#26352B]">
                          {ord.items?.length || 0} item{(ord.items?.length || 0) !== 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* Payment */}
                      <td className="p-4">
                        <span className="font-semibold text-[#26352B] uppercase text-[11px] block">
                          {ord.payment_method}
                        </span>
                        <span
                          className={`text-[10px] font-bold ${
                            ord.payment_status === 'paid' ? 'text-emerald-700' : 'text-[#778176]'
                          }`}
                        >
                          {ord.payment_status}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="p-4 font-bold text-[#26352B]">
                        {formatCurrency(ord.total_amount)}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <OrderStatusBadge status={ord.status} />
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {phone && (
                            <a
                              href={getWhatsAppChatUrl(ord, 'general')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg border border-[#E6E7DD] bg-white hover:bg-emerald-50 text-emerald-700 hover:border-emerald-300 transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => setSelectedOrder(ord)}
                            className="px-2.5 py-1.5 rounded-lg border border-[#E6E7DD] bg-white hover:bg-[#F6F5EF] text-[#244B37] font-bold text-xs transition-colors"
                          >
                            Details
                          </button>
                        </div>
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
          totalItems={filteredOrders.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Selected Order Detail Drawer / Modal */}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Order #${selectedOrder.order_number}`}
          subtitle={`Placed on ${selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : ''}`}
          maxWidth="3xl"
        >
          {(() => {
            const addr = parseAddress(selectedOrder.delivery_address_json);
            const custName = selectedOrder.customer_name || addr.recipient_name || 'Customer';
            const phone = selectedOrder.phone || addr.phone || '';

            // Stepper stages
            const stages: { label: string; status: OrderStatus }[] = [
              { label: 'Placed', status: 'pending' },
              { label: 'Confirmed', status: 'confirmed' },
              { label: 'Processing', status: 'processing' },
              { label: 'Packed', status: 'packed' },
              { label: 'Out for Delivery', status: 'out_for_delivery' },
              { label: 'Delivered', status: 'delivered' },
            ];

            const currentIdx = stages.findIndex((s) => s.status === selectedOrder.status);
            const isCancelled = selectedOrder.status === 'cancelled';

            return (
              <div className="space-y-6">
                {/* Status Stepper */}
                {!isCancelled ? (
                  <div className="p-4 bg-[#FAF9F5] rounded-2xl border border-[#E6E7DD]">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#778176] mb-3">
                      <span>Order Fulfillment Stepper</span>
                      <OrderStatusBadge status={selectedOrder.status} />
                    </div>
                    <div className="flex items-center justify-between relative">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-[#E6E7DD] -z-0" />
                      {stages.map((stage, idx) => {
                        const isDone = currentIdx >= idx;
                        const isCurrent = currentIdx === idx;
                        return (
                          <div key={stage.status} className="flex flex-col items-center relative z-10">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                isCurrent
                                  ? 'bg-[#244B37] text-white ring-4 ring-[#E2E8D7]'
                                  : isDone
                                  ? 'bg-[#496B45] text-white'
                                  : 'bg-white border border-[#E6E7DD] text-[#778176]'
                              }`}
                            >
                              {idx + 1}
                            </div>
                            <span
                              className={`text-[10px] font-semibold mt-1.5 hidden sm:block ${
                                isDone ? 'text-[#244B37] font-bold' : 'text-[#778176]'
                              }`}
                            >
                              {stage.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <div>
                      <h4 className="font-bold">This order has been cancelled</h4>
                      <p className="text-[11px] mt-0.5">{selectedOrder.admin_notes || 'Cancelled by Store Administrator'}</p>
                    </div>
                  </div>
                )}

                {/* Customer & Address Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer Information */}
                  <div className="p-4 rounded-2xl border border-[#E6E7DD] bg-white space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E6E7DD]">
                      <span className="text-xs font-bold text-[#26352B] uppercase tracking-wider">
                        Customer Info
                      </span>
                      {phone && (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={getWhatsAppChatUrl(selectedOrder, 'confirm')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-100 flex items-center gap-1"
                            title="Send WhatsApp Confirmation"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-600" />
                            <span>Confirm Msg</span>
                          </a>
                          <a
                            href={getWhatsAppChatUrl(selectedOrder, 'dispatch')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 rounded-md bg-[#F1F4EC] text-[#244B37] border border-[#8A9B69]/30 text-[10px] font-bold hover:bg-[#E2E8D7] flex items-center gap-1"
                            title="Send WhatsApp Dispatch Notice"
                          >
                            <Truck className="w-3 h-3 text-[#496B45]" />
                            <span>Dispatch Msg</span>
                          </a>
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-bold text-[#26352B]">{custName}</p>
                    {phone && (
                      <p className="text-xs text-[#778176] flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#496B45]" />
                        <span>{phone}</span>
                      </p>
                    )}
                    <p className="text-xs text-[#778176]">
                      Delivery Slot: <strong className="text-[#26352B]">{selectedOrder.delivery_slot}</strong>
                    </p>
                  </div>

                  {/* Delivery Address */}
                  <div className="p-4 rounded-2xl border border-[#E6E7DD] bg-white space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E6E7DD]">
                      <span className="text-xs font-bold text-[#26352B] uppercase tracking-wider">
                        Delivery Address
                      </span>
                      <MapPin className="w-3.5 h-3.5 text-[#496B45]" />
                    </div>
                    <p className="text-xs text-[#26352B] font-medium leading-relaxed">
                      {addr.formatted_address || [
                        addr.house_number,
                        addr.street,
                        addr.locality,
                        addr.landmark ? `Near ${addr.landmark}` : null,
                        addr.city,
                        addr.postal_code,
                      ].filter(Boolean).join(', ') || 'Standard Telangana Delivery Address'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {addr.postal_code && (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-[#FAF9F5] border border-[#E6E7DD] text-[10px] font-bold text-[#26352B]">
                          PIN: {addr.postal_code}
                        </span>
                      )}
                      {selectedOrder.distance_km != null && (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-800">
                          Road Distance: ~{selectedOrder.distance_km} km
                        </span>
                      )}
                      {addr.latitude && addr.longitude ? (
                        <a
                          href={`https://maps.google.com/?q=${addr.latitude},${addr.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                        >
                          <MapPin className="w-3 h-3 text-emerald-600" />
                          <span>Customer Location Map ({Number(addr.latitude).toFixed(4)}, {Number(addr.longitude).toFixed(4)}) ↗</span>
                        </a>
                      ) : (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr.formatted_address || [addr.house_number, addr.street, addr.city, addr.postal_code].filter(Boolean).join(', '))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-50 text-stone-700 border border-stone-200 text-[10px] font-bold hover:bg-stone-100 transition-colors"
                        >
                          <MapPin className="w-3 h-3 text-stone-500" />
                          <span>Search Address in Maps ↗</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Itemized Order Breakdown */}
                <div className="rounded-2xl border border-[#E6E7DD] overflow-hidden bg-white">
                  <div className="p-3.5 bg-[#FAF9F5] border-b border-[#E6E7DD] text-xs font-bold text-[#26352B]">
                    Ordered Organic Items ({selectedOrder.items?.length || 0})
                  </div>
                  <div className="divide-y divide-[#E6E7DD]">
                    {selectedOrder.items?.map((item) => (
                      <div key={item.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#F6F5EF] border border-[#E6E7DD] overflow-hidden shrink-0">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.product_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-[#778176] m-auto mt-2.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[#26352B] truncate">{item.product_name}</p>
                            <p className="text-[11px] text-[#778176]">
                              {item.variant_name || 'Standard Unit'} • ₹{item.unit_price} each
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-[#26352B]">₹{item.total_price}</p>
                          <p className="text-[11px] text-[#778176]">Qty: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Totals Summary */}
                  <div className="p-4 bg-[#FAF9F5] border-t border-[#E6E7DD] space-y-1.5 text-xs">
                    <div className="flex justify-between text-[#778176]">
                      <span>Subtotal</span>
                      <span>₹{selectedOrder.subtotal}</span>
                    </div>
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-[#496B45] font-semibold">
                        <span>Discount Applied</span>
                        <span>-₹{selectedOrder.discount}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#778176]">
                      <span>Delivery Fee</span>
                      <span>₹{selectedOrder.delivery_fee}</span>
                    </div>
                    <div className="flex justify-between text-[#26352B] font-bold text-sm pt-2 border-t border-[#E6E7DD]">
                      <span>Total Amount</span>
                      <span>{formatCurrency(selectedOrder.total_amount)}</span>
                    </div>
                  </div>
                </div>

                {/* Status Update & Actions Controls */}
                <div className="p-4 bg-[#FAF9F5] rounded-2xl border border-[#E6E7DD] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#26352B]">Update Status:</span>
                    <select
                      value={selectedOrder.status}
                      disabled={isUpdatingStatus || isCancelled}
                      onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value as OrderStatus)}
                      className="px-3 py-1.5 bg-white border border-[#E6E7DD] rounded-xl text-xs font-bold text-[#26352B] focus:outline-none focus:border-[#496B45]"
                    >
                      <option value="pending_whatsapp">WhatsApp Pending</option>
                      <option value="pending">Order Placed</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="packed">Packed</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>

                  {!isCancelled && (
                    <button
                      type="button"
                      onClick={() => setOrderToCancel(selectedOrder)}
                      className="px-3.5 py-1.5 rounded-xl border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors"
                    >
                      Cancel & Restock
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Cancel Order Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!orderToCancel}
        onClose={() => setOrderToCancel(null)}
        onConfirm={handleCancelOrderConfirm}
        title="Cancel Order & Restock Items"
        message={`Are you sure you want to cancel Order #${orderToCancel?.order_number}? All items in this order will automatically be restocked back into Cloudflare D1 inventory.`}
        confirmLabel="Cancel Order & Restock"
        variant="danger"
        isLoading={isCancelling}
      />
    </div>
  );
};
