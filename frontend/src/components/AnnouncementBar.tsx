import React, { useMemo } from 'react';
import { Leaf, Truck, Sparkles } from 'lucide-react';
import { useStoreSettings } from '../context/SettingsContext';

export const AnnouncementBar: React.FC = () => {
  const { announcementText } = useStoreSettings();

  const segments = useMemo(() => {
    const raw = (announcementText || '').trim();
    if (!raw) {
      return [
        'Traditional & Pure Sri Adithya Organics',
        '100% Traditional Wood-Pressed Oils & Farm Produce',
        'Free delivery on orders over ₹499'
      ];
    }
    if (raw.includes('•')) {
      const parts = raw.split('•').map((s) => s.trim()).filter(Boolean);
      if (parts.length > 0) return parts;
    }
    return [raw];
  }, [announcementText]);

  const renderIcon = (idx: number) => {
    const mod = idx % 3;
    if (mod === 0) return <Leaf className="w-3.5 h-3.5 text-rootly-sagePale shrink-0" />;
    if (mod === 1) return <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />;
    return <Truck className="w-3.5 h-3.5 text-rootly-sagePale shrink-0" />;
  };

  const itemContent = (
    <span className="px-6 sm:px-10 inline-flex items-center gap-3">
      {segments.map((seg, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-rootly-sagePale/60">•</span>}
          <span className="inline-flex items-center gap-1.5">
            {renderIcon(i)}
            <span>{seg}</span>
          </span>
        </React.Fragment>
      ))}
    </span>
  );

  return (
    <div
      role="region"
      aria-label="Store Announcement"
      className="sao-marquee-wrapper bg-rootly-forest text-[#FAF8F5] text-[11px] sm:text-xs font-semibold h-7 sm:h-8 flex items-center border-b border-emerald-950/40 select-none shadow-sm"
    >
      <div className="sao-marquee-track">
        {/* Track 1: Base continuous items */}
        <div className="flex items-center shrink-0 whitespace-nowrap">
          {itemContent}
          <span className="text-rootly-sagePale/60">•</span>
          {itemContent}
          <span className="text-rootly-sagePale/60">•</span>
          {itemContent}
          <span className="text-rootly-sagePale/60">•</span>
        </div>

        {/* Track 2: Duplicate items for seamless continuous infinite loop with zero gaps */}
        <div
          className="sao-marquee-duplicate flex items-center shrink-0 whitespace-nowrap"
          aria-hidden="true"
        >
          {itemContent}
          <span className="text-rootly-sagePale/60">•</span>
          {itemContent}
          <span className="text-rootly-sagePale/60">•</span>
          {itemContent}
          <span className="text-rootly-sagePale/60">•</span>
        </div>
      </div>
    </div>
  );
};
