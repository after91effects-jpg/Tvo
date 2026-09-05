'use client';

import React from 'react';
import { Award, Heart, Shield, Sparkles, Clock, Leaf, Users } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-10 sm:py-16 space-y-12 animate-in fade-in duration-200">
      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>The TVO Flavours Philosophy</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold font-display text-[var(--text-main)]">
          Where European Pâtisserie Meets Joyful Celebrations
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
          Founded in 2022 by classical French and Belgian trained pastry chefs, TVO Flavours was created with a singular mission: never let an important celebration settle for commercial premix cakes.
        </p>
      </div>

      {/* 3 Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold font-display text-[var(--text-main)]">
            54% Callebaut & Real Dairy
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            We exclusively source sustainable cocoa from Belgium and pure French butter. Zero artificial shortening, zero palm oil, and zero synthetic emulsifiers.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Leaf className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold font-display text-[var(--text-main)]">
            Certified 100% Eggless
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Our pure vegetarian line is baked in isolated, sterilised stations using natural curd cultured sponges, silken tofu emulsions, and real fruit purées.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold font-display text-[var(--text-main)]">
            Cold-Chain 2-Hour Delivery
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Cakes are baked to order 2 hours before scheduled dispatch and transported inside custom insulated sub-zero refrigerated pods.
          </p>
        </div>
      </div>

      {/* Story Banner */}
      <div className="p-8 sm:p-12 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-[var(--text-main)]">
            Baking with Reverence for Every Milestone
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
            Whether it is an intimate 1st anniversary or a grand 100-guest birthday gathering, our chefs handcraft each sponge, pipe every delicate rosette, and hand-temper rich chocolate ganache with meticulous culinary precision.
          </p>
          <div className="flex items-center gap-4 text-xs font-semibold text-[var(--primary)]">
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> 100% Fresh Guarantee
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Heart className="w-4 h-4" /> Over 100,000+ Celebrations
            </span>
          </div>
        </div>

        <div className="lg:col-span-6 aspect-4/3 rounded-2xl overflow-hidden border border-[var(--border)]">
          <img
            src="https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80"
            alt="TVO Flavours Kitchen"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};
