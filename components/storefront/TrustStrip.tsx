'use client';

import React from 'react';
import { Leaf, Clock, Sparkles, ShieldCheck, HeartHandshake } from 'lucide-react';

export const TrustStrip: React.FC = () => {
  const trustItems = [
    {
      icon: <Leaf className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />,
      title: '100% Eggless Options',
      description: 'Dedicated pure vegetarian baking line with zero cross-contamination.',
    },
    {
      icon: <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-[var(--primary)]" />,
      title: 'Same-Day Express Delivery',
      description: 'Chilled cold-chain delivery vans to guarantee pristine cake arrival.',
    },
    {
      icon: <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400" />,
      title: 'Belgian Cocoa & Vanilla',
      description: 'Zero artificial premixes. Single-origin chocolate and real dairy cream.',
    },
    {
      icon: <ShieldCheck className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />,
      title: 'Live Kitchen Connection',
      description: 'Real-time baking status tracking from mixing to dispatch.',
    },
  ];

  return (
    <div className="py-5 sm:py-8 lg:py-10 border-y border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="w-full px-3.5 sm:px-6 lg:px-8 xl:px-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6 lg:gap-8">
          {trustItems.map((item, i) => (
            <div
              key={i}
              className="flex items-center sm:items-start gap-2 sm:gap-4 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[var(--bg-subtle)]/50 border border-[var(--border)]/40 hover:border-[var(--primary)]/30 transition-colors h-full"
            >
              <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs shrink-0">
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[11px] sm:text-xs lg:text-sm font-bold text-[var(--text-main)] font-display leading-tight sm:leading-snug">
                  {item.title}
                </h4>
                <p className="hidden sm:block text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
