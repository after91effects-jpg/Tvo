import React from 'react';
import Link from 'next/link';
import { Cake, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF2B6D] to-[#FF6B9D] flex items-center justify-center text-white shadow-xl mb-6">
        <Cake className="w-8 h-8" />
      </div>

      <span className="px-3 py-1 rounded-full bg-[#FF2B6D]/10 text-[#FF2B6D] text-xs font-black uppercase tracking-wider mb-3">
        404 Page Not Found
      </span>

      <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
        Oops! Cake Slice Not Found
      </h1>

      <p className="text-sm text-[var(--text-muted)] max-w-md mb-8 leading-relaxed">
        The delicious recipe or sweet page you are looking for might have been moved, renamed, or already enjoyed!
      </p>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#FF2B6D] to-[#FF457D] text-white text-xs font-bold shadow-md hover:shadow-lg hover:brightness-105 transition-all flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Return to Bakery Home</span>
        </Link>
      </div>
    </div>
  );
}
