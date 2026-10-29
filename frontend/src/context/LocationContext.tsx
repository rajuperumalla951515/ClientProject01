import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Address } from '../types';
import { api } from '../services/api';

export interface DetectedLocation {
  latitude?: number;
  longitude?: number;
  locality: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  formatted_address: string;
  is_serviceable: boolean;
  service_hub: string;
  estimated_delivery_minutes: number;
}

export interface SelectedDeliveryAddress {
  id?: number;
  label?: string;
  recipient_name?: string;
  phone?: string;
  apartment?: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_serviceable: boolean;
  service_hub: string;
  estimated_delivery_minutes: number;
  source: 'gps_confirmed' | 'manual_entry' | 'saved_address' | 'preset_hub';
}

export interface ManualAddressInput {
  label: string;
  recipient_name: string;
  phone: string;
  apartment?: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
  saveToAccount?: boolean;
}

interface LocationContextType {
  // 1. Detected Location (Browser GPS)
  detectedLocation: DetectedLocation | null;
  isDetectingLocation: boolean;
  locationError: string | null;
  detectCurrentLocation: (isExplicitUserClick?: boolean) => Promise<void>;
  clearLocationError: () => void;

  // 2. Delivery Confirmation Prompt (The most important requirement)
  isConfirmingDeliveryLocation: boolean;
  confirmDeliveryToDetectedLocation: () => void;
  chooseAnotherAddress: () => void;
  dismissConfirmation: () => void;

  // 3. Selected Delivery Address (Single Source of Truth across site)
  selectedDeliveryAddress: SelectedDeliveryAddress;
  locationLabel: string;
  pincode: string;
  isServiceable: boolean;
  serviceHub: string;
  deliveryMinutes: number;

  // Backward compatibility alias for components using selectedAddress: Address | null
  selectedAddress: Address | null;
  setSelectedAddress: (addr: Address | null) => void;

  // 4. Modal & Alternative Address Management
  isLocationModalOpen: boolean;
  openLocationModal: () => void;
  closeLocationModal: () => void;
  selectSavedAddress: (addr: Address) => void;
  setManualDeliveryAddress: (input: ManualAddressInput) => Promise<boolean>;
  setPresetHubLocation: (area: string, pin: string) => Promise<void>;

  // 5. Initial Geolocation Banner / Prompt
  showInitialLocationBanner: boolean;
  dismissInitialLocationBanner: () => void;
}

const DEFAULT_DELIVERY_ADDRESS: SelectedDeliveryAddress = {
  label: 'Default Fulfillment Hub',
  street: '100ft Road, Indiranagar',
  city: 'Bengaluru',
  state: 'Karnataka',
  postal_code: '560038',
  country: 'India',
  is_serviceable: true,
  service_hub: 'Indiranagar Hub',
  estimated_delivery_minutes: 15,
  source: 'preset_hub',
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Selected Delivery Address (Single Source of Truth)
  const [selectedDeliveryAddress, setSelectedDeliveryAddress] = useState<SelectedDeliveryAddress>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sri_adithya_delivery_address');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.postal_code) {
            return parsed;
          }
        } catch {
          // fallback
        }
      }
    }
    return DEFAULT_DELIVERY_ADDRESS;
  });

  // Backward compatibility address state
  const [selectedAddress, setSelectedAddressState] = useState<Address | null>(null);

  // 2. Detected Location state (GPS live coords)
  const [detectedLocation, setDetectedLocation] = useState<DetectedLocation | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // 3. Confirmation Dialog state
  const [isConfirmingDeliveryLocation, setIsConfirmingDeliveryLocation] = useState<boolean>(false);

  // 4. Location Modal state
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);

  // 5. Initial polite banner state (only shown once per session if no explicit address chosen)
  const [showInitialLocationBanner, setShowInitialLocationBanner] = useState<boolean>(false);

  // Sync selectedAddress state with selectedDeliveryAddress if from saved address
  useEffect(() => {
    if (selectedDeliveryAddress.id && selectedDeliveryAddress.source === 'saved_address') {
      setSelectedAddressState({
        id: selectedDeliveryAddress.id,
        label: selectedDeliveryAddress.label || 'Home',
        recipient_name: selectedDeliveryAddress.recipient_name || '',
        phone: selectedDeliveryAddress.phone || '',
        street: selectedDeliveryAddress.street,
        apartment: selectedDeliveryAddress.apartment,
        landmark: selectedDeliveryAddress.landmark,
        city: selectedDeliveryAddress.city,
        state: selectedDeliveryAddress.state,
        postal_code: selectedDeliveryAddress.postal_code,
        is_default: false,
      });
    }
  }, [selectedDeliveryAddress]);

  // Initial visit logic: check permissions and offer location detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasStoredAddress = localStorage.getItem('sri_adithya_delivery_address');
    const hasPrompted = sessionStorage.getItem('sri_adithya_geo_prompted');

    // If user has not explicitly chosen an address and has not been prompted in this session
    if (!hasStoredAddress && !hasPrompted) {
      sessionStorage.setItem('sri_adithya_geo_prompted', 'true');

      if ('permissions' in navigator) {
        navigator.permissions
          .query({ name: 'geolocation' })
          .then((status) => {
            if (status.state === 'granted') {
              // Browser permission already granted: automatically detect and show confirmation prompt
              detectCurrentLocation(false);
            } else if (status.state === 'prompt') {
              // Permission not yet requested: show polite initial banner
              setShowInitialLocationBanner(true);
            }
          })
          .catch(() => {
            setShowInitialLocationBanner(true);
          });
      } else {
        setShowInitialLocationBanner(true);
      }
    }
  }, []);

  const openLocationModal = useCallback(() => {
    setLocationError(null);
    setIsLocationModalOpen(true);
  }, []);

  const closeLocationModal = useCallback(() => {
    setIsLocationModalOpen(false);
  }, []);

  const clearLocationError = useCallback(() => {
    setLocationError(null);
  }, []);

  const dismissInitialLocationBanner = useCallback(() => {
    setShowInitialLocationBanner(false);
  }, []);

  // Detect current location using browser Geolocation API
  const detectCurrentLocation = useCallback(async (isExplicitUserClick = false) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your current browser. Please enter your address or PIN code manually.');
      if (isExplicitUserClick) setIsLocationModalOpen(true);
      return;
    }

    setIsDetectingLocation(true);
    setLocationError(null);
    setShowInitialLocationBanner(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          let result: DetectedLocation | null = null;

          // Attempt 1: Call Sri Adithya Organics backend reverse-geocode service
          try {
            const apiRes = await api.reverseGeocode(latitude, longitude);
            result = {
              latitude,
              longitude,
              locality: apiRes.locality,
              city: apiRes.city,
              state: apiRes.state,
              postal_code: apiRes.postal_code,
              country: apiRes.country || 'India',
              formatted_address: apiRes.formatted_address,
              is_serviceable: apiRes.is_serviceable,
              service_hub: apiRes.service_hub,
              estimated_delivery_minutes: apiRes.estimated_delivery_minutes,
            };
          } catch (backendErr) {
            console.warn('Backend reverse-geocode offline or delayed, falling back to direct browser geocoding:', backendErr);
            // Attempt 2: Direct client-side reverse geocoding via BigDataCloud client API
            try {
              const res = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
              );
              if (res.ok) {
                const bdc = await res.json();
                const pin = bdc.postcode || '560038';
                const locality = bdc.locality || bdc.city || bdc.principalSubdivision || 'Detected Area';
                const city = bdc.city || bdc.principalSubdivision || 'Bengaluru';
                const isExpress = pin.startsWith('560') || pin.startsWith('641') || pin.startsWith('600');
                result = {
                  latitude,
                  longitude,
                  locality,
                  city,
                  state: bdc.principalSubdivision || 'Karnataka',
                  postal_code: pin,
                  country: bdc.countryName || 'India',
                  formatted_address: `${locality}, ${city} - ${pin}`,
                  is_serviceable: true,
                  service_hub: isExpress ? 'Local Express Hub' : 'Sri Adithya Organics Central Fulfillment Facility',
                  estimated_delivery_minutes: isExpress ? 25 : 48 * 60,
                };
              }
            } catch (clientErr) {
              console.error('Client-side reverse geocoding also failed:', clientErr);
            }
          }

          if (!result) {
            throw new Error('Could not resolve your exact address coordinates. Please enter your 6-digit PIN code manually.');
          }

          // CRITICAL REQUIREMENT:
          // Detecting a location must NOT automatically confirm it as the delivery address!
          // We set detectedLocation and display the confirmation prompt ("Is this your delivery location?")
          setDetectedLocation(result);
          setIsConfirmingDeliveryLocation(true);
          setIsLocationModalOpen(false); // Close any open modal so confirmation dialog is prominent
        } catch (err: any) {
          setLocationError(err.message || 'Could not resolve your exact address. Please enter your PIN code manually.');
          if (isExplicitUserClick) setIsLocationModalOpen(true);
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        setIsDetectingLocation(false);
        let errorMsg = 'An error occurred while detecting your location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'Location permission was denied. You can enter your delivery PIN code or address manually.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'GPS/Location hardware is unavailable on this device. Please enter your PIN code manually.';
            break;
          case error.TIMEOUT:
            errorMsg = 'Location detection timed out. Please enter your PIN code manually.';
            break;
        }
        setLocationError(errorMsg);
        if (isExplicitUserClick) setIsLocationModalOpen(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  // Action 1: User explicitly confirms "Yes, deliver here"
  const confirmDeliveryToDetectedLocation = useCallback(() => {
    if (!detectedLocation) return;

    const newDeliveryAddress: SelectedDeliveryAddress = {
      label: 'Current Location',
      street: detectedLocation.locality,
      city: detectedLocation.city,
      state: detectedLocation.state,
      postal_code: detectedLocation.postal_code,
      country: detectedLocation.country || 'India',
      is_serviceable: detectedLocation.is_serviceable,
      service_hub: detectedLocation.service_hub,
      estimated_delivery_minutes: detectedLocation.estimated_delivery_minutes,
      source: 'gps_confirmed',
    };

    setSelectedDeliveryAddress(newDeliveryAddress);
    setSelectedAddressState(null);
    localStorage.setItem('sri_adithya_delivery_address', JSON.stringify(newDeliveryAddress));

    // Close confirmation dialog and cleanup
    setIsConfirmingDeliveryLocation(false);
    setDetectedLocation(null);
  }, [detectedLocation]);

  // Action 2: User selects "Choose another address"
  const chooseAnotherAddress = useCallback(() => {
    setIsConfirmingDeliveryLocation(false);
    setDetectedLocation(null);
    setIsLocationModalOpen(true);
  }, []);

  // Action 3: Dismiss confirmation dialog to decide later
  const dismissConfirmation = useCallback(() => {
    setIsConfirmingDeliveryLocation(false);
    setDetectedLocation(null);
  }, []);

  // Select an existing saved address from the user's account
  const selectSavedAddress = useCallback((addr: Address) => {
    const isExpress = addr.postal_code.startsWith('560') || addr.postal_code.startsWith('641') || addr.postal_code.startsWith('600');
    const hub = isExpress ? 'Local Express Hub' : 'Sri Adithya Organics Central Fulfillment Facility';
    const minutes = isExpress ? 25 : 48 * 60;

    const newDeliveryAddress: SelectedDeliveryAddress = {
      id: addr.id,
      label: addr.label,
      recipient_name: addr.recipient_name,
      phone: addr.phone,
      apartment: addr.apartment || undefined,
      street: addr.street,
      landmark: addr.landmark || undefined,
      city: addr.city,
      state: addr.state,
      postal_code: addr.postal_code,
      country: 'India',
      is_serviceable: true,
      service_hub: hub,
      estimated_delivery_minutes: minutes,
      source: 'saved_address',
    };

    setSelectedDeliveryAddress(newDeliveryAddress);
    setSelectedAddressState(addr);
    localStorage.setItem('sri_adithya_delivery_address', JSON.stringify(newDeliveryAddress));
    setIsLocationModalOpen(false);
  }, []);

  // Enter an alternative delivery address manually
  const setManualDeliveryAddress = useCallback(async (input: ManualAddressInput): Promise<boolean> => {
    try {
      const pin = input.postal_code.trim();
      if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
        setLocationError('Please enter a valid 6-digit Indian PIN code.');
        return false;
      }

      // Check serviceability with server
      let serviceResult = {
        is_serviceable: true,
        service_hub: 'Sri Adithya Organics Central Fulfillment Facility',
        estimated_delivery_minutes: 48 * 60,
      };

      try {
        const serv = await api.checkServiceability(pin);
        serviceResult = {
          is_serviceable: serv.is_serviceable,
          service_hub: serv.service_hub,
          estimated_delivery_minutes: serv.estimated_delivery_minutes,
        };
      } catch {
        const isExpress = pin.startsWith('560') || pin.startsWith('641') || pin.startsWith('600');
        serviceResult = {
          is_serviceable: true,
          service_hub: isExpress ? 'Local Express Hub' : 'Sri Adithya Organics Central Fulfillment Facility',
          estimated_delivery_minutes: isExpress ? 25 : 48 * 60,
        };
      }

      let createdAddressId: number | undefined;

      // If user requested to save to account and is logged in
      if (input.saveToAccount) {
        try {
          const created = await api.createAddress({
            label: input.label || 'Home',
            recipient_name: input.recipient_name,
            phone: input.phone,
            street: input.street,
            apartment: input.apartment,
            landmark: input.landmark,
            city: input.city || 'Bengaluru',
            state: input.state || 'Karnataka',
            postal_code: pin,
            is_default: false,
          });
          createdAddressId = created.id;
          setSelectedAddressState(created);
        } catch (saveErr) {
          console.warn('Could not save address to user account (user may not be logged in):', saveErr);
        }
      }

      const newDeliveryAddress: SelectedDeliveryAddress = {
        id: createdAddressId,
        label: input.label || 'Delivery Address',
        recipient_name: input.recipient_name,
        phone: input.phone,
        apartment: input.apartment,
        street: input.street,
        landmark: input.landmark,
        city: input.city,
        state: input.state,
        postal_code: pin,
        country: input.country || 'India',
        is_serviceable: serviceResult.is_serviceable,
        service_hub: serviceResult.service_hub,
        estimated_delivery_minutes: serviceResult.estimated_delivery_minutes,
        source: createdAddressId ? 'saved_address' : 'manual_entry',
      };

      setSelectedDeliveryAddress(newDeliveryAddress);
      localStorage.setItem('sri_adithya_delivery_address', JSON.stringify(newDeliveryAddress));
      setIsLocationModalOpen(false);
      setLocationError(null);
      return true;
    } catch (err: any) {
      setLocationError(err.message || 'Failed to validate address.');
      return false;
    }
  }, []);

  // Quick preset hub selection
  const setPresetHubLocation = useCallback(async (area: string, pin: string) => {
    try {
      let hubName = 'Sri Adithya Fulfillment Hub';
      let minutes = 25;
      let isServ = true;
      let cityName = 'Bengaluru';

      try {
        const serv = await api.checkServiceability(pin);
        hubName = serv.service_hub;
        minutes = serv.estimated_delivery_minutes;
        isServ = serv.is_serviceable;
        cityName = serv.city || 'Bengaluru';
      } catch {
        const isExpress = pin.startsWith('560') || pin.startsWith('641') || pin.startsWith('600');
        hubName = isExpress ? 'Local Express Hub' : 'Sri Adithya Organics Central Fulfillment Facility';
        minutes = isExpress ? 25 : 48 * 60;
      }

      const newDeliveryAddress: SelectedDeliveryAddress = {
        label: area,
        street: area,
        city: cityName,
        state: 'Karnataka',
        postal_code: pin,
        country: 'India',
        is_serviceable: isServ,
        service_hub: hubName,
        estimated_delivery_minutes: minutes,
        source: 'preset_hub',
      };

      setSelectedDeliveryAddress(newDeliveryAddress);
      setSelectedAddressState(null);
      localStorage.setItem('sri_adithya_delivery_address', JSON.stringify(newDeliveryAddress));
      setIsLocationModalOpen(false);
    } catch (e: any) {
      setLocationError(e.message || 'Could not set hub location.');
    }
  }, []);

  // Backward compatibility setter
  const handleSetSelectedAddress = useCallback((addr: Address | null) => {
    if (addr) {
      selectSavedAddress(addr);
    } else {
      setSelectedAddressState(null);
    }
  }, [selectSavedAddress]);

  // Formatted location label for Header and Cards
  const locationLabel = selectedDeliveryAddress.apartment
    ? `${selectedDeliveryAddress.apartment}, ${selectedDeliveryAddress.street}, ${selectedDeliveryAddress.city} - ${selectedDeliveryAddress.postal_code}`
    : `${selectedDeliveryAddress.street}, ${selectedDeliveryAddress.city} - ${selectedDeliveryAddress.postal_code}`;

  return (
    <LocationContext.Provider
      value={{
        detectedLocation,
        isDetectingLocation,
        locationError,
        detectCurrentLocation,
        clearLocationError,

        isConfirmingDeliveryLocation,
        confirmDeliveryToDetectedLocation,
        chooseAnotherAddress,
        dismissConfirmation,

        selectedDeliveryAddress,
        locationLabel,
        pincode: selectedDeliveryAddress.postal_code,
        isServiceable: selectedDeliveryAddress.is_serviceable,
        serviceHub: selectedDeliveryAddress.service_hub,
        deliveryMinutes: selectedDeliveryAddress.estimated_delivery_minutes,

        selectedAddress,
        setSelectedAddress: handleSetSelectedAddress,

        isLocationModalOpen,
        openLocationModal,
        closeLocationModal,
        selectSavedAddress,
        setManualDeliveryAddress,
        setPresetHubLocation,

        showInitialLocationBanner,
        dismissInitialLocationBanner,
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
