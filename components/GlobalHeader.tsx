'use client';

import Link from 'next/link';
import { Wallet2 } from 'lucide-react';
import { DesktopNavigation } from '@/components/Navigation';

export default function GlobalHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-900/70 bg-slate-950/75 backdrop-blur">
      <div className="mx-auto hidden md:flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2 text-slate-100 transition hover:text-white">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/90 text-slate-50 shadow-md shadow-indigo-900/40">
            <Wallet2 size={20} strokeWidth={2.5} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-200/90">
              Finance
            </span>
            <span className="text-lg font-bold">Personal Tracker</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <DesktopNavigation />
        </div>
      </div>
    </header>
  );
}
