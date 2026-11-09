import React, { useEffect, useState } from 'react';
import {
  Settings,
  Save,
  RefreshCw,
  Phone,
  Truck,
  IndianRupee,
  Clock,
  Plus,
  Trash2,
  Store,
  ShieldCheck,
  Lock,
  KeyRound,
  ExternalLink,
  CheckCircle,
  Database,
  Building,
  Cpu,
} from 'lucide-react';
import { api } from '../services/api';
import { StoreSettings } from '../types';
import { useAdminAuth } from '../context/AdminAuthContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useToast } from '../context/ToastContext';
import { AIProviderQuotaSection } from '../components/ai/AIProviderQuotaSection';

export const SettingsPage: React.FC = () => {
  const { user } = useAdminAuth();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'delivery' | 'whatsapp' | 'security' | 'ai_quota'>('profile');

  // Form Fields - Delivery & Store
  const [minOrder, setMinOrder] = useState<number>(99);
  const [freeThreshold, setFreeThreshold] = useState<number>(499);
  const [standardFee, setStandardFee] = useState<number>(39);
  const [expressFee, setExpressFee] = useState<number>(59);
  const [whatsappNumber, setWhatsappNumber] = useState('919515159006');
  const [announcementText, setAnnouncementText] = useState('');
  const [deliverySlots, setDeliverySlots] = useState<string[]>([]);
  const [newSlotText, setNewSlotText] = useState('');

  // Form Fields - Admin Profile & Password Change
  const [adminName, setAdminName] = useState(user?.name || 'Administrator');
  const [adminPhone, setAdminPhone] = useState(user?.phone || '9515159006');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const { showSuccess, showError } = useToast();

  const loadSettings = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
      setMinOrder(data.min_order_amount ?? 99);
      setFreeThreshold(data.free_delivery_threshold ?? 499);
      setStandardFee(data.standard_delivery_fee ?? 39);
      setExpressFee(data.express_delivery_fee ?? 59);
      setWhatsappNumber(data.whatsapp_number || '919515159006');
      setAnnouncementText(data.announcement_text || '');

      try {
        const parsed = JSON.parse(data.active_slots_json || '[]');
        setDeliverySlots(
          Array.isArray(parsed) && parsed.length > 0
            ? parsed
            : [
                'Express Delivery (15-30 Mins)',
                'Morning Slot (7:00 AM - 9:30 AM)',
                'Evening Slot (5:30 PM - 8:00 PM)',
              ]
        );
      } catch {
        setDeliverySlots([
          'Express Delivery (15-30 Mins)',
          'Morning Slot (7:00 AM - 9:30 AM)',
          'Evening Slot (5:30 PM - 8:00 PM)',
        ]);
      }

      if (isManual) {
        showSuccess('Store configuration updated from Cloudflare D1.', 'Synchronized');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to load store settings.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleAddSlot = () => {
    if (!newSlotText.trim()) return;
    setDeliverySlots([...deliverySlots, newSlotText.trim()]);
    setNewSlotText('');
  };

  const handleRemoveSlot = (index: number) => {
    setDeliverySlots(deliverySlots.filter((_, i) => i !== index));
  };

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateSettings({
        min_order_amount: Number(minOrder),
        free_delivery_threshold: Number(freeThreshold),
        standard_delivery_fee: Number(standardFee),
        express_delivery_fee: Number(expressFee),
        whatsapp_number: whatsappNumber.replace(/\D/g, ''),
        announcement_text: announcementText.trim(),
        active_slots_json: JSON.stringify(deliverySlots),
      });

      showSuccess('Store configuration saved to Cloudflare D1.', 'Settings Saved');
      loadSettings();
    } catch (err: any) {
      showError(err.message || 'Failed to save store settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      showError('New passwords do not match.');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      showError('New password must be at least 6 characters.');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const payload: { name?: string; phone?: string; password?: string } = {
        name: adminName.trim(),
        phone: adminPhone.trim(),
      };
      if (newPassword) {
        payload.password = newPassword;
      }

      await api.updateProfile(payload);
      showSuccess('Admin profile credentials updated successfully.', 'Profile Updated');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showError(err.message || 'Failed to update credentials.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Reading settings from Cloudflare D1 database..." size="lg" />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl border border-[#E6E7DD] shadow-sm flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#26352B] font-serif">System Settings & Store Preferences</h2>
          <p className="text-xs text-[#778176]">
            Configure business identity, shipping rules, WhatsApp dispatch, and security credentials
          </p>
        </div>

        <button
          onClick={() => loadSettings(true)}
          disabled={isRefreshing}
          className="p-2 rounded-xl border border-[#E6E7DD] text-[#778176] hover:text-[#26352B] hover:bg-[#F6F5EF] transition-colors"
          title="Refresh Settings"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#244B37]' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E6E7DD] flex items-center gap-6">
        {[
          { id: 'profile', label: 'Store Profile & Notice', icon: Store },
          { id: 'delivery', label: 'Delivery & Pricing Rules', icon: Truck },
          { id: 'whatsapp', label: 'WhatsApp Order Desk', icon: Phone },
          { id: 'security', label: 'Admin Security', icon: ShieldCheck },
          { id: 'ai_quota', label: 'AI Provider Quota', icon: Cpu },
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

      {/* Tab 1: Store Profile & Notice */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveStoreSettings} className="space-y-5">
          <div className="bg-white rounded-2xl p-6 border border-[#E6E7DD] shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E6E7DD]">
              <div className="w-8 h-8 rounded-lg bg-[#F6F5EF] text-[#244B37] flex items-center justify-center">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#26352B]">Business Identity</h3>
                <p className="text-xs text-[#778176]">Storefront brand details and customer notice banner</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                  Business / Store Name
                </label>
                <input
                  type="text"
                  disabled
                  value="Sri Adithya Organics"
                  className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] bg-[#F6F5EF] text-xs font-semibold text-[#26352B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                  Brand Specialization
                </label>
                <input
                  type="text"
                  disabled
                  value="Traditional Wood-Pressed Oils & Organic Farm Produce"
                  className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] bg-[#F6F5EF] text-xs font-semibold text-[#778176]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                Customer Storefront Announcement Banner
              </label>
              <textarea
                rows={2}
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="e.g. Free delivery on cold-pressed sesame and groundnut oils across Bangalore on orders above ₹499!"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E7DD] text-xs text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
              <p className="text-[11px] text-[#778176] mt-1">
                Displays prominently at the top of the customer website. Leave blank to hide.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-[#244B37] hover:bg-[#1b3829] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Banner Notice</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab 2: Delivery & Pricing Rules */}
      {activeTab === 'delivery' && (
        <form onSubmit={handleSaveStoreSettings} className="space-y-5">
          <div className="bg-white rounded-2xl p-6 border border-[#E6E7DD] shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E6E7DD]">
              <div className="w-8 h-8 rounded-lg bg-[#F6F5EF] text-[#244B37] flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#26352B]">Delivery Pricing Parameters</h3>
                <p className="text-xs text-[#778176]">Cart calculations, free thresholds, and delivery windows</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                  Standard Delivery Fee (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={standardFee}
                  onChange={(e) => setStandardFee(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-bold text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                  Express Delivery Fee (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={expressFee}
                  onChange={(e) => setExpressFee(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-bold text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                  Free Delivery Threshold (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={freeThreshold}
                  onChange={(e) => setFreeThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-[#244B37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                  Minimum Order Amount (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={minOrder}
                  onChange={(e) => setMinOrder(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-bold text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#E6E7DD]">
              <label className="block text-xs font-semibold text-[#26352B] mb-2">
                Available Delivery Time Windows
              </label>
              <div className="space-y-2 mb-3">
                {deliverySlots.map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#496B45]" />
                      <span className="font-semibold text-[#26352B]">{slot}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot(index)}
                      className="p-1 text-[#778176] hover:text-rose-700 transition-colors"
                      title="Remove Slot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. Afternoon Slot (1:00 PM - 3:30 PM)"
                  value={newSlotText}
                  onChange={(e) => setNewSlotText(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
                />
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="px-3.5 py-2 rounded-xl border border-[#E6E7DD] bg-[#F6F5EF] text-xs font-semibold text-[#26352B] hover:bg-[#E6E7DD] transition-colors"
                >
                  Add Slot
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-[#244B37] hover:bg-[#1b3829] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Delivery Configuration</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab 3: WhatsApp Order Desk */}
      {activeTab === 'whatsapp' && (
        <form onSubmit={handleSaveStoreSettings} className="space-y-5">
          <div className="bg-white rounded-2xl p-6 border border-[#E6E7DD] shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E6E7DD]">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#26352B]">WhatsApp Ordering Desk</h3>
                <p className="text-xs text-[#778176]">
                  Customer orders and click-to-chat links will dispatch directly to this business number
                </p>
              </div>
            </div>

            <div className="max-w-md">
              <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                WhatsApp Phone Number (with Country Code) *
              </label>
              <input
                type="text"
                required
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="e.g. 919515159006"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E7DD] text-xs font-mono font-bold text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
              <p className="text-[11px] text-[#778176] mt-1.5">
                Format: 12 numeric digits without hyphens or spaces, e.g. <code>919515159006</code> for India (+91).
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#26352B]">Live WhatsApp Dispatch Link</p>
                <p className="text-[11px] text-[#778176] font-mono mt-0.5">
                  https://wa.me/{whatsappNumber.replace(/\D/g, '')}
                </p>
              </div>
              <a
                href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                <span>Test Chat Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-[#244B37] hover:bg-[#1b3829] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save WhatsApp Configuration</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab 4: Admin Security & Password */}
      {activeTab === 'security' && (
        <form onSubmit={handleUpdateProfile} className="space-y-5">
          <div className="bg-white rounded-2xl p-6 border border-[#E6E7DD] shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E6E7DD]">
              <div className="w-8 h-8 rounded-lg bg-[#F6F5EF] text-[#244B37] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#26352B]">Administrator Credentials & Profile</h3>
                <p className="text-xs text-[#778176]">Manage administrator account access, contact details, and password</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                  Admin Name *
                </label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-semibold text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-semibold text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#E6E7DD]">
              <h4 className="text-xs font-bold text-[#26352B] mb-2 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#496B45]" />
                <span>Change Administrator Password</span>
              </h4>
              <p className="text-[11px] text-[#778176] mb-3">
                Leave blank if you do not wish to change your password.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
                  />
                </div>
              </div>
            </div>

            {/* Cloudflare D1 Info Pill */}
            <div className="p-3.5 rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] flex items-center gap-2.5 text-xs text-[#778176]">
              <Database className="w-4 h-4 text-[#244B37] shrink-0" />
              <span>
                Connected to <strong className="text-[#26352B]">Cloudflare D1</strong> (Binding: <code>DB</code>, Database ID: <code>ba45ad6e...</code>). Credentials hashed with bcrypt.
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="px-5 py-2 rounded-xl bg-[#244B37] hover:bg-[#1b3829] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2"
              >
                {isUpdatingProfile ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Update Credentials</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab 5: AI Provider Quota & Health */}
      {activeTab === 'ai_quota' && (
        <div className="bg-white rounded-2xl p-6 border border-[#E6E7DD] shadow-sm">
          <AIProviderQuotaSection />
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
