import React from 'react';
import { MapPin, Navigation, X, ArrowRight } from 'lucide-react';
import { useLocation } from '../context/LocationContext';

export const InitialLocationBanner: React.FC = () => {
  const {
    showInitialLocationBanner,
    dismissInitialLocationBanner,
    detectCurrentLocation,
    openLocationModal,
    isDetectingLocation,
  } = useLocation();

  if (!showInitialLocationBanner) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-emerald-900 via-rootly-forest to-emerald-950 text-white px-3 sm:px-6 py-2.5 sm:py-3 shadow-md border-b border-emerald-700/50 relative z-30 animate-fadeIn">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
        
        {/* Banner Text */}
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
            <Navigation className="w-3.5 h-3.5" />
          </div>
          <p className="text-xs text-emerald-50 font-medium">
            <strong className="font-bold text-white">Find delivery times for your area:</strong> Allow location detection or enter your PIN code for instant farm-to-table delivery estimates.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => detectCurrentLocation(true)}
            disabled={isDetectingLocation}
            className="px-3 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold text-xs transition-all flex items-center gap-1 shadow-sm disabled:opacity-50"
          >
            <Navigation className="w-3 h-3" />
            <span>{isDetectingLocation ? 'Detecting...' : 'Detect Location'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              dismissInitialLocationBanner();
              openLocationModal();
            }}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all flex items-center gap-1"
          >
            <MapPin className="w-3 h-3" />
            <span>Enter Manually</span>
          </button>

          <button
            type="button"
            onClick={dismissInitialLocationBanner}
            aria-label="Dismiss banner"
            className="p-1 rounded-md text-emerald-200/80 hover:text-white hover:bg-white/10 transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
