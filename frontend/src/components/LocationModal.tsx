import React, { useState, useEffect } from 'react';
import {
  X, MapPin, Check, Plus, Home, Briefcase, Building, Navigation,
  AlertCircle, Loader2, Sparkles, Shield
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
    deliveryMinutes
  } = useLocation();

  const { user } = useAuth();
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [customPin, setCustomPin] = useState('');
  const [customArea, setCustomArea] = useState('');

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

          <div className="mt-5 space-y-5">

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

            {/* Action 1: Geolocation Browser Detection */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rootly-sageMist/50 to-rootly-cream border border-rootly-sage/40">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rootly-forest text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Navigation className="w-5 h-5 text-rootly-sagePale" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">Detect My Current Location</h4>
                    <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                      Uses browser GPS with your permission to resolve your exact locality and check live delivery availability.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={detectCurrentLocation}
                disabled={isDetectingLocation}
                className="mt-3.5 w-full py-2.5 px-4 rounded-xl bg-rootly-forest hover:bg-rootly-dark active:scale-[0.98] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isDetectingLocation ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-rootly-sagePale" />
                    <span>Detecting Coordinates & Verifying Hub...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4 text-rootly-sagePale" />
                    <span>Use My Current Location</span>
                  </>
                )}
              </button>
            </div>

            {/* Saved Addresses (if logged in) */}
            {user && savedAddresses.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2.5">Your Saved Addresses</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedAddress?.id === addr.id;
                    const Icon = addr.label.toLowerCase() === 'work' ? Briefcase : addr.label.toLowerCase() === 'home' ? Home : Building;
                    return (
                      <button
                        key={addr.id}
                        onClick={() => setSelectedAddress(addr)}
                        className={`w-full p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                          isSelected
                            ? 'border-rootly-forest bg-rootly-sageMist/30 shadow-sm'
                            : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                        }`}
                      >
                        <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-rootly-forest text-white' : 'bg-white border text-stone-600'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-stone-900">{addr.label}</span>
                            {isSelected && <span className="text-[10px] font-bold text-rootly-forest bg-white px-2 py-0.5 rounded border border-rootly-sage/50">Active</span>}
                          </div>
                          <p className="text-xs text-stone-600 truncate mt-0.5">{addr.street}</p>
                          <p className="text-[11px] text-stone-400">{addr.city} - {addr.postal_code}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Enter Postal PIN Code manually */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Or Enter 6-Digit Indian Postal PIN Code</h4>
              <form onSubmit={handleCustomSubmit} className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={customPin}
                  onChange={(e) => setCustomPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 560038 / 641002"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold focus:outline-none focus:border-rootly-forest placeholder-stone-400"
                />
                <button
                  type="submit"
                  disabled={customPin.length !== 6}
                  className="px-5 py-2.5 rounded-xl bg-rootly-forest text-white text-xs font-bold disabled:opacity-40 hover:bg-rootly-dark transition-all shrink-0"
                >
                  Deliver Here
                </button>
              </form>
            </div>

            {/* Popular Express Hubs */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Sri Adithya Fulfillment Hubs</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {POPULAR_LOCALITIES.map((loc) => (
                  <button
                    key={loc.pin}
                    onClick={() => setCustomLocation(loc.name, loc.pin)}
                    className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-rootly-sageMist/40 hover:border-rootly-sage/60 text-left transition-all group"
                  >
                    <p className="text-xs font-bold text-stone-800 group-hover:text-rootly-forest truncate">{loc.name}</p>
                    <p className="text-[10px] text-stone-500">{loc.city}</p>
                    <p className="text-[10px] font-mono text-stone-400">{loc.pin}</p>
                  </button>
                ))}
              </div>
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


