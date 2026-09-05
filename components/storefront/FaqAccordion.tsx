'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Search } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
  category: 'delivery' | 'eggless' | 'custom' | 'storage';
}

const FAQS: FaqItem[] = [
  {
    category: 'delivery',
    question: 'How fast can I get my celebration cake delivered?',
    answer: 'We provide 2-Hour Express Delivery in major metro cities for orders placed before 9:00 PM. You can also select designated morning, afternoon, evening, or surprise Midnight Delivery (11:00 PM - 12:00 AM) slots at checkout.',
  },
  {
    category: 'eggless',
    question: 'Are eggless cakes prepared in a separate bakery station?',
    answer: 'Yes! TVO Flavours maintains a dedicated, certified pure-vegetarian baking station with distinct planetary mixers, silicone spatulas, and ovens to prevent any contact with egg-based batters.',
  },
  {
    category: 'custom',
    question: 'Can I add a custom message and sparkler candles on the cake?',
    answer: 'Absolutely! On every product page, you can type your personalized message (up to 35 characters) to be piped in artisan chocolate script on an edible sugar plaque. You can also add sparklers, number candles, and greeting cards in 1-click.',
  },
  {
    category: 'delivery',
    question: 'How is the cake protected during hot weather transit?',
    answer: 'Every TVO Flavours cake is secured in a rigid insulated keepsake box with non-toxic sub-zero gel cooling packs and transported in our temperature-controlled dispatch fleet to prevent melting or movement during transit.',
  },
  {
    category: 'storage',
    question: 'What is the best way to store the cake after receiving it?',
    answer: 'Store chocolate truffle, fresh cream, and fruit cakes in the refrigerator at 4°C-6°C. We recommend bringing Belgian chocolate truffle cakes to room temperature 15 minutes before cutting for peak silkiness.',
  },
  {
    category: 'custom',
    question: 'Do you make custom multi-tier theme cakes for weddings and birthdays?',
    answer: 'Yes! Explore our "Handcrafted Theme Cakes" category or contact our Kitchen Concierge via the Contact page for bespoke 3D fondant sculpting, pastel color matching, and multi-tier wedding centerpieces.',
  },
];

export const FaqAccordion: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full py-12 px-4 sm:px-6 lg:px-8 xl:px-12">
      <div className="text-center max-w-xl mx-auto mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-semibold mb-2">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Frequently Asked Questions</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-[var(--text-main)]">
          Everything You Need to Know
        </h2>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
          Have questions about cake storage, custom pipings, or express midnight delivery?
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
        {[
          { key: 'all', label: 'All Questions' },
          { key: 'delivery', label: 'Express Delivery' },
          { key: 'eggless', label: '100% Eggless' },
          { key: 'custom', label: 'Custom Piped Messages' },
          { key: 'storage', label: 'Care & Storage' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedCategory(tab.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
              selectedCategory === tab.key
                ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs'
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-main)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Accordion list */}
      <div className="space-y-3">
        {filteredFaqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className="border border-[var(--border)] rounded-2xl bg-[var(--bg-surface)] overflow-hidden shadow-xs transition-all"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-semibold text-xs sm:text-sm text-[var(--text-main)] hover:text-[var(--primary)] transition-colors cursor-pointer"
                aria-expanded={isOpen}
              >
                <span>{faq.question}</span>
                <ChevronDown
                  className={`w-4 h-4 text-[var(--text-subtle)] shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-[var(--primary)]' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed border-t border-[var(--border)]/40 mt-1 animate-in fade-in duration-200">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
