import React, { useEffect, useState } from 'react';
import {
  Truck,
  MapPin,
  Clock,
  IndianRupee,
  Plus,
  Trash2,
  Edit2,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api';
import { StoreSettings, DeliveryZone } from '../types';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';

export const DeliveryPage: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Settings State Form
  const [minOrder, setMinOrder] = useState<number>(99);
  const [freeThreshold, setFreeThreshold] = useState<number>(499);
  const [standardFee, setStandardFee] = useState<number>(39);
  const [expressFee, setExpressFee] = useState<number>(59);
  const [deliverySlots, setDeliverySlots] = useState<string[]>([]);
  const [newSlotInput, setNewSlotInput] = useState('');

  // Zone Modal State
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zonePincodes, setZonePincodes] = useState('');
  const [zoneExtraFee, setZoneExtraFee] = useState<number>(0);
  const [zoneEstTime, setZoneEstTime] = useState('15-30 Mins');
  const [zoneIsActive, setZoneIsActive] = useState(true);
  const [isSavingZone, setIsSavingZone] = useState(false);

  // Zone Delete State
  const [zoneToDelete, setZoneToDelete] = useState<DeliveryZone | null>(null);
  const [isDeletingZone, setIsDeletingZone] = useState(false);

  const { showSuccess, showError } = useToast();

  const loadData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [settingsData, zonesData] = await Promise.all([
        api.getSettings(),
        api.getDeliveryZones(),
      ]);

      setSettings(settingsData);
      setMinOrder(settingsData.min_order_amount ?? 99);
      setFreeThreshold(settingsData.free_delivery_threshold ?? 499);
      setStandardFee(settingsData.standard_delivery_fee ?? 39);
      setExpressFee(settingsData.express_delivery_fee ?? 59);

      try {
        const parsed = JSON.parse(settingsData.active_slots_json || '[]');
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

      setZones(zonesData);
      if (isManual) {
        showSuccess('Delivery configurations synced from Cloudflare D1.', 'Synchronized');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to load delivery parameters.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveFeeSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await api.updateSettings({
        min_order_amount: Number(minOrder),
        free_delivery_threshold: Number(freeThreshold),
        standard_delivery_fee: Number(standardFee),
        express_delivery_fee: Number(expressFee),
        active_slots_json: JSON.stringify(deliverySlots),
      });
      showSuccess('Delivery fees and delivery time slots saved to D1 database.', 'Settings Saved');
      loadData();
    } catch (err: any) {
      showError(err.message || 'Failed to update delivery settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddSlot = () => {
    if (!newSlotInput.trim()) return;
    setDeliverySlots([...deliverySlots, newSlotInput.trim()]);
    setNewSlotInput('');
  };

  const handleRemoveSlot = (index: number) => {
    setDeliverySlots(deliverySlots.filter((_, i) => i !== index));
  };

  // Zone Management
  const openAddZoneModal = () => {
    setEditingZone(null);
    setZoneName('');
    setZonePincodes('');
    setZoneExtraFee(0);
    setZoneEstTime('15-30 Mins');
    setZoneIsActive(true);
    setIsZoneModalOpen(true);
  };

  const openEditZoneModal = (z: DeliveryZone) => {
    setEditingZone(z);
    setZoneName(z.area_name || z.name || '');
    setZonePincodes(z.pincode || z.pincodes || '');
    setZoneExtraFee(z.delivery_fee ?? z.extra_delivery_fee ?? 0);
    setZoneEstTime(z.estimated_delivery_time || z.estimated_time || '15-30 Mins');
    setZoneIsActive(z.is_active);
    setIsZoneModalOpen(true);
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim() || !zonePincodes.trim()) {
      showError('Zone name and serviceable pincodes are required.');
      return;
    }

    setIsSavingZone(true);
    try {
      const payload: Partial<DeliveryZone> = {
        area_name: zoneName.trim(),
        name: zoneName.trim(),
        pincode: zonePincodes.trim(),
        pincodes: zonePincodes.trim(),
        delivery_fee: Number(zoneExtraFee),
        extra_delivery_fee: Number(zoneExtraFee),
        estimated_delivery_time: zoneEstTime.trim(),
        estimated_time: zoneEstTime.trim(),
        is_active: zoneIsActive,
      };

      if (editingZone) {
        await api.updateDeliveryZone(editingZone.id, payload);
        showSuccess(`Delivery zone "${zoneName}" updated.`, 'Zone Saved');
      } else {
        await api.createDeliveryZone(payload);
        showSuccess(`Delivery zone "${zoneName}" added.`, 'Zone Created');
      }
      setIsZoneModalOpen(false);
      loadData();
    } catch (err: any) {
      showError(err.message || 'Failed to save delivery zone.');
    } finally {
      setIsSavingZone(false);
    }
  };

  const handleToggleZoneActive = async (zone: DeliveryZone) => {
    try {
      await api.updateDeliveryZone(zone.id, { is_active: !zone.is_active });
      showSuccess(`Zone "${zone.area_name || zone.name}" ${zone.is_active ? 'deactivated' : 'activated'}.`);
      loadData();
    } catch (err: any) {
      showError(err.message || 'Failed to update zone status.');
    }
  };

  const handleDeleteZoneConfirm = async () => {
    if (!zoneToDelete) return;
    setIsDeletingZone(true);
    try {
      await api.deleteDeliveryZone(zoneToDelete.id);
      showSuccess(`Zone "${zoneToDelete.area_name || zoneToDelete.name}" deleted permanently.`);
      setZoneToDelete(null);
      loadData();
    } catch (err: any) {
      showError(err.message || 'Failed to delete delivery zone.');
    } finally {
      setIsDeletingZone(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Reading delivery rules and zones from Cloudflare D1..." />;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl border border-[#E6E7DD] shadow-sm flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#26352B] font-serif">Delivery & Fulfillment Operations</h2>
          <p className="text-xs text-[#778176]">
            Manage shipping fees, express slots, and Bangalore serviceable zone pincodes
          </p>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="p-2 rounded-xl border border-[#E6E7DD] text-[#778176] hover:text-[#26352B] hover:bg-[#F6F5EF] transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#244B37]' : ''}`} />
        </button>
      </div>

      {/* Section 1: Delivery Rules & Slots Form */}
      <form onSubmit={handleSaveFeeSettings} className="space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-[#E6E7DD] shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E6E7DD]">
            <div className="w-8 h-8 rounded-lg bg-[#F6F5EF] text-[#244B37] flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#26352B]">Storefront Delivery Fees & Thresholds</h3>
              <p className="text-xs text-[#778176]">
                Directly controls customer cart calculations and free shipping triggers
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                Standard Delivery Fee (₹) *
              </label>
              <div className="relative">
                <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#778176]" />
                <input
                  type="number"
                  min="0"
                  required
                  value={standardFee}
                  onChange={(e) => setStandardFee(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-bold text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
                />
              </div>
              <p className="text-[10px] text-[#778176] mt-1">Default cart charge</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                Express Delivery Fee (₹) *
              </label>
              <div className="relative">
                <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#778176]" />
                <input
                  type="number"
                  min="0"
                  required
                  value={expressFee}
                  onChange={(e) => setExpressFee(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-bold text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
                />
              </div>
              <p className="text-[10px] text-[#778176] mt-1">15-30 Min express delivery</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                Free Delivery Above (₹) *
              </label>
              <div className="relative">
                <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#778176]" />
                <input
                  type="number"
                  min="0"
                  required
                  value={freeThreshold}
                  onChange={(e) => setFreeThreshold(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-[#244B37]"
                />
              </div>
              <p className="text-[10px] text-[#778176] mt-1">Waives standard delivery</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                Minimum Cart Size (₹) *
              </label>
              <div className="relative">
                <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#778176]" />
                <input
                  type="number"
                  min="0"
                  required
                  value={minOrder}
                  onChange={(e) => setMinOrder(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-bold text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
                />
              </div>
              <p className="text-[10px] text-[#778176] mt-1">Prevents orders below this</p>
            </div>
          </div>

          {/* Delivery Time Slots */}
          <div className="pt-4 border-t border-[#E6E7DD]">
            <label className="block text-xs font-semibold text-[#26352B] mb-2">
              Customer Selectable Delivery Time Slots
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
                value={newSlotInput}
                onChange={(e) => setNewSlotInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
              <button
                type="button"
                onClick={handleAddSlot}
                className="px-3 py-2 rounded-xl border border-[#E6E7DD] bg-[#F6F5EF] text-xs font-semibold text-[#26352B] hover:bg-[#E6E7DD] transition-colors"
              >
                Add Slot
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-5 py-2 rounded-xl bg-[#244B37] hover:bg-[#1b3829] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2"
            >
              {isSavingSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Delivery Rules</span>
            </button>
          </div>
        </div>
      </form>

      {/* Section 2: Bangalore Serviceable Zones Table */}
      <div className="bg-white rounded-2xl p-6 border border-[#E6E7DD] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E6E7DD]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#26352B]">Serviceable Bangalore Delivery Hubs & Pincodes</h3>
              <p className="text-xs text-[#778176]">
                Active regions with customized transit windows and zone surcharges
              </p>
            </div>
          </div>

          <button
            onClick={openAddZoneModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#244B37] hover:bg-[#1b3829] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Zone</span>
          </button>
        </div>

        {zones.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No Delivery Zones Configured"
            description="Add Bangalore regions and postal codes to configure hyperlocal delivery boundaries."
            action={{ label: 'Add First Zone', onClick: openAddZoneModal }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E6E7DD] text-[#778176] uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-semibold">Zone / Hub Name</th>
                  <th className="py-3 px-4 font-semibold">Covered Pincodes</th>
                  <th className="py-3 px-4 font-semibold">Transit Time</th>
                  <th className="py-3 px-4 font-semibold">Zone Fee</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E7DD]">
                {zones.map((zone) => (
                  <tr key={zone.id} className="hover:bg-[#F6F5EF]/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#26352B]">{zone.area_name || zone.name}</td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {(zone.pincode || zone.pincodes || '')
                          .split(',')
                          .map((p: string) => p.trim())
                          .filter(Boolean)
                          .map((pin: string, i: number) => (
                            <span
                              key={i}
                              className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#F6F5EF] text-[#26352B] border border-[#E6E7DD]"
                            >
                              {pin}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#496B45]">
                      {zone.estimated_delivery_time || zone.estimated_time || '15-30 Mins'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#26352B]">
                      {(zone.delivery_fee ?? zone.extra_delivery_fee ?? 0) > 0
                        ? `+ ₹${zone.delivery_fee ?? zone.extra_delivery_fee}`
                        : 'Free'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleZoneActive(zone)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                          zone.is_active
                            ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                        }`}
                      >
                        {zone.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditZoneModal(zone)}
                          className="p-1.5 text-[#778176] hover:text-[#244B37] hover:bg-[#F6F5EF] rounded-lg transition-colors"
                          title="Edit Zone"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setZoneToDelete(zone)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Zone"
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
        )}
      </div>

      {/* Add / Edit Zone Modal */}
      <Modal
        isOpen={isZoneModalOpen}
        onClose={() => setIsZoneModalOpen(false)}
        title={editingZone ? `Edit Delivery Zone: ${editingZone.area_name || editingZone.name}` : 'Add New Serviceable Zone'}
        size="md"
      >
        <form onSubmit={handleSaveZone} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#26352B] mb-1">
              Zone / Hub Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. South Bangalore (Jayanagar, BTM, JP Nagar)"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-semibold text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#26352B] mb-1">
              Postal Pincodes (Comma separated) *
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. 560011, 560041, 560069, 560076, 560078"
              value={zonePincodes}
              onChange={(e) => setZonePincodes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-mono text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
            />
            <p className="text-[10px] text-[#778176] mt-1">
              When customer enters one of these pincodes, this zone's timing and fees will apply.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1">
                Estimated Transit Time
              </label>
              <input
                type="text"
                placeholder="e.g. 15-30 Mins or 1 Hour"
                value={zoneEstTime}
                onChange={(e) => setZoneEstTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1">
                Zone Surcharge (₹)
              </label>
              <input
                type="number"
                min="0"
                value={zoneExtraFee}
                onChange={(e) => setZoneExtraFee(Number(e.target.value))}
                placeholder="0 for standard rates"
                className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-bold text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#E6E7DD] flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#26352B]">Zone Status</p>
              <p className="text-[11px] text-[#778176]">Activate or pause order acceptance in this zone</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={zoneIsActive}
                onChange={(e) => setZoneIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#244B37]"></div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E6E7DD]">
            <button
              type="button"
              onClick={() => setIsZoneModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#E6E7DD] text-xs font-semibold text-[#778176] hover:bg-[#F6F5EF]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingZone}
              className="px-5 py-2 rounded-xl bg-[#244B37] hover:bg-[#1b3829] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2"
            >
              {isSavingZone && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingZone ? 'Save Zone' : 'Create Zone'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!zoneToDelete}
        onClose={() => setZoneToDelete(null)}
        onConfirm={handleDeleteZoneConfirm}
        title="Delete Delivery Zone?"
        message={`Are you sure you want to remove zone "${zoneToDelete?.area_name || zoneToDelete?.name}"? Pincode checks will fall back to general city rates.`}
        confirmText="Delete Zone"
        isDestructive
        isLoading={isDeletingZone}
      />
    </div>
  );
};

export default DeliveryPage;
