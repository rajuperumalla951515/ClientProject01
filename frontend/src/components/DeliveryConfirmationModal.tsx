import React from 'react';
import { X, Navigation, Check, MapPin, Zap, Truck } from 'lucide-react';
import { useLocation } from '../context/LocationContext';

export const DeliveryConfirmationModal: React.FC = () => {
  const {
    detectedLocation,
    isConfirmingDeliveryLocation,
    confirmDeliveryToDetectedLocation,
    chooseAnotherAddress,
    dismissConfirmation,
  } = useLocation();

  if (!isConfirmingDeliveryLocation || !detectedLocation) {
    return null;
  }

  const isExpress = detectedLocation.estimated_delivery_minutes <= 30;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop with click to dismiss (does not block shopping) */}
      <div
        onClick={dismissConfirmation}
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Container: Bottom sheet on mobile, centered modal on sm+ */}
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-stone-200 animate-fadeIn">
          
          {/* Header with dismiss button */}
          <div className="flex items-start justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rootly-forest text-white flex items-center justify-center shadow-sm shrink-0">
                <Navigation className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Live Location Detected
                </span>
                <h3 className="font-display font-black text-lg text-stone-900 mt-0.5">
                  Is this your delivery location?
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissConfirmation}
              aria-label="Dismiss and decide later"
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Detected Address Details Card */}
          <div className="my-4 p-4 rounded-2xl bg-stone-50 border border-stone-200/90 shadow-soft space-y-2">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-rootly-forest shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-stone-900 leading-snug">
                  {detectedLocation.locality}, {detectedLocation.city}
                </p>
                <p className="text-xs font-mono font-semibold text-stone-600 mt-0.5">
                  PIN: {detectedLocation.postal_code} • {detectedLocation.state}, {detectedLocation.country}
                </p>
              </div>
            </div>

            {/* Logistics Service Hub and Delivery Estimate Badge */}
            <div className="pt-2 border-t border-stone-200/70 flex items-center justify-between text-xs">
              <span className="text-stone-500 font-medium truncate">
                {detectedLocation.service_hub}
              </span>
              {isExpress ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md text-[11px] shrink-0">
                  <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                  Express {detectedLocation.estimated_delivery_minutes} Mins
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-stone-700 bg-stone-200/80 px-2 py-0.5 rounded-md text-[11px] shrink-0">
                  <Truck className="w-3 h-3 text-rootly-forest" />
                  Pan-India Courier
                </span>
              )}
            </div>
          </div>

          {/* Question / Prompt copy */}
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-5">
            Would you like us to deliver your Sri Adithya Organics order to this location?
          </p>

          {/* Two Clear Actions */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={confirmDeliveryToDetectedLocation}
              className="w-full py-3.5 px-4 rounded-xl bg-rootly-forest hover:bg-rootly-dark text-white font-bold text-xs sm:text-sm shadow-lift flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Check className="w-4 h-4 stroke-[3] text-emerald-300" />
              <span>Yes, deliver here</span>
            </button>

            <button
              type="button"
              onClick={chooseAnotherAddress}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs sm:text-sm border border-stone-300 shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <MapPin className="w-4 h-4 text-stone-500" />
              <span>Choose another address</span>
            </button>
          </div>

          {/* Dismiss hint */}
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={dismissConfirmation}
              className="text-[11px] font-semibold text-stone-400 hover:text-stone-600 transition-colors"
            >
              Dismiss and decide later
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
