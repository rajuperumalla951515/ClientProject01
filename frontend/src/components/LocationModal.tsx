import React, { useState, useEffect } from 'react';
import {
  X, MapPin, Check, Plus, Home, Briefcase, Building, Navigation,
  AlertCircle, Loader2, Sparkles, Shield, ChevronDown, ChevronUp, Zap, Truck
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
    setSelectedAddress,
    setCustomLocation,
    selectedAddress,
    detectCurrentLocation,
    isDetectingLocation,
    locationError,
    clearLocationError,
    isServiceable,
    serviceHub,
    deliveryMinutes,
    locationLabel,
    pincode,

    // Live location prompt
    detectedLiveLocation,
    isPromptingLiveLocation,
    confirmLiveLocation,
    rejectLiveLocation,
  } = useLocation();

  const { user } = useAuth();
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [customPin, setCustomPin] = useState('');
  const [customArea, setCustomArea] = useState('');
  const [showOptionalLocation, setShowOptionalLocation] = useState(false);

  useEffect(() => {
    if (user && isLocationModalOpen) {
      api.getAddresses().then(setSavedAddresses).catch(console.error);
    }
  }, [user, isLocationModalOpen]);

  if (!isLocationModalOpen) return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPin.length === 6) {
      setCustomLocation(customArea.trim() || 'Selected Sector', customPin);
      setShowOptionalLocation(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div onClick={closeLocationModal} className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity" />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div className="relative w-full max-w-lg rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-stone-200 overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-stone-100">
            <div>
              <h3 className="font-display font-black text-lg text-stone-900">Delivery Location</h3>
              <p className="text-xs text-stone-500 mt-0.5">Dispatched fresh from Sri Adithya Organics local fulfillment hubs.</p>
            </div>
            <button
              onClick={closeLocationModal}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-5 space-y-4">

            {/* Error Notification Banner if Permission Denied or Timeout */}
            {locationError && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{locationError}</p>
                  <p className="text-[11px] text-amber-800/80 mt-0.5">You can safely choose or enter your postal PIN code manually below.</p>
                </div>
                <button onClick={clearLocationError} className="text-amber-700 hover:text-amber-950">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* PROMPT: If Live Location was Detected, Ask: "Do you want to deliver to this location?" */}
            {detectedLiveLocation && isPromptingLiveLocation && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-800 via-rootly-forest to-emerald-950 text-white shadow-xl border border-emerald-500/40 animate-fadeIn">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <Navigation className="w-5 h-5 text-emerald-300 animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-950 bg-emerald-300 px-2.5 py-0.5 rounded-full">
                        Live Location Found
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-white mt-1.5 leading-snug">
                      {detectedLiveLocation.locality}, {detectedLiveLocation.city} - {detectedLiveLocation.postal_code}
                    </h4>
                    <p className="text-xs text-emerald-100/90 mt-1 leading-relaxed">
                      Do you want Sri Adithya Organics to deliver all orders to this location?
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2 pt-2 border-t border-white/15">
                  <button
                    type="button"
                    onClick={() => confirmLiveLocation(detectedLiveLocation)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Check className="w-4 h-4 text-emerald-950" />
                    Yes, Deliver to this Location
                  </button>
                  <button
                    type="button"
                    onClick={rejectLiveLocation}
                    className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all text-center"
                  >
                    Choose Another
                  </button>
                </div>
              </div>
            )}

            {/* 1. Show ONLY the User's Active Location for Everything */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/90 shadow-sm flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-rootly-forest text-white flex items-center justify-center shrink-0 shadow-sm">
                  <MapPin className="w-5 h-5 text-rootly-sagePale" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Active Delivery Location
                    </span>
                  </div>
                  <p className="text-sm font-bold text-stone-900 mt-1 truncate">
                    {locationLabel}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5 truncate flex items-center gap-1">
                    <span>{serviceHub}</span>
                    <span>•</span>
                    {deliveryMinutes < 60 ? (
                      <span className="flex items-center gap-0.5 text-rootly-forest font-semibold">
                        <Zap className="w-3 h-3 text-amber-500" />
                        <span>Express {deliveryMinutes} Mins</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-stone-600">
                        <Truck className="w-3 h-3 text-rootly-forest" />
                        <span>Pan-India Courier</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeLocationModal}
                className="px-3.5 py-2 rounded-xl bg-rootly-forest text-white text-xs font-bold hover:bg-rootly-dark shrink-0 transition-colors shadow-sm"
              >
                Deliver Here
              </button>
            </div>

            {/* 2. Action: Detect Live GPS Location */}
            <button
              type="button"
              onClick={detectCurrentLocation}
              disabled={isDetectingLocation}
              className="w-full py-2.5 px-4 rounded-xl border border-rootly-forest/30 bg-rootly-sageMist/30 hover:bg-rootly-sageMist/60 text-rootly-forest text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isDetectingLocation ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-rootly-forest" />
                  <span>Detecting Coordinates via Live GPS...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 text-rootly-forest" />
                  <span>Use Live GPS Location</span>
                </>
              )}
            </button>

            {/* 3. OPTIONAL: Deliver to Another Location */}
            <div className="pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowOptionalLocation(!showOptionalLocation)}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-stone-50 transition-colors text-left"
              >
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    Deliver to another location?
                    <span className="text-stone-400 font-normal lowercase">(optional)</span>
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Click here to enter a different PIN code or choose another address.
                  </p>
                </div>
                <div className="p-1 rounded-lg text-stone-400 bg-stone-100">
                  {showOptionalLocation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {/* Collapsible Optional Section */}
              {showOptionalLocation && (
                <div className="mt-3 space-y-4 animate-fadeIn">
                  
                  {/* Enter Postal PIN Code manually */}
                  <div>
                    <h5 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Enter 6-Digit Indian Postal PIN Code</h5>
                    <form onSubmit={handleCustomSubmit} className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={customPin}
                        onChange={(e) => setCustomPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 500034 / 560038 / 641002"
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold focus:outline-none focus:border-rootly-forest placeholder-stone-400"
                      />
                      <button
                        type="submit"
                        disabled={customPin.length !== 6}
                        className="px-5 py-2.5 rounded-xl bg-rootly-forest text-white text-xs font-bold disabled:opacity-40 hover:bg-rootly-dark transition-all shrink-0"
                      >
                        Set Location
                      </button>
                    </form>
                  </div>

                  {/* Saved Addresses (if logged in) */}
                  {user && savedAddresses.length > 0 && (
                    <div>
                      <h5 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">Your Saved Addresses</h5>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {savedAddresses.map((addr) => {
                          const isSelected = selectedAddress?.id === addr.id;
                          const Icon = addr.label.toLowerCase() === 'work' ? Briefcase : addr.label.toLowerCase() === 'home' ? Home : Building;
                          return (
                            <button
                              key={addr.id}
                              onClick={() => {
                                setSelectedAddress(addr);
                                setShowOptionalLocation(false);
                              }}
                              className={`w-full p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                                isSelected
                                  ? 'border-rootly-forest bg-rootly-sageMist/30 shadow-sm'
                                  : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                              }`}
                            >
                              <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-rootly-forest text-white' : 'bg-white border text-stone-600'}`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-stone-900">{addr.label}</span>
                                  {isSelected && <span className="text-[10px] font-bold text-rootly-forest bg-white px-2 py-0.5 rounded border border-rootly-sage/50">Active</span>}
                                </div>
                                <p className="text-xs text-stone-600 truncate">{addr.street}</p>
                                <p className="text-[11px] text-stone-400">{addr.city} - {addr.postal_code}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Popular Express Hubs */}
                  <div>
                    <h5 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">Or Choose from Fulfillment Hubs</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {POPULAR_LOCALITIES.map((loc) => (
                        <button
                          key={loc.pin}
                          onClick={() => {
                            setCustomLocation(loc.name, loc.pin);
                            setShowOptionalLocation(false);
                          }}
                          className="p-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-rootly-sageMist/40 hover:border-rootly-sage/60 text-left transition-all group"
                        >
                          <p className="text-xs font-bold text-stone-800 group-hover:text-rootly-forest truncate">{loc.name}</p>
                          <p className="text-[10px] text-stone-500">{loc.city}</p>
                          <p className="text-[10px] font-mono text-stone-400">{loc.pin}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Privacy Promise Footer */}
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-stone-400" />
                We never store your live coordinates or track you.
              </span>
              <span className="font-medium text-rootly-forest">FSSAI Certified</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};


