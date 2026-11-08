import React, { useEffect, useState, useMemo } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Search,
  Calendar,
  Percent,
  IndianRupee,
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { Coupon } from '../types';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';

export const DiscountsPage: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDiscountType, setFormDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState<number>(10);
  const [formMinOrderAmount, setFormMinOrderAmount] = useState<number>(499);
  const [formMaxDiscountAmount, setFormMaxDiscountAmount] = useState<number>(150);
  const [formUsageLimit, setFormUsageLimit] = useState<number>(100);
  const [formValidFrom, setFormValidFrom] = useState('');
  const [formValidUntil, setFormValidUntil] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Delete State
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showSuccess, showError } = useToast();

  const loadCoupons = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const data = await api.getCoupons();
      setCoupons(data);
      if (isManual) {
        showSuccess('Discounts and promotional coupons synced from D1.', 'Synchronized');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to load coupon offers.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const openAddModal = () => {
    setEditingCoupon(null);
    setFormCode('');
    setFormDescription('');
    setFormDiscountType('percentage');
    setFormDiscountValue(10);
    setFormMinOrderAmount(499);
    setFormMaxDiscountAmount(150);
    setFormUsageLimit(100);
    setFormValidFrom(new Date().toISOString().slice(0, 10));
    setFormValidUntil(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormCode(coupon.code);
    setFormDescription(coupon.description || '');
    setFormDiscountType(coupon.discount_type);
    setFormDiscountValue(coupon.discount_value);
    setFormMinOrderAmount(coupon.min_order_amount || 0);
    setFormMaxDiscountAmount(coupon.max_discount_amount || 0);
    setFormUsageLimit(coupon.usage_limit || 0);
    setFormValidFrom(coupon.valid_from ? coupon.valid_from.slice(0, 10) : '');
    setFormValidUntil(coupon.valid_until ? coupon.valid_until.slice(0, 10) : '');
    setFormIsActive(coupon.is_active);
    setIsModalOpen(true);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showSuccess(`Coupon code "${code}" copied to clipboard.`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim()) {
      showError('Please enter a coupon code.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<Coupon> = {
        code: formCode.trim().toUpperCase(),
        description: formDescription.trim(),
        discount_type: formDiscountType,
        discount_value: Number(formDiscountValue),
        min_order_amount: Number(formMinOrderAmount),
        max_discount_amount: formDiscountType === 'percentage' ? Number(formMaxDiscountAmount) : undefined,
        usage_limit: formUsageLimit ? Number(formUsageLimit) : undefined,
        valid_from: formValidFrom || undefined,
        valid_until: formValidUntil || undefined,
        is_active: formIsActive,
      };

      if (editingCoupon) {
        await api.updateCoupon(editingCoupon.id, payload);
        showSuccess(`Coupon "${payload.code}" updated.`, 'Saved');
      } else {
        await api.createCoupon(payload);
        showSuccess(`Coupon "${payload.code}" created successfully.`, 'Created');
      }
      setIsModalOpen(false);
      loadCoupons();
    } catch (err: any) {
      showError(err.message || 'Failed to save coupon.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      await api.updateCoupon(coupon.id, { is_active: !coupon.is_active });
      showSuccess(`Coupon "${coupon.code}" ${coupon.is_active ? 'deactivated' : 'activated'}.`);
      loadCoupons();
    } catch (err: any) {
      showError(err.message || 'Failed to update coupon status.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!couponToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteCoupon(couponToDelete.id);
      showSuccess(`Coupon "${couponToDelete.code}" deleted permanently.`);
      setCouponToDelete(null);
      loadCoupons();
    } catch (err: any) {
      showError(err.message || 'Failed to delete coupon.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      const matchesSearch =
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        filterStatus === 'all'
          ? true
          : filterStatus === 'active'
          ? c.is_active
          : !c.is_active;

      return matchesSearch && matchesStatus;
    });
  }, [coupons, searchQuery, filterStatus]);

  const activeCount = useMemo(() => coupons.filter((c) => c.is_active).length, [coupons]);
  const totalUses = useMemo(
    () => coupons.reduce((sum, c) => sum + (c.usage_count ?? c.times_used ?? 0), 0),
    [coupons]
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#E6E7DD] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#778176] uppercase tracking-wider">Promotional Offers</p>
            <p className="text-2xl font-bold text-[#26352B] mt-1 font-serif">{coupons.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F6F5EF] text-[#244B37] flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E6E7DD] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#778176] uppercase tracking-wider">Active Campaigns</p>
            <p className="text-2xl font-bold text-[#244B37] mt-1 font-serif">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E6E7DD] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#778176] uppercase tracking-wider">Total Redemptions</p>
            <p className="text-2xl font-bold text-[#26352B] mt-1 font-serif">{totalUses}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F6F5EF] text-[#496B45] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E6E7DD] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#778176]" />
            <input
              type="text"
              placeholder="Search coupon code or campaign description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#E6E7DD] bg-[#F6F5EF]/40 text-xs text-[#26352B] placeholder:text-[#778176] focus:outline-none focus:ring-2 focus:ring-[#244B37] focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-[#F6F5EF] rounded-xl border border-[#E6E7DD]">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === 'all' ? 'bg-white text-[#244B37] shadow-xs' : 'text-[#778176] hover:text-[#26352B]'
              }`}
            >
              All ({coupons.length})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === 'active' ? 'bg-white text-emerald-800 shadow-xs' : 'text-[#778176] hover:text-[#26352B]'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === 'inactive' ? 'bg-white text-rose-800 shadow-xs' : 'text-[#778176] hover:text-[#26352B]'
              }`}
            >
              Inactive ({coupons.length - activeCount})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5 justify-end">
          <button
            onClick={() => loadCoupons(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-[#E6E7DD] text-[#778176] hover:text-[#26352B] hover:bg-[#F6F5EF] transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#244B37]' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#244B37] hover:bg-[#1b3829] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Coupon</span>
          </button>
        </div>
      </div>

      {/* Coupons Table */}
      {isLoading ? (
        <LoadingSpinner text="Reading promotional discounts from Cloudflare D1..." />
      ) : filteredCoupons.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No Coupons Found"
          description={
            searchQuery
              ? `No discount codes match "${searchQuery}". Clear your search to view all offers.`
              : 'Create promotional discount codes for organic festival sales and customer incentives.'
          }
          action={searchQuery ? undefined : { label: 'Create Coupon', onClick: openAddModal }}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#E6E7DD] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E6E7DD] bg-[#FAF9F5] text-[#778176] uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-semibold">Promo Code</th>
                  <th className="py-3 px-4 font-semibold">Discount Rule</th>
                  <th className="py-3 px-4 font-semibold">Thresholds</th>
                  <th className="py-3 px-4 font-semibold">Usage</th>
                  <th className="py-3 px-4 font-semibold">Validity</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E7DD]">
                {filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-[#F6F5EF]/50 transition-colors">
                    {/* Code */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-[#F6F5EF] text-[#244B37] border border-[#E6E7DD]">
                          {coupon.code}
                        </span>
                        <button
                          onClick={() => handleCopyCode(coupon.code)}
                          className="p-1 text-[#778176] hover:text-[#244B37] transition-colors"
                          title="Copy Code"
                        >
                          {copiedCode === coupon.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {coupon.description && (
                        <p className="text-[11px] text-[#778176] mt-1 max-w-xs truncate">
                          {coupon.description}
                        </p>
                      )}
                    </td>

                    {/* Discount */}
                    <td className="py-3.5 px-4 font-semibold text-[#26352B]">
                      {coupon.discount_type === 'percentage' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md font-bold">
                          <Percent className="w-3 h-3" />
                          {coupon.discount_value}% OFF
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#244B37] bg-[#F6F5EF] px-2.5 py-1 rounded-md font-bold">
                          <IndianRupee className="w-3 h-3" />
                          ₹{coupon.discount_value} OFF
                        </span>
                      )}
                    </td>

                    {/* Thresholds */}
                    <td className="py-3.5 px-4 text-[#778176]">
                      <p>Min Cart: <strong className="text-[#26352B]">₹{coupon.min_order_amount || 0}</strong></p>
                      {coupon.discount_type === 'percentage' && coupon.max_discount_amount && (
                        <p className="text-[10px]">Cap: ₹{coupon.max_discount_amount}</p>
                      )}
                    </td>

                    {/* Usage */}
                    <td className="py-3.5 px-4 text-[#778176]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[#26352B]">
                          {coupon.usage_count ?? coupon.times_used ?? 0}
                        </span>
                        <span>/</span>
                        <span>{coupon.usage_limit ? coupon.usage_limit : '∞'}</span>
                      </div>
                    </td>

                    {/* Validity */}
                    <td className="py-3.5 px-4 text-[11px] text-[#778176]">
                      {coupon.valid_until ? (
                        <span>Until {coupon.valid_until.slice(0, 10)}</span>
                      ) : (
                        <span className="text-[#496B45]">No expiration</span>
                      )}
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(coupon)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                          coupon.is_active
                            ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                        }`}
                      >
                        {coupon.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(coupon)}
                          className="p-1.5 text-[#778176] hover:text-[#244B37] hover:bg-[#F6F5EF] rounded-lg transition-colors"
                          title="Edit Coupon"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setCouponToDelete(coupon)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Coupon"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Coupon Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create New Promotional Coupon'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1">
                Coupon Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. HARVEST20"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-mono font-bold text-[#26352B] uppercase focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1">
                Discount Type *
              </label>
              <select
                value={formDiscountType}
                onChange={(e) => setFormDiscountType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-semibold text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              >
                <option value="percentage">Percentage (%) Off</option>
                <option value="flat">Flat Cash (₹) Off</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#26352B] mb-1">
              Campaign Description
            </label>
            <input
              type="text"
              placeholder="e.g. Traditional cold-pressed oil seasonal harvest offer"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1">
                Discount Value *
              </label>
              <input
                type="number"
                min="1"
                required
                value={formDiscountValue}
                onChange={(e) => setFormDiscountValue(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-bold text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1">
                Min Cart Value (₹)
              </label>
              <input
                type="number"
                min="0"
                value={formMinOrderAmount}
                onChange={(e) => setFormMinOrderAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1">
                Max Cap (₹)
              </label>
              <input
                type="number"
                min="0"
                disabled={formDiscountType === 'flat'}
                value={formMaxDiscountAmount}
                onChange={(e) => setFormMaxDiscountAmount(Number(e.target.value))}
                placeholder={formDiscountType === 'flat' ? 'N/A' : 'Cap'}
                className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs text-[#26352B] disabled:bg-[#F6F5EF] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1">
                Usage Limit
              </label>
              <input
                type="number"
                min="0"
                value={formUsageLimit}
                onChange={(e) => setFormUsageLimit(Number(e.target.value))}
                placeholder="Unlimited if 0"
                className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1">
                Valid From
              </label>
              <input
                type="date"
                value={formValidFrom}
                onChange={(e) => setFormValidFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1">
                Valid Until
              </label>
              <input
                type="date"
                value={formValidUntil}
                onChange={(e) => setFormValidUntil(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#E6E7DD] flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#26352B]">Coupon Campaign Status</p>
              <p className="text-[11px] text-[#778176]">Allow shoppers to redeem this code at cart checkout</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#244B37]"></div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E6E7DD]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#E6E7DD] text-xs font-semibold text-[#778176] hover:bg-[#F6F5EF]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-[#244B37] hover:bg-[#1b3829] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2"
            >
              {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingCoupon ? 'Save Coupon' : 'Create Offer'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!couponToDelete}
        onClose={() => setCouponToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Coupon Offer?"
        message={`Are you sure you want to delete coupon code "${couponToDelete?.code}"? Customers will no longer be able to apply it.`}
        confirmText="Delete Coupon"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
};

export default DiscountsPage;
