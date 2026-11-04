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
  ShoppingBag
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
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
        showSuccess('Order list refreshed.', 'Updated');
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
      showSuccess(`Order status updated to ${newStatus.replace('_', ' ')}.`, 'Status Updated');
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
        `Order ${updated.order_number} cancelled and items automatically restocked.`,
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
  const getWhatsAppChatUrl = (order: Order) => {
    const rawPhone = (order.phone || '').replace(/\D/g, '');
    const phone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const msg = encodeURIComponent(
      `Hello ${order.customer_name || 'Customer'},\nThis is Sri Adithya Organics regarding your order *#${order.order_number}*.\nWe are currently preparing your items for delivery. If you have any questions or special instructions, please let us know!`
    );
    return `https://wa.me/${phone}?text=${msg}`;
  };

  const formatCurrency = (val: number) => {
    return `₹${Number(val || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })}`;
  };

  // Pagination Slice
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return orders.slice(start, start + pageSize);
  }, [orders, currentPage]);

  const statusTabs = [
    { label: 'All Orders', value: 'all' },
    { label: 'Pending WhatsApp', value: 'pending_whatsapp' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Processing', value: 'processing' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  return (
    <div className="space-y-5">
      {/* Search & Action Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order #, Customer Name, or Phone..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchOrders(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-700' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Orders'}</span>
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatusFilter(tab.value);
              setCurrentPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === tab.value
                ? 'bg-brand-800 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        {isLoading ? (
          <LoadingSpinner text="Loading orders..." />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No Orders Found"
            description={
              searchQuery
                ? `No orders matching "${searchQuery}". Try adjusting your search term.`
                : 'There are currently no orders in this status category.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Order Reference</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Delivery Slot</th>
                  <th className="py-3.5 px-4">Live Location</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedOrders.map((order) => {
                  const addr = parseAddress(order.delivery_address_json);
                  const hasCoordinates = addr.latitude && addr.longitude;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 block">{order.order_number}</span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(order.created_at).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block">{order.customer_name || 'Guest'}</span>
                        <span className="text-[11px] text-slate-500">{order.phone}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {order.delivery_slot || 'Standard'}
                      </td>
                      <td className="py-3.5 px-4">
                        {hasCoordinates ? (
                          <a
                            href={`https://maps.google.com/?q=${addr.latitude},${addr.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
                          >
                            <MapPin className="w-3 h-3 text-emerald-600" />
                            <span>GPS Mapped</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Manual Address</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{formatCurrency(order.total_amount)}</span>
                        <span className="text-[10px] text-slate-400">
                          {order.items?.length || 1} item{order.items?.length > 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="capitalize font-medium text-slate-700">
                          {order.payment_method?.replace(/whatsapp_|_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-900 text-xs font-semibold transition-all inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-brand-700" />
                          <span>Details</span>
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
          totalItems={orders.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Order #${selectedOrder.order_number}`}
          subtitle={`Placed on ${new Date(selectedOrder.created_at).toLocaleString('en-IN')}`}
          maxWidth="2xl"
        >
          {(() => {
            const addr = parseAddress(selectedOrder.delivery_address_json);
            const hasGps = addr.latitude && addr.longitude;

            return (
              <div className="space-y-6">
                {/* Status Bar & Quick Actions */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500">Current Status:</span>
                    <OrderStatusBadge status={selectedOrder.status} />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedOrder.status}
                      disabled={isUpdatingStatus || selectedOrder.status === 'cancelled'}
                      onChange={(e) => handleStatusChange(selectedOrder.order_number, e.target.value as OrderStatus)}
                      className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:opacity-50"
                    >
                      <option value="pending_whatsapp">Pending WhatsApp</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="packed">Packed</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    {selectedOrder.phone && (
                      <a
                        href={getWhatsAppChatUrl(selectedOrder)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat via WhatsApp</span>
                      </a>
                    )}

                    {selectedOrder.status !== 'cancelled' && (
                      <button
                        onClick={() => setOrderToCancel(selectedOrder)}
                        className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel Order</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Customer & Delivery Address Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-white">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Customer Info</h4>
                    <p className="text-sm font-bold text-slate-900">{selectedOrder.customer_name || 'Guest'}</p>
                    <p className="text-xs text-slate-600 mt-1">Phone: {selectedOrder.phone || 'N/A'}</p>
                    <p className="text-xs text-slate-600 mt-0.5">Slot: {selectedOrder.delivery_slot || 'Standard'}</p>
                    {selectedOrder.notes && (
                      <div className="mt-3 p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/70 text-xs text-amber-900">
                        <span className="font-semibold block">Customer Notes:</span>
                        {selectedOrder.notes}
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200/80 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery Destination</h4>
                      {hasGps && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Live GPS Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-800">
                      {[addr.street, addr.apartment].filter(Boolean).join(', ') || 'No street specified'}
                    </p>
                    <p className="text-xs text-slate-600">
                      {[addr.city, addr.postal_code].filter(Boolean).join(' - ')}
                    </p>
                    {addr.landmark && (
                      <p className="text-xs text-slate-500 mt-1">Landmark: {addr.landmark}</p>
                    )}

                    {hasGps ? (
                      <div className="mt-3">
                        <a
                          href={`https://maps.google.com/?q=${addr.latitude},${addr.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-800 text-white hover:bg-brand-900 text-xs font-semibold transition-colors shadow-xs"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Open in Google Maps ({addr.latitude?.toFixed(4)}, {addr.longitude?.toFixed(4)})</span>
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                        {addr.accuracy_meters && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            GPS Precision Radius: ±{Math.round(addr.accuracy_meters)} meters
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-2 italic">No GPS coordinates recorded for this address.</p>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                  <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Ordered Organic Items
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400">
                        <th className="py-2.5 px-4 font-semibold">Item</th>
                        <th className="py-2.5 px-4 font-semibold">Price</th>
                        <th className="py-2.5 px-4 font-semibold">Qty</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrder.items && selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((it) => (
                          <tr key={it.id}>
                            <td className="py-3 px-4 font-semibold text-slate-800">{it.product_name}</td>
                            <td className="py-3 px-4 text-slate-600">{formatCurrency(it.unit_price)}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{it.quantity}</td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900">
                              {formatCurrency(it.total_price)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400">
                            Item list not loaded
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Order Summary Pricing */}
                <div className="flex justify-end">
                  <div className="w-full sm:w-72 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Delivery Fee:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedOrder.delivery_fee === 0 ? 'FREE' : formatCurrency(selectedOrder.delivery_fee)}
                      </span>
                    </div>
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Discount:</span>
                        <span className="font-semibold">-{formatCurrency(selectedOrder.discount)}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-slate-900">
                      <span>Final Total:</span>
                      <span className="text-brand-800">{formatCurrency(selectedOrder.total_amount)}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 pt-1">
                      Payment Mode: <span className="capitalize text-slate-600 font-medium">{selectedOrder.payment_method?.replace(/whatsapp_|_/g, ' ')}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Cancel Order Confirm Dialog with Automatic Restock Note */}
      {orderToCancel && (
        <Modal
          isOpen={!!orderToCancel}
          onClose={() => setOrderToCancel(null)}
          title="Cancel Order & Restock Inventory"
          maxWidth="md"
        >
          <div className="space-y-4 py-1">
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Automatic Stock Restoration Active</p>
                <p className="mt-0.5 text-rose-800">
                  Cancelling order <strong>#{orderToCancel.order_number}</strong> will automatically return the ordered quantities back to central inventory and record an audit entry.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reason for Cancellation
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="e.g. Customer changed mind, out of service area, customer request..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
                disabled={isCancelling}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleCancelOrderConfirm}
                disabled={isCancelling || !cancelReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
              >
                {isCancelling ? 'Restocking & Cancelling...' : 'Confirm Cancellation & Restock'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
