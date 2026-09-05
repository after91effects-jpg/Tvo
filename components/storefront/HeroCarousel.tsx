'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Clock, Gift, Award, ArrowRight, Truck, Search } from 'lucide-react';

interface HeroSlide {
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
    subtitle: 'Slow-baked with 70% Belgian Callebaut chocolate, pure dairy butter, and farm-fresh ingredients. Delivered to your doorstep in 2 hours.',
    tag: "CHEF'S SIGNATURE CREATION",
    ctaText: 'Order Birthday Cakes',
    ctaAction: 'category',
    param: 'birthday',
    secondaryCtaText: 'Explore Bento Minis',
    secondaryCtaAction: 'category',
    secondaryParam: 'chocolate',
    bgGradient: 'from-[#2D1625]/95 via-[#23121D]/90 to-[#1A0C16]/95',
    imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80',
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
  },
];

export const HeroCarousel: React.FC<{ onNavigate: (view: string, param?: string) => void }> = ({
  onNavigate,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  }, []);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  const slide = HERO_SLIDES[currentSlide];

  return (
    <div
      id="hero-carousel-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full min-h-[440px] sm:min-h-[500px] lg:h-[520px] rounded-3xl overflow-hidden shadow-2xl border border-[#3E2135] group flex flex-col justify-center bg-[#1E111B]"
    >
      {/* Background Image & Gradient overlay */}
      <div className="absolute inset-0 bg-[#140C13]">
        <img
          src={slide.imageUrl}
          alt="Artisanal Bakery Creation"
          className="w-full h-full object-cover opacity-35 scale-105 transition-all duration-1000 ease-out"
        />
        <div className={`absolute inset-0 bg-gradient-to-r ${slide.bgGradient} transition-opacity duration-700`} />
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
              id="hero-explore-category-btn"
              onClick={() => onNavigate(slide.ctaAction, slide.param)}
              className="px-7 py-3.5 rounded-full bg-gradient-to-r from-[#FF2B6D] via-[#FF3B77] to-[#E61D52] hover:brightness-110 text-white font-bold text-xs sm:text-sm shadow-[0_6px_25px_rgba(255,43,109,0.45)] hover:shadow-[0_8px_30px_rgba(255,43,109,0.6)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>{slide.ctaText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {slide.secondaryCtaText && (
              <button
                id="hero-secondary-cta-btn"
                onClick={() => onNavigate(slide.secondaryCtaAction || 'category', slide.secondaryParam)}
                className="px-6 py-3.5 rounded-full bg-[#291725]/90 hover:bg-[#381F33] text-white font-semibold text-xs sm:text-sm border border-[#482840] hover:border-[#FF2B6D]/40 transition-all flex items-center justify-center gap-2 cursor-pointer backdrop-blur-md active:scale-95"
              >
                <span>{slide.secondaryCtaText}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Floating Badge (as seen in screenshot) */}
        <div className="hidden lg:flex flex-col gap-4 shrink-0">
          <div className="flex items-center gap-3.5 px-5 py-4 rounded-2xl bg-[#1C1019]/90 backdrop-blur-md border border-[#3E2135] text-white shadow-2xl">
            <div className="text-2xl p-2 rounded-xl bg-[#2C1726] border border-[#4D2843]">
              🎂
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-wide">
                Freshly Baked Today
              </div>
              <div className="text-[11px] text-[#CBB3C2] font-medium">
                100% Preservative-Free
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Arrow navigation */}
      <button
        onClick={prevSlide}
        className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#20121C]/80 hover:bg-[#341C2E] text-white backdrop-blur-md border border-[#422339] flex items-center justify-center transition-all opacity-80 hover:opacity-100 cursor-pointer shadow-lg"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#20121C]/80 hover:bg-[#341C2E] text-white backdrop-blur-md border border-[#422339] flex items-center justify-center transition-all opacity-80 hover:opacity-100 cursor-pointer shadow-lg"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentSlide(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              currentSlide === i
                ? 'w-7 bg-[var(--primary)] shadow-[0_0_8px_rgba(255,45,96,0.6)]'
                : 'w-2 bg-[#4D2F44] hover:bg-[#6D4260]'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
