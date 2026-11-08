import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { DeliverySetting } from '../types';
import { api } from '../services/api';

interface SettingsContextType {
  settings: DeliverySetting | null;
  isLoading: boolean;
  announcementText: string;
  freeDeliveryThreshold: number;
  standardDeliveryFee: number;
  expressDeliveryFee: number;
  minOrderAmount: number;
  whatsappNumber: string;
  activeSlots: string[];
  refreshSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: DeliverySetting = {
  id: 1,
  min_order_amount: 99.0,
  free_delivery_threshold: 499.0,
  standard_delivery_fee: 39.0,
  express_delivery_fee: 59.0,
  active_slots_json: JSON.stringify([
    'Express Delivery (15-30 Mins)',
    'Morning Harvest Slot (7:00 AM - 9:30 AM)',
    'Evening Slot (5:30 PM - 8:00 PM)',
  ]),
  announcement_text: 'Traditional & Pure Sri Adithya Organics • 100% Traditional Wood-Pressed Oils & Farm Produce • Free delivery on orders over ₹499',
  whatsapp_number: '919515159006',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<DeliverySetting>(() => {
    try {
      const cached = localStorage.getItem('sri_adithya_cached_settings');
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await api.getSettings(true);
      if (data) {
        setSettings(data);
        try {
          localStorage.setItem('sri_adithya_cached_settings', JSON.stringify(data));
        } catch {}
      }
    } catch (err) {
      console.warn('Could not fetch store settings, using cached/default:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    // Listen for real-time SSE settings update event from useRealtimeSync
    const handleSettingsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setSettings((prev) => {
          const updated = {
            ...prev,
            ...customEvent.detail,
          };
          try {
            localStorage.setItem('sri_adithya_cached_settings', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      } else {
        fetchSettings();
      }
    };

    window.addEventListener('sa_settings_updated', handleSettingsUpdated);
    window.addEventListener('focus', fetchSettings);

    return () => {
      window.removeEventListener('sa_settings_updated', handleSettingsUpdated);
      window.removeEventListener('focus', fetchSettings);
    };
  }, [fetchSettings]);

  // Parse delivery slots
  const activeSlots = useMemo(() => {
    try {
      if (settings.active_slots_json) {
        const parsed = JSON.parse(settings.active_slots_json);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      'Express Delivery (15-30 Mins)',
      'Morning Harvest Slot (7:00 AM - 9:30 AM)',
      'Evening Slot (5:30 PM - 8:00 PM)',
    ];
  }, [settings.active_slots_json]);

  const value: SettingsContextType = {
    settings,
    isLoading,
    announcementText: settings.announcement_text && settings.announcement_text.trim()
      ? settings.announcement_text.trim()
      : DEFAULT_SETTINGS.announcement_text!,
    freeDeliveryThreshold: Number(settings.free_delivery_threshold) || 499.0,
    standardDeliveryFee: Number(settings.standard_delivery_fee) || 39.0,
    expressDeliveryFee: Number(settings.express_delivery_fee) || 59.0,
    minOrderAmount: Number(settings.min_order_amount) || 99.0,
    whatsappNumber: settings.whatsapp_number?.trim() || '919515159006',
    activeSlots,
    refreshSettings: fetchSettings,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useStoreSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useStoreSettings must be used within a SettingsProvider');
  }
  return context;
};

