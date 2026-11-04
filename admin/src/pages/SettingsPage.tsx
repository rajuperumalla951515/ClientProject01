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
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { StoreSettings } from '../types';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useToast } from '../context/ToastContext';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form Fields
  const [minOrder, setMinOrder] = useState<number>(99);
  const [freeThreshold, setFreeThreshold] = useState<number>(499);
  const [standardFee, setStandardFee] = useState<number>(39);
  const [expressFee, setExpressFee] = useState<number>(59);
  const [whatsappNumber, setWhatsappNumber] = useState('919515159006');
  const [announcementText, setAnnouncementText] = useState('');
  const [deliverySlots, setDeliverySlots] = useState<string[]>([]);
  const [newSlotText, setNewSlotText] = useState('');

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
        setDeliverySlots(Array.isArray(parsed) ? parsed : []);
      } catch {
        setDeliverySlots([
          'Express Delivery (15-30 Mins)',
          'Morning Slot (7:00 AM - 9:30 AM)',
          'Evening Slot (5:30 PM - 8:00 PM)',
        ]);
      }

      if (isManual) {
        showSuccess('Store settings refreshed.', 'Updated');
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await api.updateSettings({
        min_order_amount: minOrder,
        free_delivery_threshold: freeThreshold,
        standard_delivery_fee: standardFee,
        express_delivery_fee: expressFee,
        whatsapp_number: whatsappNumber.replace(/\D/g, ''),
        announcement_text: announcementText,
        active_slots_json: JSON.stringify(deliverySlots),
      });

      showSuccess(
        'Store configuration saved successfully.',
        'Settings Saved'
      );
      loadSettings();
    } catch (err: any) {
      showError(err.message || 'Failed to save store settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Reading settings from database..." size="lg" />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Store & Delivery Configuration</h2>
          <p className="text-xs text-slate-500">
            Changes persist directly to central PostgreSQL database
          </p>
        </div>

        <button
          onClick={() => loadSettings(true)}
          disabled={isRefreshing}
          className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-700' : ''}`} />
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* WhatsApp Business Ordering Settings */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-card">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">WhatsApp Order Desk Number</h3>
              <p className="text-xs text-slate-500">
                Incoming orders and customer click-to-chat links will target this WhatsApp number
              </p>
            </div>
          </div>

          <div className="max-w-md">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              WhatsApp Phone Number (with Country Code) *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="e.g. 919515159006"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Format: 12 digits without symbols, e.g. <code>919515159006</code> for India (+91).
            </p>
          </div>
        </div>

        {/* Delivery Fees & Free Thresholds */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-card">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Delivery Charges & Thresholds</h3>
              <p className="text-xs text-slate-500">
                Configures dynamic cart fees and free delivery incentives
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Standard Delivery Fee (₹) *
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={standardFee}
                onChange={(e) => setStandardFee(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Express Delivery Fee (₹) *
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={expressFee}
                onChange={(e) => setExpressFee(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Free Delivery Above (₹) *
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={freeThreshold}
                onChange={(e) => setFreeThreshold(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Minimum Order Value (₹) *
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={minOrder}
                onChange={(e) => setMinOrder(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
          </div>
        </div>

        {/* Announcement Banner Text */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-card">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Store Announcement Banner</h3>
          <p className="text-xs text-slate-500 mb-3">
            Header broadcast text rendered across the top banner of the customer store
          </p>
          <textarea
            rows={2}
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            placeholder="e.g. Sri Adithya Organics • 100% Certified Organic • Free Delivery over ₹499"
            className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>

        {/* Active Delivery Slots Manager */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-card">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Active Delivery Slots</h3>
              <p className="text-xs text-slate-500">
                Slots presented to customers during checkout and WhatsApp order generation
              </p>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {deliverySlots.map((slot, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
              >
                <span className="font-semibold text-slate-800">{slot}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSlot(index)}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                  title="Remove Slot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newSlotText}
              onChange={(e) => setNewSlotText(e.target.value)}
              placeholder="e.g. Afternoon Slot (1:00 PM - 3:30 PM)"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
            <button
              type="button"
              onClick={handleAddSlot}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Slot</span>
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-800 hover:bg-brand-900 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? 'Saving...' : 'Save Store Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

