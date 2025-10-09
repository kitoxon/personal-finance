'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, X, PlusCircle, ArrowUpRight, CreditCard } from 'lucide-react';

const ACTIONS = [
  {
    href: '/expenses',
    label: 'Add Expense',
    shortLabel: 'Expense',
    description: 'Track a new purchase',
    accent: 'bg-amber-500/90 text-slate-950',
    hover: 'hover:bg-amber-400/90',
    ring: 'focus-visible:ring-amber-400/40',
    icon: PlusCircle,
  },
  {
    href: '/income',
    label: 'Log Income',
    shortLabel: 'Income',
    description: 'Capture incoming funds',
    accent: 'bg-emerald-500/90 text-slate-950',
    hover: 'hover:bg-emerald-400/90',
    ring: 'focus-visible:ring-emerald-400/40',
    icon: ArrowUpRight,
  },
  {
    href: '/debts',
    label: 'Review Debts',
    shortLabel: 'Debts',
    description: 'Adjust payments or status',
    accent: 'bg-rose-500/90 text-slate-950',
    hover: 'hover:bg-rose-400/90',
    ring: 'focus-visible:ring-rose-400/40',
    icon: CreditCard,
  },
] as const;

export function QuickActionsInline() {
  return (
    <div className="hidden items-center gap-2 lg:flex">
      {ACTIONS.map(({ href, label, icon: Icon, accent, hover, ring }) => (
        <Link
          key={href}
          href={href}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${accent} ${hover} ${ring}`}
        >
          <Icon size={16} />
          {label}
        </Link>
      ))}
    </div>
  );
}

export function QuickActionsFab() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
        {isOpen && (
          <div className="flex flex-col items-stretch gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/90 p-3 shadow-xl backdrop-blur">
            {ACTIONS.map(({ href, label, shortLabel, description, icon: Icon, accent, ring }) => (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-3 rounded-xl border border-slate-800/70 bg-slate-900/70 px-3 py-2 text-left shadow-sm transition hover:border-slate-700 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 ${ring} focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950`}
                onClick={() => setIsOpen(false)}
              >
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold ${accent}`}>
                  <Icon size={16} />
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-100">{label}</span>
                  <span className="text-xs text-slate-400">{description}</span>
                </div>
                <span className="ml-auto text-[11px] uppercase tracking-wide text-slate-500 group-hover:text-slate-300">
                  {shortLabel}
                </span>
              </Link>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-slate-50 shadow-xl shadow-indigo-900/40 transition hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
        >
          {isOpen ? <X size={24} strokeWidth={2.5} /> : <Plus size={28} strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  );
}
