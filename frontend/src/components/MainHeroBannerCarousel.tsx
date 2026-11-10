import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Pause, ArrowRight, Sparkles } from 'lucide-react';

export interface BannerSlide {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  alt: string;
  desktopWebp: string;
  desktopPng: string;
  mobileWebp: string;
  mobilePng: string;
  targetLink: string;
  ctaText: string;
}

// Banners matched between Desktop Wide and Mobile 1:1 Square posters
export const BANNER_SLIDES: BannerSlide[] = [
  {
    id: 'organic-oils-heritage',
    title: 'Traditional Wood-Pressed Organic Oils',
    subtitle: 'Ancestral Vaagai Marachekku extracted strictly below 40°C. 100% pure, unrefined & chemical-free.',
    badge: 'Flagship Vaagai Marachekku',
    alt: 'Sri Adithya Organics Traditional Wood-Pressed Oils Banner',
    desktopWebp: '/banners/banner-organic-oils.webp',
    desktopPng: '/banners/banner-organic-oils.png',
    mobileWebp: '/banners/mobile-banner-organic-oils.webp',
    mobilePng: '/banners/mobile-banner-organic-oils.png',
    targetLink: '/products?category=cold-pressed-oils',
    ctaText: 'Shop Wood-Pressed Oils',
  },
  {
    id: 'natural-edible-oils',
    title: '100% Pure & Natural Cold-Pressed Oils',
    subtitle: 'Farm-fresh groundnut, white sesame, yellow mustard, and coconut oils bottled at source.',
    badge: '100% Cold-Pressed',
    alt: 'Sri Adithya Organics 100% Natural Cold-Pressed Edible Oils Banner',
    desktopWebp: '/banners/banner-natural-oils.webp',
    desktopPng: '/banners/banner-natural-oils.png',
    mobileWebp: '/banners/mobile-banner-natural-oils.webp',
    mobilePng: '/banners/mobile-banner-natural-oils.png',
    targetLink: '/products?category=cold-pressed-oils',
    ctaText: 'Explore Pure Oils',
  },
  {
    id: 'natures-goodness-farm',
    title: "Nature’s Goodness Direct from Our Telangana Mill",
    subtitle: 'Pure A2 bilona cow ghee, heirloom millets, stone-ground flours, and natural daily groceries.',
    badge: 'Farm Direct Purity',
    alt: "Sri Adithya Organics — Nature's Goodness Direct from Farm Banner",
    desktopWebp: '/banners/banner-natures-goodness.webp',
    desktopPng: '/banners/banner-natures-goodness.png',
    mobileWebp: '/banners/mobile-banner-natures-goodness.webp',
    mobilePng: '/banners/mobile-banner-natures-goodness.png',
    targetLink: '/products',
    ctaText: 'Shop All Organics',
  },
];

interface ExtendedSlide extends BannerSlide {
  extendedKey: string;
  isClone: boolean;
  realIndex: number;
}

// Circular buffer for infinite smooth horizontal sliding: [Clone_Last, ...Slides, Clone_First]
const EXTENDED_SLIDES: ExtendedSlide[] = [
  {
    ...BANNER_SLIDES[BANNER_SLIDES.length - 1],
    extendedKey: 'clone-prev',
    isClone: true,
    realIndex: BANNER_SLIDES.length - 1,
  },
  ...BANNER_SLIDES.map((s, idx) => ({
    ...s,
    extendedKey: `slide-${s.id}`,
    isClone: false,
    realIndex: idx,
  })),
  {
    ...BANNER_SLIDES[0],
    extendedKey: 'clone-next',
    isClone: true,
    realIndex: 0,
  },
];

const ROTATION_INTERVAL_MS = 5000;
const TRANSITION_DURATION_MS = 750;

export const MainHeroBannerCarousel: React.FC = () => {
  // trackIndex: 1 corresponds to Slide 0; 0 is Clone_Last, BANNER_SLIDES.length + 1 is Clone_First
  const [trackIndex, setTrackIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Key tracking to force CSS progress bar restart on slide change
  const [progressKey, setProgressKey] = useState(0);

  // Touch swipe tracking refs
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const touchEndYRef = useRef<number | null>(null);

  // Reduced motion media query listener
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Preload secondary banner images (both desktop & mobile) for instant smooth sliding
  useEffect(() => {
    BANNER_SLIDES.forEach((slide) => {
      const deskImg = new Image();
      deskImg.src = slide.desktopWebp;
      const mobImg = new Image();
      mobImg.src = slide.mobileWebp;
    });
  }, []);

  // Pause carousel when browser tab is inactive / minimized
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Navigate to Next slide with smooth right-to-left slide
  const goToNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTrackIndex((prev) => prev + 1);
    setProgressKey((k) => k + 1);
  }, [isTransitioning]);

  // Navigate to Previous slide with smooth left-to-right slide
  const goToPrev = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTrackIndex((prev) => prev - 1);
    setProgressKey((k) => k + 1);
  }, [isTransitioning]);

  // Jump to specific slide via pagination dot
  const goToSlide = useCallback((dotIndex: number) => {
    if (isTransitioning) return;
    const targetTrackIndex = dotIndex + 1;
    if (targetTrackIndex === trackIndex) return;
    setIsTransitioning(true);
    setTrackIndex(targetTrackIndex);
    setProgressKey((k) => k + 1);
  }, [isTransitioning, trackIndex]);

  // Infinite sliding snap reset on transition completion
  const handleTransitionEnd = () => {
    setIsTransitioning(false);
    if (trackIndex === 0) {
      // Reached previous clone -> instantly snap to real last slide
      setTrackIndex(BANNER_SLIDES.length);
    } else if (trackIndex === BANNER_SLIDES.length + 1) {
      // Reached next clone -> instantly snap to real first slide
      setTrackIndex(1);
    }
  };

  // Safety fallback in case transitionEnd event is swallowed by browser
  useEffect(() => {
    if (trackIndex === 0 || trackIndex === BANNER_SLIDES.length + 1) {
      const safetyTimer = setTimeout(() => {
        setIsTransitioning(false);
        if (trackIndex === 0) {
          setTrackIndex(BANNER_SLIDES.length);
        } else if (trackIndex === BANNER_SLIDES.length + 1) {
          setTrackIndex(1);
        }
      }, TRANSITION_DURATION_MS + 80);
      return () => clearTimeout(safetyTimer);
    }
  }, [trackIndex]);

  // Automatic slide rotation interval (approx 5 seconds)
  useEffect(() => {
    if (!isPlaying || !isTabVisible || isHovered) {
      return;
    }

    const timer = setInterval(() => {
      goToNext();
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isPlaying, isTabVisible, isHovered, goToNext]);

  // Keyboard navigation when carousel is focused
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goToPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goToNext();
    }
  };

  // Touch Swipe Handlers for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchEndXRef.current = null;
    touchEndYRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.touches[0].clientX;
    touchEndYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current === null || touchEndXRef.current === null) return;
    const deltaX = touchStartXRef.current - touchEndXRef.current;
    const deltaY = (touchStartYRef.current || 0) - (touchEndYRef.current || 0);

    // Only swipe if horizontal swipe exceeds vertical swipe by threshold
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchEndXRef.current = null;
    touchEndYRef.current = null;
  };

  // Calculate authoritative active dot index (0, 1, 2)
  let activeDotIndex = 0;
  if (trackIndex === 0) {
    activeDotIndex = BANNER_SLIDES.length - 1;
  } else if (trackIndex === BANNER_SLIDES.length + 1) {
    activeDotIndex = 0;
  } else {
    activeDotIndex = trackIndex - 1;
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-[#E6E7DD] shadow-lift bg-[#F3EFEA] group select-none"
      role="region"
      aria-roledescription="carousel"
      aria-label="Sri Adithya Organics Featured Promotional Banners"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Aspect Ratio Container:
          Mobile (<640px): aspect-square (1:1 aspect-ratio) matching 1254x1254 square images perfectly without blank borders.
          Tablet & Desktop (>=640px): responsive wide banner aspect ratios (2.4:1 to 2.85:1). */}
      <div className="relative w-full aspect-square sm:aspect-[2.4/1] md:aspect-[2.65/1] lg:aspect-[2.85/1] sm:min-h-[260px] md:min-h-[320px] lg:min-h-[400px] xl:min-h-[460px] overflow-hidden">
        
        {/* Genuine Horizontal Sliding Track with cubic-bezier(0.22, 1, 0.36, 1) */}
        <div
          className="flex w-full h-full will-change-transform"
          style={{
            transform: `translate3d(-${trackIndex * 100}%, 0, 0)`,
            transitionProperty: isTransitioning ? 'transform' : 'none',
            transitionDuration: isTransitioning
              ? prefersReducedMotion
                ? '0ms'
                : `${TRANSITION_DURATION_MS}ms`
              : '0ms',
            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {EXTENDED_SLIDES.map((slide, idx) => {
            const isSlideActive = activeDotIndex === slide.realIndex;
            const isPriority = slide.realIndex === 0 && !slide.isClone;

            return (
              <div
                key={slide.extendedKey}
                role="group"
                aria-roledescription="slide"
                aria-label={`${slide.realIndex + 1} of ${BANNER_SLIDES.length}: ${slide.title}`}
                aria-hidden={!isSlideActive}
                className="w-full h-full flex-shrink-0 relative overflow-hidden"
              >
                <Link
                  to={slide.targetLink}
                  className="block w-full h-full relative cursor-pointer overflow-hidden focus:outline-none"
                  tabIndex={isSlideActive ? 0 : -1}
                  title={slide.title}
                >
                  {/* Responsive Picture: 1:1 Square on Mobile (<640px), Wide Banner on Desktop (>=640px) */}
                  <picture className="w-full h-full block">
                    {/* Desktop & Tablet: >= 640px Wide Banner (WebP + PNG fallback) */}
                    <source
                      media="(min-width: 640px)"
                      type="image/webp"
                      srcSet={slide.desktopWebp}
                    />
                    <source
                      media="(min-width: 640px)"
                      type="image/png"
                      srcSet={slide.desktopPng}
                    />

                    {/* Mobile: < 640px 1:1 Square Poster (WebP + PNG fallback) */}
                    <source
                      type="image/webp"
                      srcSet={slide.mobileWebp}
                    />
                    <img
                      src={slide.mobilePng}
                      alt={slide.alt}
                      loading={isPriority ? 'eager' : 'lazy'}
                      fetchPriority={isPriority ? 'high' : 'auto'}
                      decoding="async"
                      className="w-full h-full object-cover object-center"
                    />
                  </picture>

                  {/* Subtle Gradient Vignette for UI contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/35 via-transparent to-stone-950/10 pointer-events-none" />

                  {/* Desktop Floating Action Pill in Bottom-Left Corner */}
                  <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-6 z-20 hidden xs:flex items-center gap-2 pointer-events-none">
                    <div className="px-3 py-1.5 rounded-full bg-stone-900/65 backdrop-blur-md border border-white/20 text-white text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shadow-md group-hover:bg-[#1B3B22] transition-colors pointer-events-auto">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>{slide.ctaText}</span>
                      <ArrowRight className="w-3 h-3 text-white group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Previous Slide Arrow Button (Smooth Left-to-Right Slide) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goToPrev();
          }}
          disabled={isTransitioning}
          aria-label="Previous banner"
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-stone-900/40 hover:bg-[#1B3B22] text-white backdrop-blur-md border border-white/20 shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center min-w-[38px] min-h-[38px] sm:min-w-[44px] sm:min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2.5]" />
        </button>

        {/* Next Slide Arrow Button (Smooth Right-to-Left Slide) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          disabled={isTransitioning}
          aria-label="Next banner"
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-stone-900/40 hover:bg-[#1B3B22] text-white backdrop-blur-md border border-white/20 shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center min-w-[38px] min-h-[38px] sm:min-w-[44px] sm:min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-50"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2.5]" />
        </button>

        {/* Bottom Center Glassmorphism Controls: Pagination Dots & Play/Pause */}
        <div className="absolute bottom-2.5 sm:bottom-4 right-3 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-30 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-stone-900/55 backdrop-blur-md border border-white/20 shadow-lg">
          {BANNER_SLIDES.map((slide, index) => {
            const isActive = index === activeDotIndex;

            return (
              <button
                key={slide.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(index);
                }}
                disabled={isTransitioning}
                aria-label={`Go to slide ${index + 1}: ${slide.title}`}
                aria-current={isActive ? 'true' : undefined}
                className={`relative transition-all duration-300 rounded-full focus:outline-none touch-manipulation flex items-center ${
                  isActive ? 'w-7 sm:w-9 h-2 bg-white/20 overflow-hidden' : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
              >
                {isActive && (
                  <span
                    key={`progress-${activeDotIndex}-${progressKey}`}
                    className={`absolute inset-y-0 left-0 bg-amber-400 rounded-full animate-carousel-progress ${
                      isHovered || !isPlaying ? 'animate-carousel-progress-paused' : ''
                    }`}
                  />
                )}
              </button>
            );
          })}

          {/* Pause / Play Toggle Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsPlaying((p) => !p);
            }}
            aria-label={isPlaying ? 'Pause banner slideshow' : 'Play banner slideshow'}
            title={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
            className="ml-1 text-white/70 hover:text-white transition-colors focus:outline-none p-0.5 rounded"
          >
            {isPlaying ? (
              <Pause className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            ) : (
              <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
