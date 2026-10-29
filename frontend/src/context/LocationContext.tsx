import React, { createContext, useContext, useState, useEffect } from 'react';
import { Address } from '../types';
import { api } from '../services/api';

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
  setCustomLocation: (area: string, pin: string) => void;
  detectCurrentLocation: () => Promise<void>;
  clearLocationError: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [pincode, setPincode] = useState<string>('560038');
  const [locationLabel, setLocationLabel] = useState<string>('Indiranagar, Bengaluru - 560038');
  const [isServiceable, setIsServiceable] = useState<boolean>(true);
  const [serviceHub, setServiceHub] = useState<string>('Indiranagar Fulfillment Hub');
  const [deliveryMinutes, setDeliveryMinutes] = useState<number>(15);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('sri_adithya_location') || localStorage.getItem('rootly_location');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLocationLabel(parsed.label || 'Indiranagar, Bengaluru - 560038');
        setPincode(parsed.pincode || '560038');
        setIsServiceable(parsed.isServiceable !== undefined ? parsed.isServiceable : true);
        setServiceHub(parsed.serviceHub || 'Indiranagar Fulfillment Hub');
        setDeliveryMinutes(parsed.deliveryMinutes || 15);
        if (parsed.address) {
          setSelectedAddress(parsed.address);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const openLocationModal = () => {
    setLocationError(null);
    setIsLocationModalOpen(true);
  };
  const closeLocationModal = () => setIsLocationModalOpen(false);
  const clearLocationError = () => setLocationError(null);

  const handleSelectAddress = (addr: Address | null) => {
    setSelectedAddress(addr);
    if (addr) {
      const label = `${addr.label}: ${addr.street.slice(0, 24)}..., ${addr.city} - ${addr.postal_code}`;
      setLocationLabel(label);
      setPincode(addr.postal_code);
      const isExpress = addr.postal_code.startsWith('560') || addr.postal_code.startsWith('641') || addr.postal_code.startsWith('600');
      setIsServiceable(true);
      localStorage.setItem('sri_adithya_location', JSON.stringify({
        label,
        pincode: addr.postal_code,
        address: addr,
        isServiceable: true,
        serviceHub: isExpress ? 'Local Express Hub' : 'Sri Adithya Organics Central Warehouse',
        deliveryMinutes: isExpress ? 25 : 48 * 60
      }));
    }
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
      setIsLocationModalOpen(false);
    } catch {
      const isExpress = pin.startsWith('560') || pin.startsWith('641') || pin.startsWith('600');
      const label = area.trim() ? `${area.trim()} - ${pin}` : `PIN ${pin}, India`;
      setLocationLabel(label);
      setPincode(pin);
      setIsServiceable(true);
      setServiceHub(isExpress ? 'Express Fulfillment Hub' : 'Sri Adithya Organics Central Warehouse');
      setDeliveryMinutes(isExpress ? 25 : 48 * 60);
      localStorage.setItem('sri_adithya_location', JSON.stringify({
        label,
        pincode: pin,
        address: null,
        isServiceable: true,
        serviceHub: isExpress ? 'Express Fulfillment Hub' : 'Sri Adithya Organics Central Warehouse',
        deliveryMinutes: isExpress ? 25 : 48 * 60
      }));
      setIsLocationModalOpen(false);
    }
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
          let result: any = null;

          // Attempt 1: Call Sri Adithya Organics backend reverse-geocode service
          try {
            result = await api.reverseGeocode(latitude, longitude);
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
                  is_serviceable: true,
                  service_hub: isExpress ? 'Local Express Hub' : 'Sri Adithya Organics Central Warehouse',
                  estimated_delivery_minutes: isExpress ? 25 : 48 * 60,
                  message: 'Resolved via client-side GPS'
                };
              }
            } catch (clientErr) {
              console.error('Client-side reverse geocoding also failed:', clientErr);
            }
          }

          if (!result) {
            throw new Error('Could not resolve your exact address coordinates. Please enter your 6-digit PIN code manually.');
          }
          
          const label = `${result.locality}, ${result.city} - ${result.postal_code}`;
          setLocationLabel(label);
          setPincode(result.postal_code);
          setIsServiceable(result.is_serviceable);
          setServiceHub(result.service_hub);
          setDeliveryMinutes(result.estimated_delivery_minutes);
          setSelectedAddress(null);

          localStorage.setItem('sri_adithya_location', JSON.stringify({
            label,
            pincode: result.postal_code,
            address: null,
            isServiceable: result.is_serviceable,
            serviceHub: result.service_hub,
            deliveryMinutes: result.estimated_delivery_minutes
          }));

          setIsLocationModalOpen(false);
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


