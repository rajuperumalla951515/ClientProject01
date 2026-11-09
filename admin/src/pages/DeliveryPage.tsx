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
import { StoreSettings, DeliveryZone, DistanceSlab } from '../types';
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

  // Store Fulfillment Hub & Delivery Distance State
  const [storeName, setStoreName] = useState('Sri Aditya Organics & Oil Mill');
  const [storeAddress, setStoreAddress] = useState('Jilla Parishad Complex, Babu Camp Road, Ganeshbasthi, Opp. Babu Camp Ramalayam');
  const [storeCity, setStoreCity] = useState('Kothagudem');
  const [storeDistrict, setStoreDistrict] = useState('Bhadradri Kothagudem');
  const [storeState, setStoreState] = useState('Telangana');
  const [storePincode, setStorePincode] = useState('507101');
  const [storeLat, setStoreLat] = useState<number>(17.5376);
  const [storeLon, setStoreLon] = useState<number>(80.6210);
  const [storeMapsUrl, setStoreMapsUrl] = useState('https://share.google/e1aO3V8FJQ7USIKzU');
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState<number>(60);
  const [maxExpressRadiusKm, setMaxExpressRadiusKm] = useState<number>(15);
  const [whatsappNumber, setWhatsappNumber] = useState('919515159006');

  // Dynamic Distance Pricing Slabs State
  const [distanceSlabs, setDistanceSlabs] = useState<DistanceSlab[]>([
    { min_km: 0, max_km: 2, fee: 20 },
    { min_km: 2, max_km: 4, fee: 30 },
    { min_km: 4, max_km: 6, fee: 40 },
    { min_km: 6, max_km: 8, fee: 50 },
    { min_km: 8, max_km: 10, fee: 60 },
    { min_km: 10, max_km: 15, fee: 75 },
    { min_km: 15, max_km: 35, fee: 99 },
    { min_km: 35, max_km: 60, fee: 149 },
  ]);
  const [newSlabMin, setNewSlabMin] = useState<number>(10);
  const [newSlabMax, setNewSlabMax] = useState<number>(15);
  const [newSlabFee, setNewSlabFee] = useState<number>(75);

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

      setStoreName(settingsData.store_name || 'Sri Aditya Organics & Oil Mill');
      setStoreAddress(settingsData.store_address || 'Jilla Parishad Complex, Babu Camp Road, Ganeshbasthi, Opp. Babu Camp Ramalayam');
      setStoreCity(settingsData.store_city || 'Kothagudem');
      setStoreDistrict(settingsData.store_district || 'Bhadradri Kothagudem');
      setStoreState(settingsData.store_state || 'Telangana');
      setStorePincode(settingsData.store_pincode || '507101');
      setStoreLat(settingsData.store_latitude ?? 17.5376);
      setStoreLon(settingsData.store_longitude ?? 80.6210);
      setStoreMapsUrl(settingsData.store_maps_url || 'https://share.google/e1aO3V8FJQ7USIKzU');
      setDeliveryRadiusKm(settingsData.delivery_radius_km ?? 60);
      setMaxExpressRadiusKm(settingsData.max_express_radius_km ?? 15);
      setWhatsappNumber(settingsData.whatsapp_number || '919515159006');

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

      if (settingsData.distance_slabs_json) {
        try {
          const parsed = JSON.parse(settingsData.distance_slabs_json);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDistanceSlabs(parsed);
          }
        } catch {}
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
        distance_slabs_json: JSON.stringify(distanceSlabs),
        store_name: storeName.trim(),
        store_address: storeAddress.trim(),
        store_city: storeCity.trim(),
        store_district: storeDistrict.trim(),
        store_state: storeState.trim(),
        store_pincode: storePincode.trim(),
        store_latitude: Number(storeLat),
        store_longitude: Number(storeLon),
        store_maps_url: storeMapsUrl.trim(),
        delivery_radius_km: Number(deliveryRadiusKm),
        max_express_radius_km: Number(maxExpressRadiusKm),
        whatsapp_number: whatsappNumber.trim(),
      });
      showSuccess('Delivery distance slabs, fees, and store location saved to D1.', 'Settings Saved');
      loadData();
    } catch (err: any) {
      showError(err.message || 'Failed to update delivery settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddSlab = () => {
    if (newSlabMin < 0 || newSlabMax <= newSlabMin || newSlabFee < 0) {
      showError('Please provide valid distance range (Min < Max) and positive fee.');
      return;
    }
    const updated = [...distanceSlabs, { min_km: newSlabMin, max_km: newSlabMax, fee: newSlabFee }].sort(
      (a, b) => a.min_km - b.min_km
    );
    setDistanceSlabs(updated);
    setNewSlabMin(newSlabMax);
    setNewSlabMax(newSlabMax + 5);
    setNewSlabFee(newSlabFee + 15);
  };

  const handleUpdateSlab = (index: number, field: keyof DistanceSlab, value: number) => {
    const updated = [...distanceSlabs];
    updated[index] = { ...updated[index], [field]: value };
    setDistanceSlabs(updated);
  };

  const handleRemoveSlab = (index: number) => {
    if (distanceSlabs.length <= 1) {
      showError('At least one distance slab is required for distance calculations.');
      return;
    }
    setDistanceSlabs(distanceSlabs.filter((_, i) => i !== index));
  };

  const handleResetDefaultSlabs = () => {
    setDistanceSlabs([
      { min_km: 0, max_km: 2, fee: 20 },
      { min_km: 2, max_km: 4, fee: 30 },
      { min_km: 4, max_km: 6, fee: 40 },
      { min_km: 6, max_km: 8, fee: 50 },
      { min_km: 8, max_km: 10, fee: 60 },
      { min_km: 10, max_km: 15, fee: 75 },
      { min_km: 15, max_km: 35, fee: 99 },
      { min_km: 35, max_km: 60, fee: 149 },
    ]);
    showSuccess('Reset to recommended distance pricing slabs (₹20, ₹30, ₹40, ₹50, ₹60...).');
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
            Manage shipping fees, express slots, store fulfillment coordinates, and Telangana serviceable zone pincodes
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

      {/* Section 1: Delivery Rules & Store Hub Form */}
      <form onSubmit={handleSaveFeeSettings} className="space-y-6">
        {/* Store Hub & Fulfillment Location Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#E6E7DD] shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E6E7DD]">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#26352B]">Telangana Fulfillment Hub & Delivery Radii</h3>
              <p className="text-xs text-[#778176]">
                Actual registered business location and Haversine distance boundaries (No Bangalore defaults)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                Hub / Business Name *
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g. Sri Adithya Organics Mill & Fulfilment Hub"
                className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-bold text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                Official Store WhatsApp Number *
              </label>
              <input
                type="text"
                required
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="e.g. 919515159006"
                className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-mono font-bold text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
              <p className="text-[10px] text-[#778176] mt-1">Orders sent to this WhatsApp account</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                Registered Street Address *
              </label>
              <input
                type="text"
                required
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="e.g. Jilla Parishad Complex, Babu Camp Road, Ganeshbasthi"
                className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-semibold text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#26352B] mb-1.5 flex items-center justify-between">
                <span>Store Google Maps Location Link (Official Store Location)</span>
                {storeMapsUrl && (
                  <a
                    href={storeMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-[#244B37] hover:underline flex items-center gap-1"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>View Store on Google Maps ↗</span>
                  </a>
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={storeMapsUrl}
                  onChange={(e) => setStoreMapsUrl(e.target.value)}
                  placeholder="https://share.google/e1aO3V8FJQ7USIKzU"
                  className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-mono text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
                />
                {storeMapsUrl && (
                  <a
                    href={storeMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-[#244B37] text-white text-xs font-semibold shrink-0 flex items-center gap-1 hover:bg-[#1b3829]"
                  >
                    <span>Open Map</span>
                  </a>
                )}
              </div>
              <p className="text-[10px] text-[#778176] mt-1">
                Official store: Sri Aditya Organics & Oil Mill, Kothagudem (507101). Delivery distance is calculated from this location.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                Hub PIN Code *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={storePincode}
                onChange={(e) => setStorePincode(e.target.value)}
                placeholder="507101"
                className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-mono font-bold text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                City *
              </label>
              <input
                type="text"
                required
                value={storeCity}
                onChange={(e) => setStoreCity(e.target.value)}
                placeholder="Kothagudem"
                className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-semibold text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                District / Region
              </label>
              <input
                type="text"
                value={storeDistrict}
                onChange={(e) => setStoreDistrict(e.target.value)}
                placeholder="Bhadradri Kothagudem"
                className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-semibold text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                State *
              </label>
              <input
                type="text"
                required
                value={storeState}
                onChange={(e) => setStoreState(e.target.value)}
                placeholder="Telangana"
                className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-semibold text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                Hub GPS Latitude
              </label>
              <input
                type="number"
                step="any"
                value={storeLat}
                onChange={(e) => setStoreLat(Number(e.target.value))}
                placeholder="17.5376"
                className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-mono text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                Hub GPS Longitude
              </label>
              <input
                type="number"
                step="any"
                value={storeLon}
                onChange={(e) => setStoreLon(Number(e.target.value))}
                placeholder="80.6210"
                className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-mono text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                Max Express Radius (km) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={maxExpressRadiusKm}
                onChange={(e) => setMaxExpressRadiusKm(Number(e.target.value))}
                placeholder="15"
                className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
              <p className="text-[10px] text-[#778176] mt-1">Within this distance: 15-30 min delivery</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
                Standard Delivery Radius (km) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={deliveryRadiusKm}
                onChange={(e) => setDeliveryRadiusKm(Number(e.target.value))}
                placeholder="60"
                className="w-full px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-bold text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
              />
              <p className="text-[10px] text-[#778176] mt-1">Beyond this: requires out-of-zone verification</p>
            </div>
          </div>
        </div>

        {/* Fees & Thresholds Card */}
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
        </div>

        {/* Distance-Based Delivery Pricing Slabs Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#E6E7DD] shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6E7DD]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#26352B]">Distance-Based Delivery Fee Slabs</h3>
                <p className="text-xs text-[#778176]">
                  Calculates customer delivery charges dynamically based on actual driving road distance from Sri Aditya Organics Mill
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetDefaultSlabs}
              className="text-xs font-semibold text-[#244B37] hover:underline self-start sm:self-auto"
            >
              Reset to Recommended Slabs
            </button>
          </div>

          {/* Slabs Table */}
          <div className="overflow-x-auto border border-[#E6E7DD] rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF9F5] border-b border-[#E6E7DD] text-[11px] font-bold text-[#778176] uppercase tracking-wider">
                  <th className="p-3">Distance Slab (km)</th>
                  <th className="p-3">Min Distance</th>
                  <th className="p-3">Max Distance</th>
                  <th className="p-3">Delivery Charge (₹)</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E7DD]">
                {distanceSlabs.map((slab, index) => (
                  <tr key={index} className="hover:bg-[#FAF9F5]/70 transition-colors">
                    <td className="p-3 font-bold text-[#26352B]">
                      {slab.min_km} – {slab.max_km} km
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={slab.min_km}
                        onChange={(e) => handleUpdateSlab(index, 'min_km', Number(e.target.value))}
                        className="w-20 px-2 py-1 rounded-lg border border-[#E6E7DD] text-xs font-mono text-[#26352B]"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={slab.max_km}
                        onChange={(e) => handleUpdateSlab(index, 'max_km', Number(e.target.value))}
                        className="w-20 px-2 py-1 rounded-lg border border-[#E6E7DD] text-xs font-mono text-[#26352B]"
                      />
                    </td>
                    <td className="p-3">
                      <div className="relative inline-block w-24">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={slab.fee}
                          onChange={(e) => handleUpdateSlab(index, 'fee', Number(e.target.value))}
                          className="w-full pl-6 pr-2 py-1 rounded-lg border border-[#E6E7DD] text-xs font-bold text-emerald-800 font-mono"
                        />
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveSlab(index)}
                        className="p-1 text-stone-400 hover:text-rose-700 transition-colors"
                        title="Remove Distance Slab"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Slab Row */}
          <div className="p-3.5 bg-[#FAF9F5] rounded-xl border border-[#E6E7DD] flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-[#26352B] whitespace-nowrap">Add New Distance Slab:</span>
            <div className="flex items-center gap-1.5 text-xs text-stone-600">
              <span>Min km:</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={newSlabMin}
                onChange={(e) => setNewSlabMin(Number(e.target.value))}
                className="w-16 px-2 py-1 rounded-lg border border-[#E6E7DD] text-xs font-mono bg-white"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-stone-600">
              <span>Max km:</span>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={newSlabMax}
                onChange={(e) => setNewSlabMax(Number(e.target.value))}
                className="w-16 px-2 py-1 rounded-lg border border-[#E6E7DD] text-xs font-mono bg-white"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-stone-600">
              <span>Fee (₹):</span>
              <input
                type="number"
                min="0"
                value={newSlabFee}
                onChange={(e) => setNewSlabFee(Number(e.target.value))}
                className="w-20 px-2 py-1 rounded-lg border border-[#E6E7DD] text-xs font-bold text-emerald-800 font-mono bg-white"
              />
            </div>
            <button
              type="button"
              onClick={handleAddSlab}
              className="px-3.5 py-1.5 rounded-lg bg-[#244B37] text-white text-xs font-semibold hover:bg-[#1b3829] transition-colors ml-auto flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Slab</span>
            </button>
          </div>

          <p className="text-[11px] text-[#778176] leading-relaxed">
            💡 Slabs are evaluated in order of distance. If customer order qualifies for Free Delivery (Subtotal ≥ ₹{freeThreshold}), distance fee is waived automatically. Deliveries exceeding the maximum configured distance ({deliveryRadiusKm} km) will be marked as unserviceable.
          </p>

          <div className="flex justify-end pt-3 border-t border-[#E6E7DD]">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-5 py-2.5 rounded-xl bg-[#244B37] hover:bg-[#1b3829] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2"
            >
              {isSavingSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Delivery Distance Rules & Pricing</span>
            </button>
          </div>
        </div>
      </form>

      {/* Section 2: Telangana Serviceable Zones Table */}
      <div className="bg-white rounded-2xl p-6 border border-[#E6E7DD] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E6E7DD]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#26352B]">Serviceable Telangana Delivery Hubs & Pincodes</h3>
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
            description="Add Telangana regions and postal codes to configure hyperlocal delivery boundaries."
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
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${zone.is_active
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
              placeholder="e.g. Hyderabad Central (Jubilee Hills, Banjara Hills, Madhapur)"
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
              placeholder="e.g. 500033, 500034, 500081, 500032, 500084"
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
