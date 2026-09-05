'use client';

import React from 'react';
import { Leaf, Clock, Sparkles, ShieldCheck, HeartHandshake } from 'lucide-react';

export const TrustStrip: React.FC = () => {
  const trustItems = [
    {
      icon: <Leaf className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
      title: '100% Eggless Options',
      description: 'Dedicated pure vegetarian baking line with zero cross-contamination.',
    },
    {
      icon: <Clock className="w-6 h-6 text-[var(--primary)]" />,
      title: '2-Hour Express Delivery',
      description: 'Chilled cold-chain delivery vans to guarantee pristine cake arrival.',
    },
    {
      icon: <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
      title: 'Belgian Cocoa & Vanilla',
      description: 'Zero artificial premixes. Single-origin chocolate and real dairy cream.',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
      title: 'Live Kitchen Connection',
      description: 'Real-time baking status tracking from mixing to dispatch.',
    },
  ];

  return (
    <div className="py-10 border-y border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {trustItems.map((item, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-[var(--bg-subtle)]/50 border border-[var(--border)]/40 hover:border-[var(--primary)]/30 transition-colors">
              <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs shrink-0">
                {item.icon}
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[var(--text-main)] font-display">
                  {item.title}
                </h4>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
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
