import { useEffect, useRef } from 'react';
import { API_BASE, invalidateApiCache } from '../services/api';

export interface RealtimeEventPayload {
  event_type: string;
  data: any;
  version: number;
  timestamp: string;
}

export function useRealtimeSync(onEvent?: (event: RealtimeEventPayload) => void) {
  const retryCountRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let isMounted = true;
    let reconnectTimeout: any = null;

    const connect = () => {
      if (!isMounted) return;

      const eventsUrl = `${API_BASE}/events`;
      try {
        const es = new EventSource(eventsUrl);
        eventSourceRef.current = es;

        es.onopen = () => {
          retryCountRef.current = 0;
        };

        es.onmessage = (e) => {
          try {
            const parsed: RealtimeEventPayload = JSON.parse(e.data);
            if (!parsed || !parsed.event_type) return;

            // Invalidate respective in-memory client caches based on event type
            switch (parsed.event_type) {
              case 'PRODUCT_CREATED':
              case 'PRODUCT_UPDATED':
              case 'PRODUCT_DELETED':
              case 'VARIANT_UPDATED':
                invalidateApiCache('/products');
                window.dispatchEvent(new CustomEvent('sa_products_updated', { detail: parsed }));
                break;
              case 'INVENTORY_UPDATED':
              case 'INVENTORY_RESTOCKED':
                invalidateApiCache('/products');
                window.dispatchEvent(new CustomEvent('sa_inventory_updated', { detail: parsed }));
                break;
              case 'CATEGORY_CREATED':
              case 'CATEGORY_UPDATED':
              case 'CATEGORY_DELETED':
                invalidateApiCache('/categories');
                window.dispatchEvent(new CustomEvent('sa_categories_updated', { detail: parsed }));
                break;
              case 'SETTINGS_UPDATED':
                invalidateApiCache('/settings');
                window.dispatchEvent(new CustomEvent('sa_settings_updated', { detail: parsed }));
                break;
              case 'ORDER_CREATED':
              case 'ORDER_UPDATED':
              case 'ORDER_CANCELLED':
                invalidateApiCache('/orders');
                window.dispatchEvent(new CustomEvent('sa_orders_updated', { detail: parsed }));
                break;
              default:
                break;
            }

            // Trigger caller callback if provided
            if (onEventRef.current) {
              onEventRef.current(parsed);
            }
          } catch (err) {
            // Heartbeat or malformed JSON
          }
        };

        es.onerror = () => {
          es.close();
          eventSourceRef.current = null;
          if (isMounted) {
            // Exponential backoff reconnect
            const delay = Math.min(30000, 1000 * Math.pow(2, retryCountRef.current));
            retryCountRef.current += 1;
            reconnectTimeout = setTimeout(connect, delay);
          }
        };
      } catch (err) {
        if (isMounted) {
          reconnectTimeout = setTimeout(connect, 5000);
        }
      }
    };

    // Recheck on tab focus / visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    connect();

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);
}

