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
  Download,
  ArrowRight,
  ShieldCheck,
  Award
} from 'lucide-react';
import { api } from '../services/api';
import { CustomerMetric, CustomerDetail } from '../types';
import { StatCard } from '../components/ui/StatCard';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { OrderStatusBadge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';

type SortOption = 'spend_desc' | 'orders_desc' | 'newest' | 'name_asc';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('spend_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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
        showSuccess('Customer directory updated from Cloudflare D1.', 'Synchronized');
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
    }, 250);
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
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    })}`;
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalCusts = customers.length;
    const totalSpend = customers.reduce((sum, c) => sum + (c.total_spend || 0), 0);
    const repeatCusts = customers.filter((c) => (c.total_orders || 0) > 1).length;
    const avgCustValue = totalCusts > 0 ? totalSpend / totalCusts : 0;
    return { totalCusts, totalSpend, repeatCusts, avgCustValue };
  }, [customers]);

  // Sorted Customers
  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      if (sortOption === 'spend_desc') return (b.total_spend || 0) - (a.total_spend || 0);
      if (sortOption === 'orders_desc') return (b.total_orders || 0) - (a.total_orders || 0);
      if (sortOption === 'newest') return (b.id || 0) - (a.id || 0);
      if (sortOption === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });
  }, [customers, sortOption]);

  // Pagination Slice
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCustomers.slice(start, start + pageSize);
  }, [sortedCustomers, currentPage, pageSize]);

  const getWhatsAppChatUrl = (phone?: string, name?: string) => {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/\D/g, '');
    const num = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `Hello ${name || 'Customer'},\nGreetings from Sri Adithya Organics! How can we assist you with our organic products today?`
    );
    return `https://wa.me/${num}?text=${msg}`;
  };

  const handleExportCSV = () => {
    if (customers.length === 0) return;

    const headers = [
      'Customer ID',
      'Name',
      'Email',
      'Phone',
      'Total Orders',
      'Total Lifetime Spend (INR)',
      'Member Since',
      'Last Order Date'
    ];

    const rows = customers.map((c) => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.email}"`,
      `"${c.phone || ''}"`,
      c.total_orders || 0,
      c.total_spend || 0,
      `"${c.created_at || ''}"`,
      `"${c.last_order_date || ''}"`
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sri_adithya_customers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess(`Exported ${customers.length} customer records to CSV.`, 'CSV Exported');
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E6E7DD] shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[#26352B]">Customer Directory</h2>
            <span className="px-2 py-0.5 rounded-full bg-[#E2E8D7] text-[#244B37] text-[11px] font-bold">
              {customers.length} Profiles
            </span>
          </div>
          <p className="text-xs text-[#778176] mt-0.5">
            Customer lifetime values, purchase frequencies, and registered delivery destinations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E6E7DD] bg-white hover:bg-[#F6F5EF] text-[#26352B] text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-[#496B45]" />
            <span>Export Customers CSV</span>
          </button>

          <button
            onClick={() => loadCustomers(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-[#E6E7DD] bg-white hover:bg-[#F6F5EF] text-[#26352B] transition-colors disabled:opacity-50"
            title="Refresh customer records"
          >
            <RefreshCw className={`w-4 h-4 text-[#496B45] ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Customers"
          value={metrics.totalCusts}
          subtitle="Registered accounts in D1"
          icon={Users}
          colorScheme="forest"
        />

        <StatCard
          title="Customer Lifetime Spend"
          value={formatCurrency(metrics.totalSpend)}
          subtitle="Cumulative gross order value"
          icon={IndianRupee}
          colorScheme="sage"
        />

        <StatCard
          title="Repeat Buyers"
          value={metrics.repeatCusts}
          subtitle={`${metrics.totalCusts > 0 ? Math.round((metrics.repeatCusts / metrics.totalCusts) * 100) : 0}% repeat order rate`}
          icon={Award}
          colorScheme="earth"
        />

        <StatCard
          title="Average Customer Value"
          value={formatCurrency(metrics.avgCustValue)}
          subtitle="Average lifetime spending per shopper"
          icon={ShoppingBag}
          colorScheme="forest"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E6E7DD] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="w-full sm:max-w-md relative">
          <Search className="w-4 h-4 text-[#778176] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, email address, or phone..."
            className="w-full pl-10 pr-4 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs font-medium text-[#26352B] placeholder-[#778176] focus:outline-none focus:border-[#496B45] focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-[#778176] font-semibold">Sort by:</label>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="px-3 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs font-medium text-[#26352B] focus:outline-none focus:border-[#496B45]"
          >
            <option value="spend_desc">Highest Lifetime Spend</option>
            <option value="orders_desc">Most Orders</option>
            <option value="newest">Recently Registered</option>
            <option value="name_asc">Name: A to Z</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-[#E6E7DD] shadow-card overflow-hidden">
        {isLoading ? (
          <LoadingSpinner text="Retrieving customer profiles from Cloudflare D1..." />
        ) : sortedCustomers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description={
              searchQuery
                ? `No customers match "${searchQuery}". Check spelling or search by phone.`
                : 'Customer directory is currently empty.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF9F5] border-b border-[#E6E7DD] text-[11px] font-bold text-[#778176] uppercase tracking-wider">
                  <th className="p-4">Customer</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Orders Placed</th>
                  <th className="p-4">Lifetime Spend</th>
                  <th className="p-4">Last Order</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E7DD]">
                {paginatedCustomers.map((cust) => (
                  <tr
                    key={cust.id}
                    onClick={() => viewCustomer(cust.id)}
                    className="hover:bg-[#FAF9F5] cursor-pointer transition-colors"
                  >
                    {/* Customer Name & Initial */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#244B37] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                          {cust.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-[#26352B]">{cust.name}</p>
                          <p className="text-[11px] text-[#778176] font-mono">ID #{cust.id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="p-4">
                      <p className="font-medium text-[#26352B]">{cust.phone || 'No phone recorded'}</p>
                      <p className="text-[11px] text-[#778176]">{cust.email}</p>
                    </td>

                    {/* Orders Placed */}
                    <td className="p-4">
                      <span className="font-bold text-[#26352B]">{cust.total_orders || 0}</span>
                      <span className="text-[11px] text-[#778176] ml-1">orders</span>
                    </td>

                    {/* Lifetime Spend */}
                    <td className="p-4 font-bold text-[#496B45]">
                      {formatCurrency(cust.total_spend || 0)}
                    </td>

                    {/* Last Order */}
                    <td className="p-4 text-[#778176]">
                      {cust.last_order_date
                        ? new Date(cust.last_order_date).toLocaleDateString()
                        : 'No orders yet'}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {cust.phone && (
                          <a
                            href={getWhatsAppChatUrl(cust.phone, cust.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-[#E6E7DD] bg-white hover:bg-emerald-50 text-emerald-700 hover:border-emerald-300 transition-colors"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => viewCustomer(cust.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#E6E7DD] bg-white hover:bg-[#F6F5EF] text-[#244B37] font-bold text-xs transition-colors"
                        >
                          Profile
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
          totalItems={sortedCustomers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Customer Profile Detail Modal */}
      {selectedCustomerId && (
        <Modal
          isOpen={!!selectedCustomerId}
          onClose={() => {
            setSelectedCustomerId(null);
            setCustomerDetail(null);
          }}
          title={customerDetail?.name || 'Customer Profile'}
          subtitle={`Account registered ${customerDetail?.created_at ? new Date(customerDetail.created_at).toLocaleDateString() : ''}`}
          maxWidth="3xl"
        >
          {isLoadingDetail || !customerDetail ? (
            <LoadingSpinner text="Loading customer profile, addresses and past orders..." />
          ) : (
            <div className="space-y-6">
              {/* Profile Overview Card */}
              <div className="p-4 rounded-2xl border border-[#E6E7DD] bg-[#FAF9F5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#244B37] text-white flex items-center justify-center font-bold text-lg shadow-xs">
                    {customerDetail.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#26352B]">{customerDetail.name}</h3>
                    <p className="text-xs text-[#778176]">{customerDetail.email}</p>
                    {customerDetail.phone && (
                      <p className="text-xs font-semibold text-[#496B45] mt-0.5">
                        {customerDetail.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {customerDetail.phone && (
                    <a
                      href={getWhatsAppChatUrl(customerDetail.phone, customerDetail.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Customer</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Statistics Row */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl border border-[#E6E7DD] bg-white">
                  <span className="text-[10px] font-bold text-[#778176] uppercase">Total Orders</span>
                  <p className="text-lg font-bold text-[#26352B] mt-1">{customerDetail.total_orders}</p>
                </div>
                <div className="p-3 rounded-xl border border-[#E6E7DD] bg-white">
                  <span className="text-[10px] font-bold text-[#778176] uppercase">Total Spent</span>
                  <p className="text-lg font-bold text-[#496B45] mt-1">{formatCurrency(customerDetail.total_spend)}</p>
                </div>
                <div className="p-3 rounded-xl border border-[#E6E7DD] bg-white">
                  <span className="text-[10px] font-bold text-[#778176] uppercase">Saved Addresses</span>
                  <p className="text-lg font-bold text-[#26352B] mt-1">{customerDetail.addresses?.length || 0}</p>
                </div>
              </div>

              {/* Saved Addresses Section */}
              <div>
                <h4 className="text-xs font-bold text-[#26352B] uppercase tracking-wider mb-2.5">
                  Saved Delivery Addresses ({customerDetail.addresses?.length || 0})
                </h4>
                {customerDetail.addresses && customerDetail.addresses.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {customerDetail.addresses.map((addr, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-[#E6E7DD] bg-white text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#26352B]">
                            {addr.recipient_name || customerDetail.name}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FAF9F5] border border-[#E6E7DD] text-[#778176]">
                            PIN: {addr.postal_code}
                          </span>
                        </div>
                        <p className="text-[#778176] text-[11px] leading-relaxed">
                          {addr.formatted_address || [
                            addr.house_number,
                            addr.street,
                            addr.locality,
                            addr.city,
                            addr.postal_code,
                          ].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#778176] p-3 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD] text-center">
                    No delivery addresses stored yet.
                  </p>
                )}
              </div>

              {/* Order History Section */}
              <div>
                <h4 className="text-xs font-bold text-[#26352B] uppercase tracking-wider mb-2.5">
                  Order History ({customerDetail.orders?.length || 0})
                </h4>
                {customerDetail.orders && customerDetail.orders.length > 0 ? (
                  <div className="rounded-xl border border-[#E6E7DD] overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF9F5] border-b border-[#E6E7DD] text-[10px] font-bold text-[#778176] uppercase">
                        <tr>
                          <th className="p-3">Order #</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Items</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6E7DD]">
                        {customerDetail.orders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-[#FAF9F5]">
                            <td className="p-3 font-bold text-[#244B37]">#{ord.order_number}</td>
                            <td className="p-3 text-[#778176]">
                              {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : '—'}
                            </td>
                            <td className="p-3 font-medium text-[#26352B]">
                              {ord.items?.length || 0} items
                            </td>
                            <td className="p-3 font-bold text-[#26352B]">
                              {formatCurrency(ord.total_amount)}
                            </td>
                            <td className="p-3 text-right">
                              <OrderStatusBadge status={ord.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-[#778176] p-3 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD] text-center">
                    No orders placed by this customer yet.
                  </p>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
