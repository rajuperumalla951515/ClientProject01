import { useEffect, useRef } from 'react';
import { API_BASE } from '../services/api';

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

      const eventsUrl = `${API_BASE}/api/events`;
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

            // Dispatch global event for admin components
            window.dispatchEvent(new CustomEvent('admin_realtime_event', { detail: parsed }));

            if (onEventRef.current) {
              onEventRef.current(parsed);
            }
          } catch (err) {
            // Heartbeat or ping
          }
        };

        es.onerror = () => {
          es.close();
          eventSourceRef.current = null;
          if (isMounted) {
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

