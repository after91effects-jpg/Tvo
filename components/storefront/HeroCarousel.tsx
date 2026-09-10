'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

export interface HeroSlide {
  id: string;
  title: React.ReactNode;
  subtitle: string;
  tag: string;
  ctaText: string;
  ctaAction: string;
  param?: string;
  secondaryCtaText?: string;
  secondaryCtaAction?: string;
  secondaryParam?: string;
  bgGradient: string;
  imageUrl: string;
  badgeEmoji: string;
  badgeTitle: string;
  badgeSubtitle: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'slide-1',
    title: (
      <>
        Artisanal Cakes <br className="hidden sm:inline" />
        Crafted for{' '}
        <span className="italic font-serif text-[var(--primary)] font-normal drop-shadow-xs">
          Pure Celebration
        </span>
      </>
    ),
    subtitle: 'Slow-baked with 70% Belgian Callebaut chocolate, pure dairy butter, and farm-fresh ingredients. Fresh artisanal delivery to your doorstep.',
    tag: "CHEF'S SIGNATURE CREATION",
    ctaText: 'Order Birthday Cakes',
    ctaAction: 'category',
    param: 'birthday',
    secondaryCtaText: 'Explore Bento Minis',
    secondaryCtaAction: 'category',
    secondaryParam: 'chocolate',
    bgGradient: 'from-[#2D1625]/95 via-[#23121D]/90 to-[#1A0C16]/95',
    imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80',
    badgeEmoji: '🎂',
    badgeTitle: 'Freshly Baked Today',
    badgeSubtitle: '100% Preservative-Free',
  },
  {
    id: 'slide-2',
    title: (
      <>
        Celebrate Romance with{' '}
        <span className="italic font-serif text-[var(--primary)] font-normal">
          Crimson Velvet
        </span>
      </>
    ),
    subtitle: 'Silky Philadelphia cream cheese frosting piped over moist velvet sponge with raspberry swirl.',
    tag: 'ANNIVERSARY SPECIAL',
    ctaText: 'Explore Romantic Cakes',
    ctaAction: 'category',
    param: 'anniversary',
    secondaryCtaText: 'View All Flavours',
    secondaryCtaAction: 'category',
    secondaryParam: 'all',
    bgGradient: 'from-[#331422]/95 via-[#25101B]/90 to-[#190B13]/95',
    imageUrl: 'https://images.unsplash.com/photo-1586788680434-30d324b2d46f?auto=format&fit=crop&w=1200&q=80',
    badgeEmoji: '💖',
    badgeTitle: 'Handcrafted Romance',
    badgeSubtitle: 'Silky Cream Cheese Frosting',
  },
  {
    id: 'slide-3',
    title: (
      <>
        Pure Delicacies in{' '}
        <span className="italic font-serif text-emerald-400 font-normal">
          100% Eggless
        </span>
      </>
    ),
    subtitle: 'Zero compromise on fluffiness. Handcrafted vegetarian sponges for mindful celebrations.',
    tag: 'DIETARY MASTERPIECE',
    ctaText: 'Browse 100% Eggless',
    ctaAction: 'category',
    param: 'eggless',
    secondaryCtaText: 'Chef Story',
    secondaryCtaAction: 'about',
    bgGradient: 'from-[#19241C]/95 via-[#131B15]/90 to-[#0F1411]/95',
    imageUrl: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=1200&q=80',
    badgeEmoji: '🌿',
    badgeTitle: '100% Eggless Kitchen',
    badgeSubtitle: 'Handcrafted Vegetarian Sponges',
  },
  {
    id: 'slide-4',
    title: (
      <>
        Grand Luxe Festive{' '}
        <span className="italic font-serif text-amber-300 font-normal">
          Celebration Hampers
        </span>
      </>
    ),
    subtitle: 'Artisan macarons, chocolate rochers, fragrant candles, and celebration cakes in keepsake boxes.',
    tag: 'LIMITED LUXURY GIFT',
    ctaText: 'Explore Gift Hampers',
    ctaAction: 'category',
    param: 'hampers',
    secondaryCtaText: 'Track Order',
    secondaryCtaAction: 'track',
    bgGradient: 'from-[#2B1F14]/95 via-[#1E160E]/90 to-[#140E0A]/95',
    imageUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1200&q=80',
    badgeEmoji: '🎁',
    badgeTitle: 'Luxe Keepsake Boxes',
    badgeSubtitle: 'Same-Day Express Dispatch',
  },
];

export const HeroCarousel: React.FC<{ onNavigate: (view: string, param?: string) => void; occasionSlide?: HeroSlide }> = ({
  onNavigate,
  occasionSlide,
}) => {
  const allSlides = useMemo(() => (occasionSlide ? [occasionSlide, ...HERO_SLIDES] : HERO_SLIDES), [occasionSlide]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const isHoveredRef = useRef(false);
  const isVisibleRef = useRef(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    if (isHoveredRef.current || !isVisibleRef.current) return;
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % allSlides.length);
    }, 5500);
  }, [clearTimer, allSlides.length]);

  // Clean interval lifecycle
  useEffect(() => {
    startTimer();
    return () => clearTimer();
  }, [startTimer, clearTimer]);

  // Tab visibility listener (pause autoplay when tab is hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState !== 'hidden';
      setIsVisible(visible);
      isVisibleRef.current = visible;
      if (visible) {
        startTimer();
      } else {
        clearTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startTimer, clearTimer]);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % allSlides.length);
    startTimer();
  }, [startTimer, allSlides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + allSlides.length) % allSlides.length);
    startTimer();
  }, [startTimer, allSlides.length]);

  const goToSlide = useCallback(
    (index: number) => {
      setCurrentSlide(index);
      startTimer();
    },
    [startTimer]
  );

  const isTouchInteractionRef = useRef<boolean>(false);

  // Desktop hover pause: only pause if interaction is not touch
  const handleMouseEnter = () => {
    if (!isTouchInteractionRef.current) {
      setIsHovered(true);
      isHoveredRef.current = true;
      clearTimer();
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    isHoveredRef.current = false;
    startTimer();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextSlide();
    }
  };

  // Mobile horizontal swipe without locking vertical page scrolling
  const handleTouchStart = (e: React.TouchEvent) => {
    isTouchInteractionRef.current = true;
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsHovered(false);
    setTimeout(() => {
      isTouchInteractionRef.current = false;
    }, 500);

    if (e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
      const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

      // Only trigger slide transition if horizontal motion exceeds 40px
      // and is significantly larger than vertical motion (preserving native page scrolling)
      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
        if (deltaX < 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      }
    }
  };

  return (
    <div
      id="hero-carousel-container"
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Artisanal Bakery Highlights"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'touch') handleMouseEnter();
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'touch') handleMouseLeave();
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      className="relative w-full min-h-[440px] sm:min-h-[500px] lg:h-[520px] rounded-3xl overflow-hidden shadow-2xl border border-[#3E2135] group flex flex-col justify-center bg-[#1E111B] select-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
    >
      {/* Sliding Track containing all slides side-by-side */}
      <div
        id="hero-carousel-track"
        className="flex h-full min-h-[440px] sm:min-h-[500px] lg:h-[520px] transition-transform duration-700 ease-out will-change-transform motion-reduce:transition-none"
        style={{
          width: `${allSlides.length * 100}%`,
          transform: `translateX(-${(currentSlide * 100) / allSlides.length}%)`,
        }}
        aria-live="polite"
      >
        {allSlides.map((slide, idx) => (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${idx + 1} of ${allSlides.length}`}
            aria-hidden={currentSlide !== idx}
            style={{ width: `${100 / allSlides.length}%` }}
            className="relative shrink-0 h-full min-h-[440px] sm:min-h-[500px] lg:h-[520px] flex flex-col justify-center overflow-hidden"
          >
            {/* Background Image & Gradient overlay */}
            <div className="absolute inset-0 bg-[#140C13] pointer-events-none">
              <img
                src={slide.imageUrl}
                alt="Artisanal Bakery Creation"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.fallback) {
                    target.dataset.fallback = 'true';
                    target.src = '/images/products/uploads/Banner_3270x320.webp';
                  }
                }}
                className={`w-full h-full object-cover opacity-35 transition-transform duration-1000 ease-out ${
                  currentSlide === idx ? 'scale-105' : 'scale-100'
                }`}
              />
              <div className={`absolute inset-0 bg-gradient-to-r ${slide.bgGradient}`} />
            </div>

            {/* Content Container */}
            <div className="relative z-10 h-full w-full px-6 sm:px-12 lg:px-16 py-10 sm:py-12 flex items-center justify-between">
              <div className="max-w-2xl text-white space-y-4">
                {/* Chef Creation Pill */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#3A1E32] backdrop-blur-md border border-[#522A47] text-[11px] font-bold tracking-wider uppercase text-[#FF85A7] shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF85A7]" />
                  <span>{slide.tag}</span>
                </div>

                {/* Display Headline */}
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold font-display leading-[1.12] text-white tracking-tight">
                  {slide.title}
                </h1>

                {/* Subtitle */}
                <p className="text-xs sm:text-sm lg:text-base text-[#D4C3CF] max-w-xl leading-relaxed">
                  {slide.subtitle}
                </p>

                {/* Action Button Row */}
                <div className="pt-3 flex flex-wrap items-center gap-3.5">
                  <button
                    id={idx === currentSlide ? 'hero-explore-category-btn' : undefined}
                    onClick={() => onNavigate(slide.ctaAction, slide.param)}
                    tabIndex={currentSlide === idx ? 0 : -1}
                    className="px-7 py-3.5 rounded-full bg-gradient-to-r from-[#FF2B6D] via-[#FF3B77] to-[#E61D52] hover:brightness-110 text-white font-bold text-xs sm:text-sm shadow-[0_6px_25px_rgba(255,43,109,0.45)] hover:shadow-[0_8px_30px_rgba(255,43,109,0.6)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <span>{slide.ctaText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {slide.secondaryCtaText && (
                    <button
                      id={idx === currentSlide ? 'hero-secondary-cta-btn' : undefined}
                      onClick={() => onNavigate(slide.secondaryCtaAction || 'category', slide.secondaryParam)}
                      tabIndex={currentSlide === idx ? 0 : -1}
                      className="px-6 py-3.5 rounded-full bg-[#291725]/90 hover:bg-[#381F33] text-white font-semibold text-xs sm:text-sm border border-[#482840] hover:border-[#FF2B6D]/40 transition-all flex items-center justify-center gap-2 cursor-pointer backdrop-blur-md active:scale-95"
                    >
                      <span>{slide.secondaryCtaText}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right Floating Badge */}
              <div className="hidden lg:flex flex-col gap-4 shrink-0">
                <div className="flex items-center gap-3.5 px-5 py-4 rounded-2xl bg-[#1C1019]/90 backdrop-blur-md border border-[#3E2135] text-white shadow-2xl">
                  <div className="text-2xl p-2 rounded-xl bg-[#2C1726] border border-[#4D2843]">
                    {slide.badgeEmoji}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white tracking-wide">
                      {slide.badgeTitle}
                    </div>
                    <div className="text-[11px] text-[#CBB3C2] font-medium">
                      {slide.badgeSubtitle}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>


      {/* Slide Indicators */}
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        {allSlides.map((_, i) => (
          <button
            key={i}
            id={`hero-dot-${i}`}
            onClick={() => goToSlide(i)}
            className={`h-2 rounded-full transition-all duration-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
              currentSlide === i
                ? 'w-7 sm:w-8 bg-[var(--primary)] shadow-[0_0_8px_rgba(255,45,96,0.6)]'
                : 'w-2 bg-[#4D2F44] hover:bg-[#6D4260]'
            }`}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={currentSlide === i ? 'true' : undefined}
          />
        ))}
      </div>
    </div>
  );
};
