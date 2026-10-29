import React, { createContext, useContext, useState, useEffect } from 'react';
import { Address } from '../types';
import { api } from '../services/api';

export interface LiveLocationData {
  locality: string;
  city: string;
  state: string;
  postal_code: string;
  formatted_address: string;
  is_serviceable: boolean;
  service_hub: string;
  estimated_delivery_minutes: number;
}

interface LocationContextType {
  selectedAddress: Address | null;
  setSelectedAddress: (addr: Address | null) => void;
  locationLabel: string;
  pincode: string;
  isServiceable: boolean;
  serviceHub: string;
  deliveryMinutes: number;
  isDetectingLocation: boolean;
  locationError: string | null;
  setPincode: (pin: string) => void;
  isLocationModalOpen: boolean;
  openLocationModal: () => void;
  closeLocationModal: () => void;
  setCustomLocation: (area: string, pin: string) => Promise<void>;
  detectCurrentLocation: () => Promise<void>;
  clearLocationError: () => void;

  // Live Location Confirmation Prompt
  detectedLiveLocation: LiveLocationData | null;
  isPromptingLiveLocation: boolean;
  confirmLiveLocation: (loc?: LiveLocationData | null) => void;
  rejectLiveLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [pincode, setPincode] = useState<string>('560038');
  const [locationLabel, setLocationLabel] = useState<string>('Indiranagar, Bengaluru - 560038');
  const [isServiceable, setIsServiceable] = useState<boolean>(true);
  const [serviceHub, setServiceHub] = useState<string>('Sri Adithya Fulfillment Hub');
  const [deliveryMinutes, setDeliveryMinutes] = useState<number>(25);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Live location detection state
  const [detectedLiveLocation, setDetectedLiveLocation] = useState<LiveLocationData | null>(null);
  const [isPromptingLiveLocation, setIsPromptingLiveLocation] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem('sri_adithya_location') || localStorage.getItem('rootly_location');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLocationLabel(parsed.label || 'Indiranagar, Bengaluru - 560038');
        setPincode(parsed.pincode || '560038');
        setIsServiceable(parsed.isServiceable !== undefined ? parsed.isServiceable : true);
        setServiceHub(parsed.serviceHub || 'Sri Adithya Fulfillment Hub');
        setDeliveryMinutes(parsed.deliveryMinutes || 25);
        if (parsed.address) {
          setSelectedAddress(parsed.address);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      // If user hasn't chosen a location yet and browser already granted permission, detect live location
      if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
        navigator.permissions.query({ name: 'geolocation' }).then((status) => {
          if (status.state === 'granted') {
            detectCurrentLocation();
          }
        }).catch(() => {});
      }
    }
  }, []);

  const openLocationModal = () => {
    setLocationError(null);
    setIsLocationModalOpen(true);
  };
  const closeLocationModal = () => {
    setIsLocationModalOpen(false);
  };
  const clearLocationError = () => setLocationError(null);

  const handleSelectAddress = (addr: Address | null) => {
    setSelectedAddress(addr);
    if (addr) {
      const label = `${addr.label}: ${addr.street.slice(0, 24)}..., ${addr.city} - ${addr.postal_code}`;
      setLocationLabel(label);
      setPincode(addr.postal_code);
      const isExpress = addr.postal_code.startsWith('560') || addr.postal_code.startsWith('641') || addr.postal_code.startsWith('600');
      setIsServiceable(true);
      const hub = isExpress ? 'Local Express Hub' : 'Sri Adithya Organics Central Warehouse';
      const minutes = isExpress ? 25 : 48 * 60;
      setServiceHub(hub);
      setDeliveryMinutes(minutes);

      localStorage.setItem('sri_adithya_location', JSON.stringify({
        label,
        pincode: addr.postal_code,
        address: addr,
        isServiceable: true,
        serviceHub: hub,
        deliveryMinutes: minutes
      }));
    }
    setIsPromptingLiveLocation(false);
    setDetectedLiveLocation(null);
    setIsLocationModalOpen(false);
  };

  const setCustomLocation = async (area: string, pin: string) => {
    try {
      const res = await api.checkServiceability(pin);
      const label = `${res.locality || area}, ${res.city} - ${pin}`;
      setLocationLabel(label);
      setPincode(pin);
      setIsServiceable(res.is_serviceable);
      setServiceHub(res.service_hub);
      setDeliveryMinutes(res.estimated_delivery_minutes);
      setSelectedAddress(null);
      localStorage.setItem('sri_adithya_location', JSON.stringify({
        label,
        pincode: pin,
        address: null,
        isServiceable: res.is_serviceable,
        serviceHub: res.service_hub,
        deliveryMinutes: res.estimated_delivery_minutes
      }));
      setIsPromptingLiveLocation(false);
      setDetectedLiveLocation(null);
      setIsLocationModalOpen(false);
    } catch {
      const isExpress = pin.startsWith('560') || pin.startsWith('641') || pin.startsWith('600');
      const label = area.trim() ? `${area.trim()} - ${pin}` : `PIN ${pin}, India`;
      setLocationLabel(label);
      setPincode(pin);
      setIsServiceable(true);
      const hub = isExpress ? 'Express Fulfillment Hub' : 'Sri Adithya Organics Central Warehouse';
      const minutes = isExpress ? 25 : 48 * 60;
      setServiceHub(hub);
      setDeliveryMinutes(minutes);
      localStorage.setItem('sri_adithya_location', JSON.stringify({
        label,
        pincode: pin,
        address: null,
        isServiceable: true,
        serviceHub: hub,
        deliveryMinutes: minutes
      }));
      setIsPromptingLiveLocation(false);
      setDetectedLiveLocation(null);
      setIsLocationModalOpen(false);
    }
  };

  const confirmLiveLocation = (locToConfirm?: LiveLocationData | null) => {
    const loc = locToConfirm || detectedLiveLocation;
    if (!loc) return;

    const label = `${loc.locality}, ${loc.city} - ${loc.postal_code}`;
    setLocationLabel(label);
    setPincode(loc.postal_code);
    setIsServiceable(loc.is_serviceable);
    setServiceHub(loc.service_hub);
    setDeliveryMinutes(loc.estimated_delivery_minutes);
    setSelectedAddress(null);

    localStorage.setItem('sri_adithya_location', JSON.stringify({
      label,
      pincode: loc.postal_code,
      address: null,
      isServiceable: loc.is_serviceable,
      serviceHub: loc.service_hub,
      deliveryMinutes: loc.estimated_delivery_minutes
    }));

    setDetectedLiveLocation(null);
    setIsPromptingLiveLocation(false);
    setIsLocationModalOpen(false);
  };

  const rejectLiveLocation = () => {
    setIsPromptingLiveLocation(false);
    // Keep location modal open so user can optionally enter another location
    setIsLocationModalOpen(true);
  };

  const detectCurrentLocation = async () => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your current browser. Please enter your PIN code manually.');
      return;
    }

    setIsDetectingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          let result: LiveLocationData | null = null;

          // Attempt 1: Call Sri Adithya Organics backend reverse-geocode service
          try {
            const apiRes = await api.reverseGeocode(latitude, longitude);
            result = {
              locality: apiRes.locality,
              city: apiRes.city,
              state: apiRes.state,
              postal_code: apiRes.postal_code,
              formatted_address: apiRes.formatted_address,
              is_serviceable: apiRes.is_serviceable,
              service_hub: apiRes.service_hub,
              estimated_delivery_minutes: apiRes.estimated_delivery_minutes
            };
          } catch (backendErr) {
            console.warn('Backend reverse-geocode offline or delayed, falling back to direct browser geocoding:', backendErr);
            // Attempt 2: Direct client-side reverse geocoding via BigDataCloud public client API
            try {
              const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
              if (res.ok) {
                const bdc = await res.json();
                const pin = bdc.postcode || '560038';
                const locality = bdc.locality || bdc.city || bdc.principalSubdivision || 'Detected Location';
                const city = bdc.city || bdc.principalSubdivision || 'India';
                const isExpress = pin.startsWith('560') || pin.startsWith('641') || pin.startsWith('600');
                result = {
                  locality,
                  city,
                  state: bdc.principalSubdivision || '',
                  postal_code: pin,
                  formatted_address: `${locality}, ${city} - ${pin}`,
                  is_serviceable: true,
                  service_hub: isExpress ? 'Local Express Hub' : 'Sri Adithya Organics Central Warehouse',
                  estimated_delivery_minutes: isExpress ? 25 : 48 * 60
                };
              }
            } catch (clientErr) {
              console.error('Client-side reverse geocoding also failed:', clientErr);
            }
          }

          if (!result) {
            throw new Error('Could not resolve your exact address coordinates. Please enter your 6-digit PIN code manually.');
          }
          
          // DO NOT silently apply without asking! Set as detected and prompt the user to confirm!
          setDetectedLiveLocation(result);
          setIsPromptingLiveLocation(true);
          setIsLocationModalOpen(true);
        } catch (err: any) {
          setLocationError(err.message || 'Could not resolve your exact address. Please enter your PIN code manually.');
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        setIsDetectingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission was denied. Please allow location access in your browser or enter your PIN code manually below.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('GPS/Location hardware is unavailable on this device. Please enter your PIN code manually.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out. Please enter your PIN code manually.');
            break;
          default:
            setLocationError('An error occurred while detecting location. Please enter your PIN code manually.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0 // Always acquire fresh real-time coordinates, do not use stale cache
      }
    );
  };

  return (
    <LocationContext.Provider
      value={{
        selectedAddress,
        setSelectedAddress: handleSelectAddress,
        locationLabel,
        pincode,
        isServiceable,
        serviceHub,
        deliveryMinutes,
        isDetectingLocation,
        locationError,
        setPincode,
        isLocationModalOpen,
        openLocationModal,
        closeLocationModal,
        setCustomLocation,
        detectCurrentLocation,
        clearLocationError,

        detectedLiveLocation,
        isPromptingLiveLocation,
        confirmLiveLocation,
        rejectLiveLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};


