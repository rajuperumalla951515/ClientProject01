import React, { useState } from 'react';
import {
  X, Navigation, Check, MapPin, Zap, Truck, AlertCircle,
  Building, Compass, CheckCircle2, RefreshCw
} from 'lucide-react';
import { useLocation } from '../context/LocationContext';
import { useStoreSettings } from '../context/SettingsContext';
import { InteractiveDeliveryMap } from './InteractiveDeliveryMap';

export const DeliveryConfirmationModal: React.FC = () => {
  const {
    detectedLocation,
    pinCoordinates,
    isConfirmingDeliveryLocation,
    isReverseGeocoding,
    accuracyLevel,
    updatePinCoordinates,
    confirmDeliveryToDetectedLocation,
    chooseAnotherAddress,
    dismissConfirmation,
  } = useLocation();

  const { settings } = useStoreSettings();
  const [flatNumber, setFlatNumber] = useState('');
  const [landmark, setLandmark] = useState('');

  if (!isConfirmingDeliveryLocation || !detectedLocation) {
    return null;
  }

  const localRadiusKm = settings?.delivery_radius_km || 60.0;
  const currentLat = pinCoordinates?.lat ?? detectedLocation.latitude;
  const currentLon = pinCoordinates?.lon ?? detectedLocation.longitude;
  const isCourier = detectedLocation.delivery_mode === 'nationwide_courier' || (detectedLocation.distance_km !== null && detectedLocation.distance_km !== undefined && detectedLocation.distance_km > localRadiusKm);
  const isExpress = !isCourier && detectedLocation.is_serviceable && detectedLocation.estimated_delivery_minutes > 0 && detectedLocation.estimated_delivery_minutes <= 30;

  const handleConfirm = () => {
    confirmDeliveryToDetectedLocation({
      flatNumber: flatNumber.trim() || undefined,
      landmark: landmark.trim() || undefined,
    });
  };

  // Accuracy badge styling and text
  const getAccuracyBadge = () => {
    switch (accuracyLevel) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>High GPS Precision (±{Math.round(detectedLocation.accuracy_meters || 15)}m)</span>
          </span>
        );
      case 'moderate':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Compass className="w-3.5 h-3.5 text-amber-600" />
            <span>Moderate Accuracy (±{Math.round(detectedLocation.accuracy_meters || 60)}m) • Drag pin to refine</span>
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Approximate Location • Please drag the pin to your exact building</span>
          </span>
        );
      case 'manual':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span>Pinpoint Adjusted on Map</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={dismissConfirmation}
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Container: Mobile-first bottom sheet, centered on tablet/desktop */}
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="relative w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-stone-200 animate-fadeIn max-h-[92vh] overflow-y-auto">
          
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-rootly-forest text-white flex items-center justify-center shadow-md shrink-0">
                <Navigation className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rootly-forest bg-rootly-sageMist/30 px-2 py-0.5 rounded-full border border-rootly-forest/20">
                    Live GPS Verification
                  </span>
                </div>
                <h3 className="font-display font-black text-lg sm:text-xl text-stone-900">
                  Is this your delivery location?
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissConfirmation}
              aria-label="Close"
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Interactive Map with Draggable Marker (MANDATORY REQUIREMENT) */}
          <div className="mt-3.5">
            <InteractiveDeliveryMap
              latitude={currentLat}
              longitude={currentLon}
              accuracyMeters={detectedLocation.accuracy_meters}
              onCoordinatesChange={updatePinCoordinates}
              height="220px"
              initialGpsLat={detectedLocation.initial_gps_lat}
              initialGpsLon={detectedLocation.initial_gps_lon}
            />
          </div>

          {/* Accuracy Badge Status Bar */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <div>{getAccuracyBadge()}</div>
            {isReverseGeocoding && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rootly-forest">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Updating address...</span>
              </span>
            )}
          </div>

          {/* Detected Address Details Card */}
          <div className="my-3.5 p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 shadow-soft space-y-2">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-rootly-forest shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-stone-900 leading-snug">
                  {detectedLocation.road ? `${detectedLocation.road}, ` : ''}
                  {detectedLocation.locality}, {detectedLocation.city}
                </p>
                <p className="text-xs font-mono font-semibold text-stone-600 mt-0.5">
                  PIN: {detectedLocation.postal_code} • {detectedLocation.state}, {detectedLocation.country}
                </p>
                {detectedLocation.formatted_address && (
                  <p className="text-[11px] text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                    {detectedLocation.formatted_address}
                  </p>
                )}
              </div>
            </div>

            {/* Logistics Service Hub, Road Distance and Delivery Fee */}
            <div className="pt-2 border-t border-stone-200/70 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <span className="font-bold text-stone-800 truncate">
                  {detectedLocation.is_serviceable ? detectedLocation.service_hub : 'Out of Delivery Range'}
                </span>
                <div className="shrink-0">
                  {!detectedLocation.is_serviceable ? (
                    <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md text-[11px] border border-rose-300">
                      <AlertCircle className="w-3 h-3 text-rose-600" />
                      <span>Unserviceable</span>
                    </span>
                  ) : isCourier ? (
                    <span className="inline-flex items-center gap-1 font-bold text-indigo-900 bg-indigo-100/90 px-2.5 py-0.5 rounded-md text-[11px] shrink-0 border border-indigo-300">
                      <Truck className="w-3.5 h-3.5 text-indigo-700" />
                      <span>Nationwide Courier • {detectedLocation.courier_partner || 'Delhivery'}</span>
                    </span>
                  ) : isExpress ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md text-[11px] shrink-0 border border-emerald-300">
                      <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span>Express {detectedLocation.estimated_delivery_minutes} Mins</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-stone-700 bg-stone-200/80 px-2 py-0.5 rounded-md text-[11px] shrink-0">
                      <Truck className="w-3 h-3 text-rootly-forest" />
                      <span>Standard (~{detectedLocation.estimated_delivery_minutes || 45} Mins)</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Road distance / Courier transit info & delivery fee */}
              {isCourier ? (
                <div className="flex items-center justify-between text-[11px] text-stone-600 bg-indigo-50/70 border border-indigo-100 px-2.5 py-1.5 rounded-xl">
                  <span className="flex items-center gap-1.5 font-medium text-indigo-900">
                    <Truck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Est. Delivery: <strong>{detectedLocation.estimated_delivery_days || '2–4 Business Days'}</strong></span>
                    {detectedLocation.courier_zone && (
                      <span className="font-mono text-indigo-800 bg-white border border-indigo-200 px-1.5 py-0.5 rounded text-[10px]">
                        {detectedLocation.courier_zone}
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-stone-900">
                    Fee: {detectedLocation.delivery_fee !== null && detectedLocation.delivery_fee !== undefined
                      ? `₹${detectedLocation.delivery_fee}`
                      : '₹49.0'}
                  </span>
                </div>
              ) : detectedLocation.distance_km !== null && detectedLocation.distance_km !== undefined ? (
                <div className="flex items-center justify-between text-[11px] text-stone-600 bg-stone-100/80 px-2.5 py-1.5 rounded-xl">
                  <span className="flex items-center gap-1 font-medium">
                    <Truck className="w-3.5 h-3.5 text-rootly-forest" />
                    <span>~{detectedLocation.distance_km} km from Kothagudem Mill</span>
                    {detectedLocation.matched_slab && (
                      <span className="font-mono text-stone-700 bg-white border border-stone-200 px-1 rounded text-[10px]">
                        {detectedLocation.matched_slab}
                      </span>
                    )}
                  </span>
                  {detectedLocation.is_serviceable ? (
                    <span className="font-bold text-stone-900">
                      Fee: {detectedLocation.delivery_fee !== null && detectedLocation.delivery_fee !== undefined
                        ? `₹${detectedLocation.delivery_fee}`
                        : '₹20.0'}
                    </span>
                  ) : (
                    <span className="font-bold text-rose-600">Direct Delivery Unavailable</span>
                  )}
                </div>
              ) : null}

              {!detectedLocation.is_serviceable && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-rose-700">
                    {detectedLocation.message || 'Please check your PIN code or choose a valid delivery address within India.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* House / Flat & Landmark Completer Form (Addresses Requirement 4: Do not fabricate house numbers) */}
          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2.5 mb-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Building className="w-3.5 h-3.5 text-amber-700" />
              <span>Complete Exact Door Delivery Details</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Flat / House / Floor No. (Optional)
                </label>
                <input
                  type="text"
                  value={flatNumber}
                  onChange={(e) => setFlatNumber(e.target.value)}
                  placeholder="e.g. Flat 302, Block B"
                  className="w-full p-2 rounded-xl border border-stone-300 bg-white text-xs focus:ring-2 focus:ring-rootly-forest/20 focus:border-rootly-forest"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near SBI ATM"
                  className="w-full p-2 rounded-xl border border-stone-300 bg-white text-xs focus:ring-2 focus:ring-rootly-forest/20 focus:border-rootly-forest"
                />
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full py-3.5 px-4 rounded-xl bg-rootly-forest hover:bg-rootly-dark text-white font-bold text-xs sm:text-sm shadow-lift flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Confirm Delivery Location</span>
            </button>

            <button
              type="button"
              onClick={chooseAnotherAddress}
              className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors text-center"
            >
              Search or Enter Another Address
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
