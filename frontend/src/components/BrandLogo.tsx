import React from 'react';
import { Link } from 'react-router-dom';

interface BrandLogoProps {
  className?: string;
  showTagline?: boolean;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  inverted?: boolean;
  asLink?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  showTagline = false,
  showText = false,
  size = 'md',
  inverted = false,
  asLink = true,
}) => {
  const logoHeight =
    size === 'sm'
      ? 'h-10 xs:h-11 sm:h-12'
      : size === 'lg'
      ? 'h-16 sm:h-18 md:h-20'
      : size === 'xl'
      ? 'h-20 sm:h-24 md:h-28'
      : 'h-12 sm:h-14 md:h-16';

  const textClass =
    size === 'sm'
      ? 'text-xs xs:text-sm sm:text-base'
      : size === 'lg'
      ? 'text-xl sm:text-2xl'
      : size === 'xl'
      ? 'text-2xl sm:text-3xl'
      : 'text-sm xs:text-base sm:text-xl';

  const taglineClass =
    size === 'sm'
      ? 'text-[9px]'
      : size === 'lg'
      ? 'text-xs'
      : size === 'xl'
      ? 'text-xs'
      : 'text-[10px]';

  const content = (
    <div
      className={`flex items-center gap-2 sm:gap-2.5 select-none pointer-events-auto transform-none transition-none ${className}`}
    >
      {/* Official Business Logo - authentic uncropped aspect ratio, strictly zero hover zoom/distortion/animation */}
      <div className="relative flex items-center justify-center shrink-0 transform-none transition-none">
        <img
          src="/brand/sri-adithya-logo.png"
          alt="Sri Adithya Organics"
          className={`${logoHeight} w-auto object-contain select-none pointer-events-auto transform-none transition-none hover:scale-100 hover:opacity-100 active:scale-100 focus:scale-100`}
          loading="eager"
          decoding="async"
          draggable={false}
        />
      </div>

      {/* Brand Typography (Optional: shown only when showText is explicitly requested) */}
      {showText && (
        <div className={`flex flex-col leading-tight min-w-0 ${size === 'sm' ? 'hidden xs:flex' : 'flex'}`}>
          <div className="flex items-baseline gap-1 sm:gap-1.5 truncate">
            <span
              className={`font-display font-extrabold tracking-tight truncate ${
                inverted ? 'text-white' : 'text-stone-900'
              } ${textClass}`}
            >
              Sri Adithya
            </span>
            <span
              className={`font-display font-medium tracking-tight ${
                inverted ? 'text-emerald-400' : 'text-emerald-700'
              } ${textClass}`}
            >
              Organics
            </span>
          </div>
          {showTagline && (
            <span
              className={`font-medium tracking-wider uppercase hidden sm:block ${
                inverted ? 'text-stone-300/80' : 'text-stone-500'
              } ${taglineClass}`}
            >
              Traditional Cold-Pressed & Pure Organics
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (!asLink) {
    return content;
  }

  return (
    <Link
      to="/"
      className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded-lg hover:opacity-100 active:opacity-100 transition-none transform-none cursor-pointer"
      aria-label="Sri Adithya Organics Home"
    >
      {content}
    </Link>
  );
};

