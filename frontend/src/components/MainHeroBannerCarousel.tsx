import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Pause, ArrowRight, Droplet, Sparkles } from 'lucide-react';

export interface BannerSlide {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  alt: string;
  imageWebp: string;
  imagePng: string;
  targetLink: string;
  ctaText: string;
}

// Banners from the project's actual Banners folder
export const BANNER_SLIDES: BannerSlide[] = [
  {
    id: 'organic-oils-heritage',
    title: 'Traditional Wood-Pressed Organic Oils',
    subtitle: 'Ancestral Vaagai Marachekku extracted strictly below 40°C. 100% pure, unrefined & chemical-free.',
    badge: 'Flagship Vaagai Marachekku',
    alt: 'Sri Adithya Organics Traditional Wood-Pressed Oils Banner',
    imageWebp: '/banners/banner-organic-oils.webp',
    imagePng: '/banners/banner-organic-oils.png',
    targetLink: '/products?category=cold-pressed-oils',
    ctaText: 'Shop Wood-Pressed Oils',
  },
  {
    id: 'natural-edible-oils',
    title: '100% Pure & Natural Cold-Pressed Oils',
    subtitle: 'Farm-fresh groundnut, white sesame, yellow mustard, and coconut oils bottled at source.',
    badge: '100% Cold-Pressed',
    alt: 'Sri Adithya Organics 100% Natural Cold-Pressed Edible Oils Banner',
    imageWebp: '/banners/banner-natural-oils.webp',
    imagePng: '/banners/banner-natural-oils.png',
    targetLink: '/products?category=cold-pressed-oils',
    ctaText: 'Explore Pure Oils',
  },
  {
    id: 'natures-goodness-farm',
    title: "Nature’s Goodness Direct from Our Telangana Mill",
    subtitle: 'Pure A2 bilona cow ghee, heirloom millets, stone-ground flours, and natural daily groceries.',
    badge: 'Farm Direct Purity',
    alt: "Sri Adithya Organics — Nature's Goodness Direct from Farm Banner",
    imageWebp: '/banners/banner-natures-goodness.webp',
    imagePng: '/banners/banner-natures-goodness.png',
    targetLink: '/products',
    ctaText: 'Shop All Organics',
  },
];

const ROTATION_INTERVAL_MS = 5000;

export const MainHeroBannerCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(true);

  // Key tracking to force CSS progress bar restart on slide change
  const [progressKey, setProgressKey] = useState(0);

  // Touch swipe refs
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const touchEndYRef = useRef<number | null>(null);

  // Preload secondary banner images for smooth instant transitions
  useEffect(() => {
    BANNER_SLIDES.slice(1).forEach((slide) => {
      const img = new Image();
      img.src = slide.imageWebp;
    });
  }, []);

  // Handle browser tab visibility changes
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Slide navigation callbacks
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % BANNER_SLIDES.length);
    setProgressKey((k) => k + 1);
  }, []);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + BANNER_SLIDES.length) % BANNER_SLIDES.length);
    setProgressKey((k) => k + 1);
  }, []);

  const goToSlide = useCallback((index: number) => {
    if (index === currentIndex) return;
    setCurrentIndex(index);
    setProgressKey((k) => k + 1);
  }, [currentIndex]);

  // Automatic slide rotation interval (approx 5 seconds)
  useEffect(() => {
    if (!isPlaying || !isTabVisible || isHovered) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BANNER_SLIDES.length);
      setProgressKey((k) => k + 1);
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isPlaying, isTabVisible, isHovered, currentIndex]);

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

  const activeSlide = BANNER_SLIDES[currentIndex];

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
      {/* Aspect Ratio Container (Desktop 2.85:1, Tablet 2.5:1, Mobile 2.05:1) */}
      <div className="relative w-full aspect-[2.05/1] sm:aspect-[2.4/1] md:aspect-[2.65/1] lg:aspect-[2.85/1] min-h-[195px] sm:min-h-[260px] md:min-h-[320px] lg:min-h-[400px] xl:min-h-[460px]">
        {BANNER_SLIDES.map((slide, index) => {
          const isActive = index === currentIndex;
          const isFirst = index === 0;

          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${BANNER_SLIDES.length}: ${slide.title}`}
              aria-hidden={!isActive}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <Link
                to={slide.targetLink}
                className="block w-full h-full relative cursor-pointer overflow-hidden focus:outline-none"
                tabIndex={isActive ? 0 : -1}
                title={slide.title}
              >
                {/* Banner Image with Picture WebP & PNG Fallback */}
                <picture>
                  <source srcSet={slide.imageWebp} type="image/webp" />
                  <img
                    src={slide.imagePng}
                    alt={slide.alt}
                    loading={isFirst ? 'eager' : 'lazy'}
                    fetchPriority={isFirst ? 'high' : 'auto'}
                    decoding="async"
                    className={`w-full h-full object-cover object-center ${
                      isActive ? 'animate-ken-burns' : 'scale-100'
                    }`}
                  />
                </picture>

                {/* Subtle Luxury Gradient Vignette (non-intrusive, enhances contrast for buttons and controls) */}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 via-transparent to-stone-950/10 pointer-events-none" />

                {/* Desktop Floating Action Pill in Bottom-Left Corner */}
                <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-6 z-20 hidden xs:flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-full bg-stone-900/65 backdrop-blur-md border border-white/20 text-white text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-[#1B3B22] transition-colors">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>{slide.ctaText}</span>
                    <ArrowRight className="w-3 h-3 text-white group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            </div>
          );
        })}

        {/* Previous Slide Arrow Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goToPrev();
          }}
          aria-label="Previous banner"
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-stone-900/40 hover:bg-[#1B3B22] text-white backdrop-blur-md border border-white/20 shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center min-w-[38px] min-h-[38px] sm:min-w-[44px] sm:min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2.5]" />
        </button>

        {/* Next Slide Arrow Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          aria-label="Next banner"
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-stone-900/40 hover:bg-[#1B3B22] text-white backdrop-blur-md border border-white/20 shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center min-w-[38px] min-h-[38px] sm:min-w-[44px] sm:min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2.5]" />
        </button>

        {/* Bottom Center Glassmorphism Controls: Pagination Dots & Play/Pause */}
        <div className="absolute bottom-2.5 sm:bottom-4 right-3 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-30 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-stone-900/55 backdrop-blur-md border border-white/20 shadow-lg">
          {BANNER_SLIDES.map((slide, index) => {
            const isActive = index === currentIndex;

            return (
              <button
                key={slide.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(index);
                }}
                aria-label={`Go to slide ${index + 1}: ${slide.title}`}
                aria-current={isActive ? 'true' : undefined}
                className={`relative transition-all duration-300 rounded-full focus:outline-none touch-manipulation flex items-center ${
                  isActive ? 'w-7 sm:w-9 h-2 bg-white/20 overflow-hidden' : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
              >
                {isActive && (
                  <span
                    key={`progress-${currentIndex}-${progressKey}`}
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
