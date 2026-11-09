import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Navigation, Move, LocateFixed } from 'lucide-react';

interface InteractiveDeliveryMapProps {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  onCoordinatesChange: (lat: number, lon: number) => void;
  isDraggable?: boolean;
  height?: string;
  className?: string;
  initialGpsLat?: number;
  initialGpsLon?: number;
}

export const InteractiveDeliveryMap: React.FC<InteractiveDeliveryMapProps> = ({
  latitude,
  longitude,
  accuracyMeters,
  onCoordinatesChange,
  isDraggable = true,
  height = '260px',
  className = '',
  initialGpsLat,
  initialGpsLon,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const [isMoved, setIsMoved] = useState(false);

  // Store onCoordinatesChange in a ref to avoid stale closures in Leaflet events
  const onCoordinatesChangeRef = useRef(onCoordinatesChange);
  useEffect(() => {
    onCoordinatesChangeRef.current = onCoordinatesChange;
  }, [onCoordinatesChange]);

  // Custom high-visibility organic pin icon
  const createCustomPinIcon = useCallback(() => {
    return L.divIcon({
      className: 'custom-delivery-pin',
      html: `
        <div style="position: relative; width: 36px; height: 42px; transform: translate(-50%, -100%); cursor: grab;">
          <div style="
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #1B3B22 0%, #2D5A27 100%);
            border: 3px solid #FFFFFF;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 14px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 12px;
              height: 12px;
              background-color: #52B788;
              border-radius: 50%;
              transform: rotate(45deg);
              box-shadow: 0 0 8px rgba(82, 183, 136, 0.8);
            "></div>
          </div>
          <div style="
            position: absolute;
            bottom: -3px;
            left: 50%;
            transform: translateX(-50%);
            width: 10px;
            height: 4px;
            background: rgba(0,0,0,0.25);
            border-radius: 50%;
            filter: blur(1px);
          "></div>
        </div>
      `,
      iconSize: [36, 42],
      iconAnchor: [18, 42],
    });
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 17,
      zoomControl: false,
      attributionControl: false,
    });

    // Clean OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);

    // Zoom controls at bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Add Draggable Delivery Marker
    const marker = L.marker([latitude, longitude], {
      icon: createCustomPinIcon(),
      draggable: isDraggable,
      autoPan: true,
    }).addTo(map);

    markerRef.current = marker;

    // Add Accuracy Circle if reported
    if (accuracyMeters && accuracyMeters > 0) {
      const circle = L.circle([latitude, longitude], {
        radius: Math.min(accuracyMeters, 250),
        color: '#2D5A27',
        fillColor: '#52B788',
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: '4, 4',
      }).addTo(map);
      accuracyCircleRef.current = circle;
    }

    // Drag End Listener
    if (isDraggable) {
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setIsMoved(true);
        if (accuracyCircleRef.current) {
          accuracyCircleRef.current.setLatLng(pos);
        }
        onCoordinatesChangeRef.current(pos.lat, pos.lng);
      });

      // Tap / Click anywhere on map moves the pin
      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        setIsMoved(true);
        if (accuracyCircleRef.current) {
          accuracyCircleRef.current.setLatLng(e.latlng);
        }
        map.panTo(e.latlng, { animate: true, duration: 0.5 });
        onCoordinatesChangeRef.current(e.latlng.lat, e.latlng.lng);
      });
    }

    mapInstanceRef.current = map;

    // Invalidate size to ensure crisp rendering inside modals and tabs
    const timer1 = setTimeout(() => map.invalidateSize(), 150);
    const timer2 = setTimeout(() => map.invalidateSize(), 400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update marker when external coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    const currentPos = markerRef.current.getLatLng();
    if (
      Math.abs(currentPos.lat - latitude) > 0.00005 ||
      Math.abs(currentPos.lng - longitude) > 0.00005
    ) {
      markerRef.current.setLatLng([latitude, longitude]);
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng([latitude, longitude]);
        if (accuracyMeters) {
          accuracyCircleRef.current.setRadius(Math.min(accuracyMeters, 250));
        }
      }
      mapInstanceRef.current.setView([latitude, longitude], mapInstanceRef.current.getZoom(), {
        animate: true,
      });
    }
  }, [latitude, longitude, accuracyMeters]);

  // Recenter to initial GPS position
  const handleRecenterToGps = () => {
    const targetLat = initialGpsLat ?? latitude;
    const targetLon = initialGpsLon ?? longitude;
    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([targetLat, targetLon]);
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng([targetLat, targetLon]);
      }
      mapInstanceRef.current.setView([targetLat, targetLon], 17, { animate: true });
      setIsMoved(false);
      onCoordinatesChangeRef.current(targetLat, targetLon);
    }
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-stone-200 shadow-inner ${className}`} style={{ height }}>
      {/* Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Banner Guide */}
      {isDraggable && (
        <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl shadow-md border border-stone-200/80 flex items-center gap-1.5 pointer-events-auto">
            <Move className="w-3.5 h-3.5 text-rootly-forest animate-pulse" />
            <span className="text-[11px] font-bold text-stone-700">
              {isMoved ? 'Pin Adjusted • Click anywhere or drag to refine' : 'Drag pin or click map to pinpoint building entrance'}
            </span>
          </div>

          {(initialGpsLat !== undefined && initialGpsLon !== undefined) && (
            <button
              type="button"
              onClick={handleRecenterToGps}
              title="Snap back to detected GPS coordinates"
              className="bg-white px-2.5 py-1.5 rounded-xl shadow-md border border-stone-200 text-stone-700 hover:text-rootly-forest text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 pointer-events-auto"
            >
              <LocateFixed className="w-3.5 h-3.5 text-rootly-forest" />
              <span className="hidden xs:inline">Reset to GPS</span>
            </button>
          )}
        </div>
      )}

      {/* Accuracy Tag overlay at bottom-left */}
      {accuracyMeters && accuracyMeters > 0 && (
        <div className="absolute bottom-2.5 left-2.5 z-10 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-stone-200 text-[10px] font-semibold text-stone-600 shadow-sm">
          Accuracy: ±{Math.round(accuracyMeters)}m
        </div>
      )}
    </div>
  );
};

