'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Home, PlusCircle, DollarSign, CreditCard, Zap } from 'lucide-react';

export const NAV_LINKS = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/expenses', icon: PlusCircle, label: 'Expenses' },
  { href: '/income', icon: DollarSign, label: 'Income' },
  { href: '/debts', icon: CreditCard, label: 'Debts' },
  { href: '/overflow', icon: Zap, label: 'Overflow' }
] as const;

const QUICK_ACTIONS = [
  {
    href: '/expenses',
    label: 'Expense',
    helper: 'Log spending',
    icon: PlusCircle,
    accent: 'from-amber-500 via-amber-400 to-rose-500',
  },
  {
    href: '/income',
    label: 'Income',
    helper: 'Record earnings',
    icon: DollarSign,
    accent: 'from-emerald-500 via-teal-500 to-cyan-500',
  },
  {
    href: '/debts',
    label: 'Debt',
    helper: 'Update dues',
    icon: CreditCard,
    accent: 'from-rose-500 via-pink-500 to-purple-500',
  },
] as const;

const isPathActive = (pathname: string, href: string) => {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};

type NavLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  orientation: 'horizontal' | 'vertical';
};

function NavLink({ href, label, icon: Icon, isActive, orientation }: NavLinkProps) {
  const activeClasses = isActive
    ? 'text-amber-200'
    : 'text-slate-400 hover:text-slate-100';

  const baseIconSize = orientation === 'vertical' ? 26 : 22;

  return (
    <Link
      key={href}
      href={href}
      className={`flex items-center justify-center rounded-2xl transition-all ${orientation === 'vertical' ? 'flex-1 flex-col gap-1 h-full' : 'px-3 py-2 gap-2 text-sm font-medium'}
        ${activeClasses}`}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon size={isActive ? baseIconSize + 2 : baseIconSize} strokeWidth={isActive ? 2.5 : 2} />
      <span className={orientation === 'vertical' ? 'text-[11px] uppercase tracking-wide' : ''}>
        {label}
      </span>
    </Link>
  );
}

export function DesktopNavigation() {
  const pathname = usePathname();

  return (
    <div className="hidden items-center gap-3 lg:flex">
      <nav
        aria-label="Primary"
        className="flex items-center gap-1 rounded-2xl border border-slate-800/80 bg-slate-950/60 px-1 py-1 backdrop-blur"
      >
        {NAV_LINKS.map(({ href, icon, label }) => (
          <NavLink
            key={href}
            href={href}
            icon={icon}
            label={label}
            isActive={isPathActive(pathname, href)}
            orientation="horizontal"
          />
        ))}
      </nav>
      <QuickAddButton variant="desktop" />
    </div>
  );
}

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800/70 bg-slate-950/90 backdrop-blur shadow-2xl lg:hidden"
    >
      <div className="relative mx-auto flex h-16 max-w-lg items-center justify-around px-4">
        {NAV_LINKS.map(({ href, icon, label }) => (
          <NavLink
            key={href}
            href={href}
            icon={icon}
            label={label}
            isActive={isPathActive(pathname, href)}
            orientation="vertical"
          />
        ))}
        <QuickAddButton variant="mobile" />
      </div>
    </nav>
  );
}

type QuickAddVariant = 'desktop' | 'mobile';

function QuickAddButton({ variant }: { variant: QuickAddVariant }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, [isOpen]);

  const triggerContent = (
    <>
      <span className="sr-only">Open quick add menu</span>
      <PlusCircle size={variant === 'mobile' ? 28 : 20} />
    </>
  );

  if (variant === 'desktop') {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(open => !open)}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label="Open quick add menu"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          {triggerContent}
          <span>Quick add</span>
        </button>
        {isOpen && (
          <div className="absolute right-0 top-full z-50 mt-3 w-72 rounded-2xl border border-slate-800/80 bg-slate-950/95 p-4 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Log something</p>
            <div className="mt-3 space-y-2">
              {QUICK_ACTIONS.map(({ href, label, helper, icon: Icon, accent }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-slate-800/70 bg-slate-950/60 px-3 py-2 transition hover:border-amber-500/40 hover:bg-slate-900/80"
                >
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-slate-950`}>
                    <Icon size={20} strokeWidth={2.3} />
                  </span>
                  <span className="flex flex-col text-left">
                    <span className="text-sm font-semibold text-slate-100">{label}</span>
                    <span className="text-xs text-slate-400">{helper}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <button
          type="button"
          onClick={() => setIsOpen(open => !open)}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label="Open quick add menu"
          className="pointer-events-auto z-50 inline-flex h-16 w-16 -translate-y-8 items-center justify-center rounded-full border-2 border-amber-400 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-slate-950 shadow-[0_10px_25px_rgba(15,23,42,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
        >
          {triggerContent}
        </button>
      </div>
      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close quick add menu"
            className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed bottom-28 left-1/2 z-50 w-[min(90vw,18rem)] -translate-x-1/2 rounded-3xl border border-slate-800/70 bg-slate-950/95 p-4 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quick add</p>
            <div className="mt-3 space-y-2">
              {QUICK_ACTIONS.map(({ href, label, helper, icon: Icon, accent }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/70 px-3 py-2 transition hover:border-amber-500/40 hover:bg-slate-900"
                >
                  <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-slate-950`}>
                    <Icon size={20} strokeWidth={2.2} />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-100">{label}</span>
                    <span className="text-xs text-slate-400">{helper}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
