import React from 'react';
import { Link } from 'react-router-dom';

interface BrandLogoProps {
  className?: string;
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  inverted?: boolean;
  asLink?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  showTagline = true,
  size = 'md',
  inverted = false,
  asLink = true,
}) => {
  const iconSize =
    size === 'sm'
      ? 'w-7 h-7 xs:w-8 xs:h-8'
      : size === 'lg'
      ? 'w-11 h-11 sm:w-12 sm:h-12'
      : size === 'xl'
      ? 'w-14 h-14 sm:w-16 sm:h-16'
      : 'w-8 h-8 sm:w-10 sm:h-10';
  const textClass =
    size === 'sm'
      ? 'text-xs xs:text-sm sm:text-base'
      : size === 'lg'
      ? 'text-xl sm:text-2xl'
      : size === 'xl'
      ? 'text-2xl sm:text-3xl'
      : 'text-sm xs:text-base sm:text-xl';
  const taglineClass =
    size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-xs' : size === 'xl' ? 'text-xs' : 'text-[10px]';

  const content = (
    <div className={`group flex items-center gap-2 sm:gap-2.5 transition-transform select-none ${className}`}>
      {/* Official Business Logo - Exact aspect ratio and image preserved without distortion */}
      <div
        className={`relative flex items-center justify-center shrink-0 rounded-full overflow-hidden bg-white shadow-sm border border-stone-200/80 p-0.5 group-hover:scale-105 transition-all duration-200 aspect-square ${iconSize}`}
      >
        <img
          src="/brand/sri-adithya-logo.png"
          alt="Sri Adithya Organics Official Logo"
          className="w-full h-full object-contain rounded-full aspect-square"
          loading="eager"
        />
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col leading-tight min-w-0">
        <div className="flex items-baseline gap-1 sm:gap-1.5 truncate">
          <span
            className={`font-display font-extrabold tracking-tight transition-colors truncate ${
              inverted ? 'text-white' : 'text-stone-900 group-hover:text-emerald-900'
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
    </div>
  );

  if (!asLink) {
    return content;
  }

  return (
    <Link to="/" className="inline-flex">
      {content}
    </Link>
  );
};


