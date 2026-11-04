import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Search,
  Eye,
  MessageSquare,
  MapPin,
  ShoppingBag,
  IndianRupee,
  RefreshCw,
  Calendar,
  Phone,
  Mail,
  Clock,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { CustomerMetric, CustomerDetail } from '../types';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { OrderStatusBadge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Customer Detail Modal State
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const { showSuccess, showError } = useToast();

  const loadCustomers = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const data = await api.getCustomers(searchQuery);
      setCustomers(data);
      if (isManual) {
        showSuccess('Customer directory refreshed.', 'Updated');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to load customer directory.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const viewCustomer = async (id: number) => {
    setSelectedCustomerId(id);
    setIsLoadingDetail(true);
    try {
      const detail = await api.getCustomerDetail(id);
      setCustomerDetail(detail);
    } catch (err: any) {
      showError(err.message || 'Failed to load customer profile details.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const formatCurrency = (val: number) => {
    return `₹${Number(val || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })}`;
  };

  // Pagination
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return customers.slice(start, start + pageSize);
  }, [customers, currentPage]);

  const getWhatsAppChatUrl = (phone?: string, name?: string) => {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/\D/g, '');
    const num = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `Hello ${name || 'Customer'},\nGreetings from Sri Adithya Organics! How can we assist you today?`
    );
    return `https://wa.me/${num}?text=${msg}`;
  };

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search customers by name, email, or phone number..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadCustomers(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-700' : ''}`} />
          </button>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        {isLoading ? (
          <LoadingSpinner text="Reading customer accounts..." />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Customers Found"
            description="No customer accounts match your search query."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Registered Date</th>
                  <th className="py-3.5 px-4">Total Orders</th>
                  <th className="py-3.5 px-4">Lifetime Spend</th>
                  <th className="py-3.5 px-4">Last Order</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-800 font-bold flex items-center justify-center text-xs">
                          {cust.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{cust.name}</span>
                          <span className="text-[11px] text-slate-400">ID #{cust.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-800 block font-medium">{cust.email}</span>
                      <span className="text-[11px] text-slate-500">{cust.phone || 'No phone'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {cust.created_at ? new Date(cust.created_at).toLocaleDateString('en-IN') : 'Recent'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900">{cust.total_orders}</span>
                      <span className="text-[11px] text-slate-400 font-medium"> orders</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-brand-800">
                      {formatCurrency(cust.total_spend)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {cust.last_order_date
                        ? new Date(cust.last_order_date).toLocaleDateString('en-IN')
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {cust.phone && (
                          <a
                            href={getWhatsAppChatUrl(cust.phone, cust.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => viewCustomer(cust.id)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-brand-700" />
                          <span>Profile</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={customers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomerId && (
        <Modal
          isOpen={!!selectedCustomerId}
          onClose={() => {
            setSelectedCustomerId(null);
            setCustomerDetail(null);
          }}
          title={customerDetail?.name || 'Customer Profile'}
          subtitle={`Account ID #${selectedCustomerId} • Registered Customer`}
          maxWidth="2xl"
        >
          {isLoadingDetail ? (
            <LoadingSpinner text="Loading customer profile and order history..." />
          ) : customerDetail ? (
            <div className="space-y-6">
              {/* Profile Header Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase block">Total Spend</span>
                  <span className="text-lg font-bold text-brand-800 mt-0.5 block">
                    {formatCurrency(customerDetail.total_spend)}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase block">Total Orders</span>
                  <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                    {customerDetail.total_orders} completed
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase block">Average Basket</span>
                  <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                    {customerDetail.total_orders > 0
                      ? formatCurrency(customerDetail.total_spend / customerDetail.total_orders)
                      : '₹0.00'}
                  </span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-white">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contact Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{customerDetail.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{customerDetail.phone || 'No phone recorded'}</span>
                  </div>
                </div>
              </div>

              {/* Saved Delivery Addresses with GPS */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Saved Delivery Addresses ({customerDetail.addresses?.length || 0})
                </h4>
                {customerDetail.addresses && customerDetail.addresses.length > 0 ? (
                  <div className="space-y-2">
                    {customerDetail.addresses.map((addr, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50 flex items-start justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {[addr.street, addr.apartment].filter(Boolean).join(', ')}
                          </p>
                          <p className="text-slate-500 mt-0.5">
                            {[addr.city, addr.postal_code].filter(Boolean).join(' - ')}
                          </p>
                        </div>
                        {addr.latitude && addr.longitude && (
                          <a
                            href={`https://maps.google.com/?q=${addr.latitude},${addr.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100/70 text-emerald-800 text-[11px] font-semibold hover:bg-emerald-200 transition-colors flex-shrink-0"
                          >
                            <MapPin className="w-3 h-3 text-emerald-600" />
                            <span>GPS Map</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No saved addresses on file.</p>
                )}
              </div>

              {/* Order History */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Order History ({customerDetail.orders?.length || 0})
                </h4>
                <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 font-semibold">
                        <th className="py-2.5 px-3">Order #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerDetail.orders && customerDetail.orders.length > 0 ? (
                        customerDetail.orders.map((o) => (
                          <tr key={o.id}>
                            <td className="py-2.5 px-3 font-mono font-medium text-slate-800">{o.order_number}</td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {new Date(o.created_at).toLocaleDateString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{formatCurrency(o.total_amount)}</td>
                            <td className="py-2.5 px-3">
                              <OrderStatusBadge status={o.status} />
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400">
                            No orders found for this customer.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
};

