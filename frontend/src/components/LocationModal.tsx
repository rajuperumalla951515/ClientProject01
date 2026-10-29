import React, { useState, useEffect } from 'react';
import {
  X, MapPin, Check, Plus, Home, Briefcase, Building, Navigation,
  AlertCircle, Loader2, Shield, ChevronDown, ChevronUp, Zap, Truck, Phone, User as UserIcon
} from 'lucide-react';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Address } from '../types';

const POPULAR_LOCALITIES = [
  { name: 'Indiranagar', city: 'Bengaluru', pin: '560038' },
  { name: 'Koramangala', city: 'Bengaluru', pin: '560034' },
  { name: 'Whitefield', city: 'Bengaluru', pin: '560066' },
  { name: 'HSR Layout', city: 'Bengaluru', pin: '560102' },
  { name: 'RS Puram', city: 'Coimbatore', pin: '641002' },
  { name: 'Adyar', city: 'Chennai', pin: '600020' },
  { name: 'Banjara Hills', city: 'Hyderabad', pin: '500034' },
  { name: 'Bandra West', city: 'Mumbai', pin: '400050' },
];

export const LocationModal: React.FC = () => {
  const {
    isLocationModalOpen,
    closeLocationModal,
    selectedDeliveryAddress,
    selectSavedAddress,
    setManualDeliveryAddress,
    setPresetHubLocation,
    detectCurrentLocation,
    isDetectingLocation,
    locationError,
    clearLocationError,
    locationLabel,
    deliveryMinutes,
    serviceHub,
  } = useLocation();

  const { user } = useAuth();
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [quickPin, setQuickPin] = useState('');
  const [quickArea, setQuickArea] = useState('');
  
  // Alternative address state
  const [activeTab, setActiveTab] = useState<'quick' | 'full_address'>('quick');
  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [addressLabel, setAddressLabel] = useState('Home');
  const [recipientName, setRecipientName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [apartment, setApartment] = useState('');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [state, setState] = useState('Karnataka');
  const [postalCode, setPostalCode] = useState(selectedDeliveryAddress.postal_code || '');
  const [saveToAccount, setSaveToAccount] = useState(Boolean(user));

  useEffect(() => {
    if (user && isLocationModalOpen) {
      api.getAddresses().then(setSavedAddresses).catch(console.error);
      if (!recipientName) setRecipientName(user.name);
      if (!phone && user.phone) setPhone(user.phone);
    }
  }, [user, isLocationModalOpen]);

  if (!isLocationModalOpen) return null;

  const handleQuickPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quickPin.length === 6 && /^\d{6}$/.test(quickPin)) {
      await setPresetHubLocation(quickArea.trim() || `Sector ${quickPin}`, quickPin);
      setQuickPin('');
      setQuickArea('');
    }
  };

  const handleFullAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanPin = postalCode.trim();
    if (cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      setFormError('Please enter a valid 6-digit Indian PIN code.');
      return;
    }

    if (!street.trim()) {
      setFormError('Please enter street or locality.');
      return;
    }

    if (!recipientName.trim()) {
      setFormError('Please enter recipient name.');
      return;
    }

    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSubmittingAddress(true);
    const success = await setManualDeliveryAddress({
      label: addressLabel,
      recipient_name: recipientName.trim(),
      phone: phone.trim(),
      apartment: apartment.trim() || undefined,
      street: street.trim(),
      landmark: landmark.trim() || undefined,
      city: city.trim() || 'Bengaluru',
      state: state.trim() || 'Karnataka',
      postal_code: cleanPin,
      country: 'India',
      saveToAccount: user ? saveToAccount : false,
    });
    setIsSubmittingAddress(false);

    if (success) {
      closeLocationModal();
    }
  };

  const isExpress = deliveryMinutes <= 30;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div onClick={closeLocationModal} className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity" />

      {/* Container: Bottom Sheet on Mobile, Centered Modal on sm+ */}
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="relative w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col animate-fadeIn">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-stone-100 shrink-0">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rootly-forest bg-rootly-sageMist px-2 py-0.5 rounded-full">
                  Delivery Destination
                </span>
              </div>
              <h3 className="font-display font-black text-xl text-stone-900 mt-1">
                Choose Delivery Address
              </h3>
            </div>
            <button
              type="button"
              onClick={closeLocationModal}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">

            {/* Error Notification Banner if Permission Denied or Timeout */}
            {locationError && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{locationError}</p>
                  <p className="text-[11px] text-amber-800/80 mt-0.5">
                    You can enter your postal PIN code or address manually below.
                  </p>
                </div>
                <button onClick={clearLocationError} className="text-amber-700 hover:text-amber-950">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* 1. Currently Active Selected Delivery Address Card */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 shadow-sm flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-rootly-forest text-white flex items-center justify-center shrink-0 shadow-sm">
                  <MapPin className="w-5 h-5 text-emerald-300" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Currently Selected for Delivery
                    </span>
                    <span className="text-[10px] font-semibold text-stone-400">
                      ({selectedDeliveryAddress.source.replace('_', ' ')})
                    </span>
                  </div>
                  <p className="text-sm font-bold text-stone-900 mt-1 leading-snug">
                    {locationLabel}
                  </p>
                  <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5 flex-wrap">
                    <span>{serviceHub}</span>
                    <span>•</span>
                    {isExpress ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                        <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span>Express {deliveryMinutes} Mins Delivery</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-stone-600 font-medium">
                        <Truck className="w-3 h-3 text-rootly-forest" />
                        <span>Pan-India Courier (2-3 Days)</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeLocationModal}
                className="px-3.5 py-2 rounded-xl bg-rootly-forest text-white text-xs font-bold hover:bg-rootly-dark shrink-0 transition-colors shadow-sm self-center sm:self-auto"
              >
                Deliver Here
              </button>
            </div>

            {/* 2. Action: Detect Live GPS Location */}
            <button
              type="button"
              onClick={() => detectCurrentLocation(true)}
              disabled={isDetectingLocation}
              className="w-full py-3 px-4 rounded-xl border border-rootly-forest/30 bg-rootly-sageMist/30 hover:bg-rootly-sageMist/60 text-rootly-forest text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isDetectingLocation ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-rootly-forest" />
                  <span>Detecting exact coordinates via GPS...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 text-rootly-forest" />
                  <span>Detect My Current Location (GPS)</span>
                </>
              )}
            </button>

            {/* 3. Saved Addresses Section (if logged in) */}
            {user && savedAddresses.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Your Saved Addresses
                  </h4>
                  <span className="text-[11px] text-stone-400">
                    {savedAddresses.length} saved
                  </span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedDeliveryAddress.id === addr.id;
                    const Icon = addr.label.toLowerCase() === 'work' ? Briefcase : addr.label.toLowerCase() === 'home' ? Home : Building;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => selectSavedAddress(addr)}
                        className={`p-3 rounded-2xl border cursor-pointer text-left flex items-start justify-between gap-3 transition-all ${
                          isSelected
                            ? 'border-rootly-forest bg-rootly-sageMist/30 shadow-sm'
                            : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-rootly-forest text-white' : 'bg-white border text-stone-600'}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-stone-900">{addr.label}</span>
                              {isSelected && (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                                  Selected
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-medium text-stone-800 mt-0.5">
                              {addr.recipient_name} ({addr.phone})
                            </p>
                            <p className="text-xs text-stone-500 truncate mt-0.5">
                              {addr.street}, {addr.apartment || ''}
                            </p>
                            <p className="text-[11px] text-stone-400 font-mono">
                              {addr.city} - {addr.postal_code}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectSavedAddress(addr);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-rootly-forest text-white'
                              : 'bg-white border border-stone-200 text-stone-700 hover:border-rootly-forest hover:text-rootly-forest'
                          }`}
                        >
                          {isSelected ? 'Delivering' : 'Select'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Alternative Address Section Toggle (Quick PIN or Detailed Form) */}
            <div className="pt-3 border-t border-stone-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                  Deliver to another address?
                </h4>
                <div className="flex rounded-lg bg-stone-100 p-0.5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveTab('quick')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      activeTab === 'quick' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    Quick PIN
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('full_address')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      activeTab === 'full_address' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    Full Address Form
                  </button>
                </div>
              </div>

              {/* TAB A: QUICK PIN CODE CHECK */}
              {activeTab === 'quick' && (
                <div className="space-y-3 animate-fadeIn">
                  <p className="text-xs text-stone-500">
                    Enter any 6-digit Indian Postal PIN code to check serviceability and set your delivery area.
                  </p>
                  <form onSubmit={handleQuickPinSubmit} className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={quickPin}
                      onChange={(e) => setQuickPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-Digit PIN (e.g. 560038)"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-rootly-forest placeholder-stone-400"
                    />
                    <button
                      type="submit"
                      disabled={quickPin.length !== 6}
                      className="px-5 py-2.5 rounded-xl bg-rootly-forest text-white text-xs font-bold disabled:opacity-40 hover:bg-rootly-dark transition-all shrink-0 shadow-sm"
                    >
                      Set PIN
                    </button>
                  </form>

                  {/* Popular Express Hubs Chips */}
                  <div>
                    <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">
                      Or Choose from Express Logistics Hubs:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {POPULAR_LOCALITIES.map((loc) => (
                        <button
                          key={loc.pin}
                          type="button"
                          onClick={() => setPresetHubLocation(loc.name, loc.pin)}
                          className="p-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-rootly-sageMist/40 hover:border-rootly-sage/60 text-left transition-all group"
                        >
                          <p className="text-xs font-bold text-stone-800 group-hover:text-rootly-forest truncate">
                            {loc.name}
                          </p>
                          <p className="text-[10px] text-stone-500 truncate">{loc.city}</p>
                          <p className="text-[10px] font-mono text-stone-400">{loc.pin}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB B: COMPLETE ALTERNATIVE ADDRESS ENTRY FORM */}
              {activeTab === 'full_address' && (
                <form onSubmit={handleFullAddressSubmit} className="space-y-3 animate-fadeIn">
                  {formError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        Address Label
                      </label>
                      <select
                        value={addressLabel}
                        onChange={(e) => setAddressLabel(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold bg-white"
                      >
                        <option value="Home">Home</option>
                        <option value="Work">Work</option>
                        <option value="Parents">Parents</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        Recipient Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Full name"
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        Contact Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="10-digit mobile"
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        Flat / House / Building No.
                      </label>
                      <input
                        type="text"
                        value={apartment}
                        onChange={(e) => setApartment(e.target.value)}
                        placeholder="e.g. Flat 402, Green Glen Towers"
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        Street / Locality *
                      </label>
                      <input
                        type="text"
                        required
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="e.g. 100 Feet Road, Indiranagar"
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        Landmark (Optional)
                      </label>
                      <input
                        type="text"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        placeholder="e.g. Near Sony Center"
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City"
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        State *
                      </label>
                      <input
                        type="text"
                        required
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="State"
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        6-Digit PIN Code *
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="560038"
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  {user && (
                    <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                      <input
                        type="checkbox"
                        checked={saveToAccount}
                        onChange={(e) => setSaveToAccount(e.target.checked)}
                        className="w-4 h-4 rounded text-rootly-forest focus:ring-rootly-forest"
                      />
                      <span className="text-xs font-medium text-stone-700">
                        Save this address to my account for future orders
                      </span>
                    </label>
                  )}

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isSubmittingAddress}
                      className="flex-1 py-3 px-4 rounded-xl bg-rootly-forest hover:bg-rootly-dark text-white font-bold text-xs shadow-lift flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isSubmittingAddress ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Validating & Setting Address...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Confirm & Deliver to this Address</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('quick')}
                      className="px-4 py-3 rounded-xl border border-stone-200 text-stone-600 font-semibold text-xs hover:bg-stone-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>

          {/* Privacy Promise Footer */}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400 shrink-0">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-stone-400" />
              <span>We never track you or store coordinates without consent.</span>
            </span>
            <span className="font-semibold text-rootly-forest">FSSAI Certified</span>
          </div>

        </div>
      </div>
    </div>
  );
};
