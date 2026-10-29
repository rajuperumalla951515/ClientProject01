import React from 'react';
import { Leaf, Truck, Sparkles } from 'lucide-react';

export const AnnouncementBar: React.FC = () => {
  const itemContent = (
    <span className="px-6 sm:px-10 inline-flex items-center gap-2">
      <Leaf className="w-3.5 h-3.5 text-rootly-sagePale shrink-0" />
      <span>Traditional & Pure Sri Adithya Organics</span>
      <span className="text-rootly-sagePale/60">•</span>
      <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
      <span>100% Traditional Wood-Pressed Oils & Farm Produce</span>
      <span className="text-rootly-sagePale/60">•</span>
      <Truck className="w-3.5 h-3.5 text-rootly-sagePale shrink-0" />
      <span>Free delivery on orders over ₹499</span>
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
        </div>
      </div>
    </div>
  );
};

