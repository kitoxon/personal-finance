'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Home, PlusCircle, DollarSign, CreditCard } from 'lucide-react';

export const NAV_LINKS = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/expenses', icon: PlusCircle, label: 'Expenses' },
  { href: '/income', icon: DollarSign, label: 'Income' },
  { href: '/debts', icon: CreditCard, label: 'Debts' },
] as const;

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
    <nav aria-label="Primary" className="hidden items-center gap-1 rounded-2xl border border-slate-800/80 bg-slate-950/60 px-1 py-1 backdrop-blur lg:flex">
      {NAV_LINKS.map(({ href, icon, label }) => (
        <NavLink
          key={href}
          href={href}
          icon={icon}
          label={label}
          isActive={pathname === href}
          orientation="horizontal"
        />
      ))}
    </nav>
  );
}

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur border-t border-slate-800/70 shadow-2xl lg:hidden"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {NAV_LINKS.map(({ href, icon, label }) => (
          <NavLink
            key={href}
            href={href}
            icon={icon}
            label={label}
            isActive={pathname === href}
            orientation="vertical"
          />
        ))}
      </div>
    </nav>
  );
}
