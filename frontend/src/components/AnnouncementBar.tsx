import React from 'react';

const ANNOUNCEMENT_TEXT =
  'Traditional & Pure 🌿 Sri Adithya Organics • 100% Traditional Wood-Pressed Oils & Farm Produce • Free delivery on orders over ₹499';

export const AnnouncementBar: React.FC = () => {
  return (
    <div
      role="region"
      aria-label="Store Announcement"
      className="sao-marquee-wrapper bg-rootly-forest text-[#FAF8F5] text-[11px] sm:text-xs font-semibold h-7 sm:h-8 flex items-center border-b border-emerald-950/40 select-none shadow-sm"
    >
      <div className="sao-marquee-track">
        {/* Track 1: Base continuous items */}
        <div className="flex items-center shrink-0 whitespace-nowrap">
          <span className="px-6 sm:px-10 inline-flex items-center gap-1.5">
            {ANNOUNCEMENT_TEXT}
          </span>
          <span className="text-rootly-sagePale/60">•</span>
          <span className="px-6 sm:px-10 inline-flex items-center gap-1.5">
            {ANNOUNCEMENT_TEXT}
          </span>
          <span className="text-rootly-sagePale/60">•</span>
        </div>

        {/* Track 2: Duplicate items for seamless continuous infinite loop with zero gaps */}
        <div
          className="sao-marquee-duplicate flex items-center shrink-0 whitespace-nowrap"
          aria-hidden="true"
        >
          <span className="px-6 sm:px-10 inline-flex items-center gap-1.5">
            {ANNOUNCEMENT_TEXT}
          </span>
          <span className="text-rootly-sagePale/60">•</span>
          <span className="px-6 sm:px-10 inline-flex items-center gap-1.5">
            {ANNOUNCEMENT_TEXT}
          </span>
          <span className="text-rootly-sagePale/60">•</span>
        </div>
      </div>
    </div>
  );
};

