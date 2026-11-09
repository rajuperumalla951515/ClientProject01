import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Address, ReverseGeocodeResult, AddressSearchResult } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

export const ACCURACY_THRESHOLDS = {
  GOOD: 35,     // < 35m: High Accuracy GPS
  MODERATE: 100, // 35m - 100m: Moderate Accuracy
  // > 100m: Poor / Approximate location (ask to move pin)
};

export type AccuracyLevel = 'high' | 'moderate' | 'low' | 'manual';

export interface DetectedLocation extends ReverseGeocodeResult {
  accuracy_level: AccuracyLevel;
  initial_gps_lat?: number;
  initial_gps_lon?: number;
}

export interface SelectedDeliveryAddress {
  id?: number;
  label?: string;
  recipient_name?: string;
  phone?: string;
  house_number?: string;
  apartment?: string;
  street: string;
  landmark?: string;
  locality: string;
  city: string;
  district?: string;
  state: string;
  postal_code: string;
  country: string;
  latitude?: number;
  longitude?: number;
  accuracy_meters?: number | null;
  formatted_address: string;
  is_serviceable: boolean;
  service_hub: string;
  estimated_delivery_minutes: number;
  delivery_fee?: number;
  distance_km?: number | null;
  distance_source?: string | null;
  matched_slab?: string | null;
  source: 'gps_confirmed' | 'manual_entry' | 'saved_address' | 'preset_hub' | 'map_pin';
  confirmed_at?: string;
  is_confirmed: boolean;
  message?: string;
}

export interface ManualAddressInput {
  label: string;
  recipient_name: string;
  phone: string;
  house_number?: string;
  apartment?: string;
  street: string;
  landmark?: string;
  locality?: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  saveToAccount?: boolean;
}

interface LocationContextType {
  // 1. Detected Location (Browser Live GPS & Interactive Map)
  detectedLocation: DetectedLocation | null;
  pinCoordinates: { lat: number; lon: number } | null;
  isDetectingLocation: boolean;
  isReverseGeocoding: boolean;
  locationError: string | null;
  accuracyLevel: AccuracyLevel;
  detectCurrentLocation: (isExplicitUserClick?: boolean) => Promise<void>;
  updatePinCoordinates: (lat: number, lon: number) => Promise<void>;
  clearLocationError: () => void;

  // 2. Delivery Confirmation Prompt with Map
  isConfirmingDeliveryLocation: boolean;
  confirmDeliveryToDetectedLocation: (additionalDetails?: { flatNumber?: string; landmark?: string }) => void;
  chooseAnotherAddress: () => void;
  dismissConfirmation: () => void;

  // 3. Centralized Delivery Address (Single Source of Truth across site)
  selectedDeliveryAddress: SelectedDeliveryAddress;
  locationLabel: string;
  pincode: string;
  isServiceable: boolean;
  isLocationConfirmed: boolean;
  serviceHub: string;
  deliveryMinutes: number;
  deliveryFee: number;
  distanceKm: number | null;
  matchedSlab?: string;
  recalculateDeliveryFee: (subtotal?: number) => Promise<{
    fee: number;
    distance_km: number | null;
    is_serviceable: boolean;
    matched_slab?: string | null;
  }>;

  // Backward compatibility alias for saved address
  selectedAddress: Address | null;
  setSelectedAddress: (addr: Address | null) => void;

  // 4. Address Search, Manual Entry & Saved Addresses
  isLocationModalOpen: boolean;
  openLocationModal: () => void;
  closeLocationModal: () => void;
  selectSavedAddress: (addr: Address) => void;
  setManualDeliveryAddress: (input: ManualAddressInput) => Promise<boolean>;
  setPresetHubLocation: (area: string, pin: string) => Promise<void>;
  searchAddresses: (query: string) => Promise<AddressSearchResult[]>;
  selectSearchResult: (result: AddressSearchResult) => Promise<void>;

  // 5. Initial Geolocation Banner
  showInitialLocationBanner: boolean;
  dismissInitialLocationBanner: () => void;
}

const DEFAULT_DELIVERY_ADDRESS: SelectedDeliveryAddress = {
  label: 'Sri Aditya Organics & Oil Mill',
  street: 'Babu Camp Road, Ganeshbasthi',
  locality: 'Opp. Babu Camp Ramalayam, Jilla Parishad Complex',
  city: 'Kothagudem',
  district: 'Bhadradri Kothagudem',
  state: 'Telangana',
  postal_code: '507101',
  country: 'India',
  latitude: 17.5376,
  longitude: 80.6210,
  accuracy_meters: 10,
  formatted_address: 'Jilla Parishad Complex, Babu Camp Road, Ganeshbasthi, Opp. Ramalayam, Kothagudem, Telangana - 507101',
  is_serviceable: true,
  service_hub: 'Sri Aditya Organics & Oil Mill (Kothagudem)',
  estimated_delivery_minutes: 15,
  delivery_fee: 20.0,
  distance_km: 0.1,
  matched_slab: '0–2 km',
  source: 'preset_hub',
  is_confirmed: false,
};

// Calculate Haversine road estimate in client fallback
function calculateClientRoadDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const dLat = (lat2 - lat1) * Math.PI / 180.0;
  const dLon = (lon2 - lon1) * Math.PI / 180.0;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180.0) * Math.cos(lat2 * Math.PI / 180.0) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 1.22 * 10) / 10;
}

const isTelanganaPin = (pin?: string | null): boolean => {
  if (!pin) return false;
  const p = parseInt(pin.trim(), 10);
  return !isNaN(p) && p >= 500001 && p <= 509999;
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // 1. Centralized Selected Delivery Address (Single Source of Truth)
  const [selectedDeliveryAddress, setSelectedDeliveryAddress] = useState<SelectedDeliveryAddress>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sri_adithya_delivery_address');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.postal_code && parsed.is_confirmed) {
            return parsed;
          }
        } catch {
          // fallback
        }
      }
    }
    return DEFAULT_DELIVERY_ADDRESS;
  });

  const [selectedAddress, setSelectedAddressState] = useState<Address | null>(null);

  // 2. Detected Location & Interactive Map Pin State
  const [detectedLocation, setDetectedLocation] = useState<DetectedLocation | null>(null);
  const [pinCoordinates, setPinCoordinates] = useState<{ lat: number; lon: number } | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [accuracyLevel, setAccuracyLevel] = useState<AccuracyLevel>('high');

  // 3. Confirmation Dialog State
  const [isConfirmingDeliveryLocation, setIsConfirmingDeliveryLocation] = useState<boolean>(false);

  // 4. Location Modal & Initial Banner State
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [showInitialLocationBanner, setShowInitialLocationBanner] = useState<boolean>(false);

  // Debounce timer ref for map dragging
  const pinDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Sync saved address state
  useEffect(() => {
    if (selectedDeliveryAddress.id && selectedDeliveryAddress.source === 'saved_address') {
      setSelectedAddressState({
        id: selectedDeliveryAddress.id,
        label: selectedDeliveryAddress.label || 'Home',
        recipient_name: selectedDeliveryAddress.recipient_name || '',
        phone: selectedDeliveryAddress.phone || '',
        street: selectedDeliveryAddress.street,
        apartment: selectedDeliveryAddress.apartment,
        house_number: selectedDeliveryAddress.house_number,
        locality: selectedDeliveryAddress.locality,
        landmark: selectedDeliveryAddress.landmark,
        city: selectedDeliveryAddress.city,
        state: selectedDeliveryAddress.state,
        postal_code: selectedDeliveryAddress.postal_code,
        latitude: selectedDeliveryAddress.latitude,
        longitude: selectedDeliveryAddress.longitude,
        accuracy_meters: selectedDeliveryAddress.accuracy_meters,
        formatted_address: selectedDeliveryAddress.formatted_address,
        is_default: false,
      });
    }
  }, [selectedDeliveryAddress]);

  // Initial visit logic: prompt for location detection politely
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasStoredAddress = localStorage.getItem('sri_adithya_delivery_address');
    const hasPrompted = sessionStorage.getItem('sri_adithya_geo_prompted');

    if (!hasStoredAddress && !hasPrompted) {
      sessionStorage.setItem('sri_adithya_geo_prompted', 'true');

      if ('permissions' in navigator) {
        navigator.permissions
          .query({ name: 'geolocation' })
          .then((status) => {
            if (status.state === 'granted') {
              // Permission already granted: detect live location
              detectCurrentLocation(false);
            } else if (status.state === 'prompt') {
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

  // Compute accuracy level based on configurable thresholds
  const computeAccuracyLevel = (acc?: number | null): AccuracyLevel => {
    if (!acc || acc <= ACCURACY_THRESHOLDS.GOOD) return 'high';
    if (acc <= ACCURACY_THRESHOLDS.MODERATE) return 'moderate';
    return 'low';
  };

  // Perform reverse geocoding on coordinates with structured fallback
  const performReverseGeocode = async (
    lat: number,
    lon: number,
    accuracy?: number | null,
    isManualPin = false,
    initialGpsLat?: number,
    initialGpsLon?: number
  ): Promise<DetectedLocation> => {
    setIsReverseGeocoding(true);
    try {
      const apiRes = await api.reverseGeocode(lat, lon, accuracy ?? undefined);
      const accLvl: AccuracyLevel = isManualPin ? 'manual' : computeAccuracyLevel(accuracy);

      const detected: DetectedLocation = {
        ...apiRes,
        accuracy_level: accLvl,
        initial_gps_lat: initialGpsLat ?? lat,
        initial_gps_lon: initialGpsLon ?? lon,
      };
      return detected;
    } catch (err: any) {
      // Client-side fallback if backend request fails (Never invent coordinates or mock address)
      // 1. Try direct Photon OSM lookup from client
      let street = '';
      let locality = 'Delivery Location';
      let city = 'Local Area';
      let state = 'India';
      let pin = '';
      let country = 'India';
      let formatted = `Delivery Coordinates (${lat.toFixed(4)}, ${lon.toFixed(4)})`;

      try {
        const resp = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`);
        if (resp.ok) {
          const pData = await resp.json();
          if (pData?.features?.[0]?.properties) {
            const props = pData.features[0].properties;
            street = props.street || '';
            locality = props.district || props.locality || props.suburb || props.name || locality;
            city = props.city || props.town || props.village || city;
            state = props.state || state;
            pin = props.postcode || pin;
            country = props.country || country;
            formatted = [street, locality, city, state, pin].filter(Boolean).join(', ');
          }
        }
      } catch {}

      // Calculate distance from Sri Aditya Organics & Oil Mill (17.5376, 80.6210)
      const clientDist = calculateClientRoadDistanceKm(17.5376, 80.6210, lat, lon);
      const isServ = clientDist <= 60.0;
      const estMinutes = !isServ ? 0 : clientDist <= 2.0 ? 15 : clientDist <= 15.0 ? 30 : 45;
      const fee = !isServ ? 0.0 : clientDist <= 2.0 ? 20.0 : clientDist <= 4.0 ? 30.0 : clientDist <= 6.0 ? 40.0 : 50.0;
      const slab = !isServ ? null : clientDist <= 2.0 ? '0–2 km' : clientDist <= 4.0 ? '2–4 km' : clientDist <= 6.0 ? '4–6 km' : clientDist <= 8.0 ? '6–8 km' : '8–10 km';

      return {
        formatted_address: formatted,
        road: street || undefined,
        locality,
        city,
        state,
        postal_code: pin,
        country,
        latitude: lat,
        longitude: lon,
        accuracy_meters: accuracy ?? null,
        is_serviceable: isServ,
        estimated_delivery_minutes: estMinutes,
        distance_km: clientDist,
        delivery_fee: fee,
        matched_slab: slab,
        service_hub: isServ ? 'Sri Aditya Organics & Oil Mill (Kothagudem)' : 'Out of Delivery Range',
        message: isServ
          ? `Delivery Available (~${clientDist.toFixed(1)} km from Kothagudem Mill)`
          : `Delivery currently unavailable (${clientDist.toFixed(0)} km from Kothagudem Mill; max delivery radius is 60 km).`,
        is_incomplete: !pin,
        source: isManualPin ? 'map_pin' : 'gps_detected',
        accuracy_level: isManualPin ? 'manual' : computeAccuracyLevel(accuracy),
        initial_gps_lat: initialGpsLat ?? lat,
        initial_gps_lon: initialGpsLon ?? lon,
      };
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Live Location Detection using Geolocation API + Watch Position Accuracy Enhancement
  const detectCurrentLocation = useCallback(async (isExplicitUserClick = false) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser. Please search or enter your address manually.');
      if (isExplicitUserClick) setIsLocationModalOpen(true);
      return;
    }

    setIsDetectingLocation(true);
    setLocationError(null);
    setShowInitialLocationBanner(false);

    // Clean up any ongoing watchPosition
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      async (initialPos) => {
        let bestCoords = initialPos.coords;

        // If initial accuracy is moderate or poor (> 35m), watch for 5 seconds to lock better GPS fix
        if (bestCoords.accuracy > ACCURACY_THRESHOLDS.GOOD) {
          const watchStartTime = Date.now();
          const watchTimeout = 5000;

          await new Promise<void>((resolve) => {
            const watchId = navigator.geolocation.watchPosition(
              (refinedPos) => {
                if (refinedPos.coords.accuracy < bestCoords.accuracy) {
                  bestCoords = refinedPos.coords;
                }
                // Stop if high accuracy is attained or timeout reached
                if (
                  bestCoords.accuracy <= ACCURACY_THRESHOLDS.GOOD ||
                  Date.now() - watchStartTime >= watchTimeout
                ) {
                  navigator.geolocation.clearWatch(watchId);
                  watchIdRef.current = null;
                  resolve();
                }
              },
              () => {
                navigator.geolocation.clearWatch(watchId);
                watchIdRef.current = null;
                resolve();
              },
              { enableHighAccuracy: true, maximumAge: 0, timeout: watchTimeout }
            );
            watchIdRef.current = watchId;

            // Safety timer
            setTimeout(() => {
              if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
              }
              resolve();
            }, watchTimeout + 200);
          });
        }

        try {
          const lat = bestCoords.latitude;
          const lon = bestCoords.longitude;
          const acc = bestCoords.accuracy;

          const result = await performReverseGeocode(lat, lon, acc, false, lat, lon);

          setDetectedLocation(result);
          setPinCoordinates({ lat, lon });
          setAccuracyLevel(result.accuracy_level);
          setIsConfirmingDeliveryLocation(true);
          setIsLocationModalOpen(false);
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
            errorMsg = 'Location permission was denied. Please allow location access or search your address manually.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'GPS signal is currently unavailable on this device. Please enter your PIN code or search your locality.';
            break;
          case error.TIMEOUT:
            errorMsg = 'Location detection timed out. Please search or enter your address manually.';
            break;
        }
        setLocationError(errorMsg);
        if (isExplicitUserClick) setIsLocationModalOpen(true);
      },
      geoOptions
    );
  }, []);

  // Update Pin on Map Drag or Click (Debounced reverse geocoding)
  const updatePinCoordinates = useCallback(async (lat: number, lon: number) => {
    setPinCoordinates({ lat, lon });

    if (pinDebounceTimerRef.current) {
      clearTimeout(pinDebounceTimerRef.current);
    }

    pinDebounceTimerRef.current = setTimeout(async () => {
      const initialLat = detectedLocation?.initial_gps_lat;
      const initialLon = detectedLocation?.initial_gps_lon;
      const updated = await performReverseGeocode(lat, lon, null, true, initialLat, initialLon);
      setDetectedLocation(updated);
      setAccuracyLevel('manual');
    }, 350);
  }, [detectedLocation]);

  // Action: Customer confirms "Yes, deliver here" with optional house/flat details
  const confirmDeliveryToDetectedLocation = useCallback(
    async (additionalDetails?: { flatNumber?: string; landmark?: string }) => {
      if (!detectedLocation) return;

      const flat = additionalDetails?.flatNumber?.trim() || detectedLocation.house_number || detectedLocation.building || '';
      const lmark = additionalDetails?.landmark?.trim() || detectedLocation.landmark || '';

      // Construct verified street address
      const streetParts = [
        flat ? `Flat/House ${flat}` : '',
        detectedLocation.road || detectedLocation.neighbourhood || detectedLocation.locality,
      ].filter(Boolean);

      const finalStreet = streetParts.length > 0 ? streetParts.join(', ') : detectedLocation.locality;
      const targetLat = pinCoordinates?.lat ?? detectedLocation.latitude;
      const targetLon = pinCoordinates?.lon ?? detectedLocation.longitude;

      let servFee = detectedLocation.delivery_fee ?? (detectedLocation.is_serviceable ? 20.0 : 0.0);
      let distKm: number | null = detectedLocation.distance_km ?? null;
      let distSource: string | null = null;
      let matchedSlab: string | null = detectedLocation.matched_slab ?? null;
      let estMinutes = detectedLocation.estimated_delivery_minutes;
      let isServ = detectedLocation.is_serviceable;
      let hub = detectedLocation.service_hub;

      try {
        const serv = await api.checkServiceability(
          detectedLocation.postal_code,
          targetLat,
          targetLon
        );
        servFee = serv.delivery_fee;
        distKm = serv.distance_km ?? null;
        distSource = serv.distance_source ?? null;
        matchedSlab = serv.matched_slab ?? null;
        estMinutes = serv.estimated_delivery_minutes;
        isServ = serv.is_serviceable;
        hub = serv.service_hub;
      } catch (err) {
        console.warn('Could not verify serviceability on confirm:', err);
      }

      const newDeliveryAddress: SelectedDeliveryAddress = {
        label: 'Confirmed Delivery Location',
        house_number: flat || undefined,
        apartment: flat || undefined,
        street: finalStreet,
        landmark: lmark || undefined,
        locality: detectedLocation.locality,
        city: detectedLocation.city,
        district: detectedLocation.district || undefined,
        state: detectedLocation.state,
        postal_code: detectedLocation.postal_code,
        country: detectedLocation.country || 'India',
        latitude: targetLat,
        longitude: targetLon,
        accuracy_meters: detectedLocation.accuracy_meters,
        formatted_address: detectedLocation.formatted_address,
        is_serviceable: isServ,
        service_hub: isServ ? hub : 'Out of Delivery Range',
        estimated_delivery_minutes: estMinutes,
        delivery_fee: servFee,
        distance_km: distKm,
        distance_source: distSource,
        matched_slab: matchedSlab,
        source: accuracyLevel === 'manual' ? 'map_pin' : 'gps_confirmed',
        confirmed_at: new Date().toISOString(),
        is_confirmed: true,
      };

      setSelectedDeliveryAddress(newDeliveryAddress);
      setSelectedAddressState(null);
      localStorage.setItem('sri_adithya_delivery_address', JSON.stringify(newDeliveryAddress));

      // Close confirmation dialog
      setIsConfirmingDeliveryLocation(false);
      setDetectedLocation(null);
      setPinCoordinates(null);
    },
    [detectedLocation, pinCoordinates, accuracyLevel]
  );

  const chooseAnotherAddress = useCallback(() => {
    setIsConfirmingDeliveryLocation(false);
    setDetectedLocation(null);
    setPinCoordinates(null);
    setIsLocationModalOpen(true);
  }, []);

  const dismissConfirmation = useCallback(() => {
    setIsConfirmingDeliveryLocation(false);
    setDetectedLocation(null);
    setPinCoordinates(null);
  }, []);

  // Select a saved address from customer account
  const selectSavedAddress = useCallback(async (addr: Address) => {
    let fee = 20.0;
    let dist: number | null = null;
    let distSource: string | null = null;
    let slab: string | null = null;
    const isExpress = isTelanganaPin(addr.postal_code);
    let hub = isExpress ? 'Sri Aditya Organics & Oil Mill (Kothagudem)' : 'Sri Adithya Organics Central Fulfillment Facility';
    let minutes = isExpress ? 15 : 48 * 60;
    let isServ = true;
    let servMsg: string | undefined = undefined;

    try {
      const serv = await api.checkServiceability(addr.postal_code, addr.latitude ?? undefined, addr.longitude ?? undefined);
      fee = serv.delivery_fee;
      dist = serv.distance_km ?? null;
      distSource = serv.distance_source ?? null;
      slab = serv.matched_slab ?? null;
      hub = serv.service_hub;
      minutes = serv.estimated_delivery_minutes;
      isServ = serv.is_serviceable;
      servMsg = serv.message;
    } catch {
      // fallback
    }

    const newDeliveryAddress: SelectedDeliveryAddress = {
      id: addr.id,
      label: addr.label,
      recipient_name: addr.recipient_name,
      phone: addr.phone,
      house_number: addr.house_number || undefined,
      apartment: addr.apartment || undefined,
      street: addr.street,
      locality: addr.locality || addr.city,
      landmark: addr.landmark || undefined,
      city: addr.city,
      state: addr.state,
      postal_code: addr.postal_code,
      country: 'India',
      latitude: addr.latitude ?? undefined,
      longitude: addr.longitude ?? undefined,
      accuracy_meters: addr.accuracy_meters ?? undefined,
      formatted_address: addr.formatted_address || `${addr.street}, ${addr.city} - ${addr.postal_code}`,
      is_serviceable: isServ,
      service_hub: hub,
      estimated_delivery_minutes: minutes,
      delivery_fee: fee,
      distance_km: dist,
      distance_source: distSource,
      matched_slab: slab,
      source: 'saved_address',
      confirmed_at: addr.confirmed_at || new Date().toISOString(),
      is_confirmed: true,
      message: servMsg,
    };

    setSelectedDeliveryAddress(newDeliveryAddress);
    setSelectedAddressState(addr);
    localStorage.setItem('sri_adithya_delivery_address', JSON.stringify(newDeliveryAddress));
    setIsLocationModalOpen(false);
  }, []);

  // Synchronize authenticated user's default saved address if current address is unconfirmed
  useEffect(() => {
    if (user && !selectedDeliveryAddress.is_confirmed) {
      api.getAddresses().then((addrs) => {
        if (addrs && addrs.length > 0) {
          const defaultAddr = addrs.find((a) => a.is_default) || addrs[0];
          selectSavedAddress(defaultAddr);
        }
      }).catch(() => {});
    }
  }, [user, selectedDeliveryAddress.is_confirmed, selectSavedAddress]);

  // Enter a delivery address manually
  const setManualDeliveryAddress = useCallback(async (input: ManualAddressInput): Promise<boolean> => {
    try {
      const pin = input.postal_code.trim();
      if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
        setLocationError('Please enter a valid 6-digit Indian PIN code.');
        return false;
      }

      let serviceResult = {
        is_serviceable: true,
        service_hub: 'Sri Adithya Organics Central Fulfillment Facility',
        estimated_delivery_minutes: 48 * 60,
        delivery_fee: 39.0,
        distance_km: null as number | null,
        distance_source: null as string | null,
        matched_slab: null as string | null,
      };

      try {
        const serv = await api.checkServiceability(pin, input.latitude, input.longitude);
        serviceResult = {
          is_serviceable: serv.is_serviceable,
          service_hub: serv.service_hub,
          estimated_delivery_minutes: serv.estimated_delivery_minutes,
          delivery_fee: serv.delivery_fee,
          distance_km: serv.distance_km ?? null,
          distance_source: serv.distance_source ?? null,
          matched_slab: serv.matched_slab ?? null,
        };
      } catch {
        const isExpress = isTelanganaPin(pin);
        serviceResult = {
          is_serviceable: true,
          service_hub: isExpress ? 'Sri Aditya Organics & Oil Mill (Kothagudem)' : 'Sri Adithya Organics Central Fulfillment Facility',
          estimated_delivery_minutes: isExpress ? 15 : 48 * 60,
          delivery_fee: isExpress ? 20.0 : 39.0,
          distance_km: null,
          distance_source: null,
          matched_slab: null,
        };
      }

      let createdAddressId: number | undefined;

      if (input.saveToAccount) {
        try {
          const created = await api.createAddress({
            label: input.label || 'Home',
            recipient_name: input.recipient_name,
            phone: input.phone,
            street: input.street,
            apartment: input.apartment,
            house_number: input.house_number,
            locality: input.locality || input.city,
            landmark: input.landmark,
            city: input.city || 'Kothagudem',
            state: input.state || 'Telangana',
            postal_code: pin,
            latitude: input.latitude,
            longitude: input.longitude,
            accuracy_meters: null,
            formatted_address: `${input.street}, ${input.city || 'Kothagudem'} - ${pin}`,
            confirmed_at: new Date().toISOString(),
            is_default: false,
          });
          createdAddressId = created.id;
          setSelectedAddressState(created);
        } catch (saveErr) {
          console.warn('Could not save address to account:', saveErr);
        }
      }

      const formatted = `${input.house_number ? `${input.house_number}, ` : ''}${input.street}, ${input.city} - ${pin}`;

      const newDeliveryAddress: SelectedDeliveryAddress = {
        id: createdAddressId,
        label: input.label || 'Delivery Address',
        recipient_name: input.recipient_name,
        phone: input.phone,
        house_number: input.house_number,
        apartment: input.apartment,
        street: input.street,
        locality: input.locality || input.city,
        landmark: input.landmark,
        city: input.city,
        state: input.state,
        postal_code: pin,
        country: input.country || 'India',
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy_meters: null,
        formatted_address: formatted,
        is_serviceable: serviceResult.is_serviceable,
        service_hub: serviceResult.service_hub,
        estimated_delivery_minutes: serviceResult.estimated_delivery_minutes,
        delivery_fee: serviceResult.delivery_fee,
        distance_km: serviceResult.distance_km,
        distance_source: serviceResult.distance_source,
        matched_slab: serviceResult.matched_slab,
        source: createdAddressId ? 'saved_address' : 'manual_entry',
        confirmed_at: new Date().toISOString(),
        is_confirmed: true,
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
      let hubName = 'Sri Aditya Organics & Oil Mill (Kothagudem)';
      let minutes = 15;
      let isServ = true;
      let cityName = 'Kothagudem';
      let fee = 20.0;
      let dist: number | null = 0.1;
      let distSource: string | null = null;
      let slab: string | null = '0–2 km';

      try {
        const serv = await api.checkServiceability(pin);
        hubName = serv.service_hub;
        minutes = serv.estimated_delivery_minutes;
        isServ = serv.is_serviceable;
        cityName = serv.city || 'Kothagudem';
        fee = serv.delivery_fee;
        dist = serv.distance_km ?? null;
        distSource = serv.distance_source ?? null;
        slab = serv.matched_slab ?? null;
      } catch {
        const isExpress = isTelanganaPin(pin);
        hubName = isExpress ? 'Sri Aditya Organics & Oil Mill (Kothagudem)' : 'Sri Adithya Organics Central Fulfillment Facility';
        minutes = isExpress ? 15 : 48 * 60;
        fee = isExpress ? 20.0 : 39.0;
      }

      const newDeliveryAddress: SelectedDeliveryAddress = {
        label: area,
        street: area,
        locality: area,
        city: cityName,
        state: 'Telangana',
        postal_code: pin,
        country: 'India',
        is_serviceable: isServ,
        service_hub: hubName,
        estimated_delivery_minutes: minutes,
        delivery_fee: fee,
        distance_km: dist,
        distance_source: distSource,
        matched_slab: slab,
        formatted_address: `${area}, ${cityName}, Telangana - ${pin}`,
        source: 'preset_hub',
        confirmed_at: new Date().toISOString(),
        is_confirmed: true,
      };

      setSelectedDeliveryAddress(newDeliveryAddress);
      setSelectedAddressState(null);
      localStorage.setItem('sri_adithya_delivery_address', JSON.stringify(newDeliveryAddress));
      setIsLocationModalOpen(false);
    } catch (e: any) {
      setLocationError(e.message || 'Could not set hub location.');
    }
  }, []);

  // Dynamic delivery fee recalculation based on actual distance & subtotal
  const recalculateDeliveryFee = useCallback(
    async (subtotal?: number) => {
      try {
        const pin = selectedDeliveryAddress.postal_code;
        const lat = selectedDeliveryAddress.latitude;
        const lon = selectedDeliveryAddress.longitude;
        const serv = await api.checkServiceability(pin, lat, lon, subtotal);

        setSelectedDeliveryAddress((prev) => {
          const updated: SelectedDeliveryAddress = {
            ...prev,
            delivery_fee: serv.delivery_fee,
            distance_km: serv.distance_km,
            distance_source: serv.distance_source,
            matched_slab: serv.matched_slab,
            estimated_delivery_minutes: serv.estimated_delivery_minutes,
            is_serviceable: serv.is_serviceable,
          };
          try {
            localStorage.setItem('sri_adithya_delivery_address', JSON.stringify(updated));
          } catch {}
          return updated;
        });

        return {
          fee: serv.delivery_fee,
          distance_km: serv.distance_km ?? null,
          is_serviceable: serv.is_serviceable,
          matched_slab: serv.matched_slab ?? null,
        };
      } catch (err) {
        console.warn('Recalculate delivery fee notice:', err);
        return {
          fee: selectedDeliveryAddress.is_serviceable ? (selectedDeliveryAddress.delivery_fee ?? 20.0) : 0,
          distance_km: selectedDeliveryAddress.distance_km ?? null,
          is_serviceable: selectedDeliveryAddress.is_serviceable,
          matched_slab: selectedDeliveryAddress.matched_slab ?? null,
        };
      }
    },
    [selectedDeliveryAddress]
  );

  // Address Autocomplete Search
  const searchAddresses = useCallback(async (query: string): Promise<AddressSearchResult[]> => {
    if (!query || query.trim().length < 2) return [];
    try {
      return await api.searchAddresses(query);
    } catch (err) {
      console.warn('Address search failed:', err);
      return [];
    }
  }, []);

  // Select Search Result: Fly map pin to searched location and prompt confirmation
  const selectSearchResult = useCallback(async (result: AddressSearchResult) => {
    setIsDetectingLocation(true);
    setIsLocationModalOpen(false);

    try {
      const detected = await performReverseGeocode(result.latitude, result.longitude, null, true);
      setDetectedLocation(detected);
      setPinCoordinates({ lat: result.latitude, lon: result.longitude });
      setAccuracyLevel('manual');
      setIsConfirmingDeliveryLocation(true);
    } catch (err: any) {
      setLocationError(err.message || 'Failed to select search location.');
    } finally {
      setIsDetectingLocation(false);
    }
  }, []);

  const handleSetSelectedAddress = useCallback((addr: Address | null) => {
    if (addr) {
      selectSavedAddress(addr);
    } else {
      setSelectedAddressState(null);
    }
  }, [selectSavedAddress]);

  // Formatted location label for Header and Cards
  const locationLabel = !selectedDeliveryAddress.is_confirmed
    ? 'Select Delivery Location'
    : selectedDeliveryAddress.apartment || selectedDeliveryAddress.house_number
    ? `${selectedDeliveryAddress.apartment || selectedDeliveryAddress.house_number}, ${selectedDeliveryAddress.street}, ${selectedDeliveryAddress.city}${selectedDeliveryAddress.postal_code ? ` - ${selectedDeliveryAddress.postal_code}` : ''}`
    : `${selectedDeliveryAddress.locality || selectedDeliveryAddress.street}, ${selectedDeliveryAddress.city}${selectedDeliveryAddress.postal_code ? ` - ${selectedDeliveryAddress.postal_code}` : ''}`;

  return (
    <LocationContext.Provider
      value={{
        detectedLocation,
        pinCoordinates,
        isDetectingLocation,
        isReverseGeocoding,
        locationError,
        accuracyLevel,
        detectCurrentLocation,
        updatePinCoordinates,
        clearLocationError,

        isConfirmingDeliveryLocation,
        confirmDeliveryToDetectedLocation,
        chooseAnotherAddress,
        dismissConfirmation,

        selectedDeliveryAddress,
        locationLabel,
        pincode: selectedDeliveryAddress.postal_code,
        isServiceable: selectedDeliveryAddress.is_serviceable,
        isLocationConfirmed: selectedDeliveryAddress.is_confirmed,
        serviceHub: selectedDeliveryAddress.service_hub,
        deliveryMinutes: selectedDeliveryAddress.estimated_delivery_minutes,
        deliveryFee: selectedDeliveryAddress.is_serviceable ? (selectedDeliveryAddress.delivery_fee ?? 20.0) : 0,
        distanceKm: selectedDeliveryAddress.distance_km ?? null,
        matchedSlab: selectedDeliveryAddress.matched_slab || undefined,
        recalculateDeliveryFee,

        selectedAddress,
        setSelectedAddress: handleSetSelectedAddress,

        isLocationModalOpen,
        openLocationModal,
        closeLocationModal,
        selectSavedAddress,
        setManualDeliveryAddress,
        setPresetHubLocation,
        searchAddresses,
        selectSearchResult,

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
