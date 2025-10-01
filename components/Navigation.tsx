'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, DollarSign, CreditCard } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  
  const links = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/expenses', icon: PlusCircle, label: 'Expenses' },
    { href: '/income', icon: DollarSign, label: 'Income' },
    { href: '/debts', icon: CreditCard, label: 'Debts' },
  ];
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur border-t border-slate-800/70 shadow-2xl z-50">
      <div className="max-w-lg mx-auto flex justify-around items-center h-16 px-2">
        {links.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
                isActive 
                  ? 'text-amber-300' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-xs mt-1 ${isActive ? 'font-semibold text-amber-200' : 'font-medium'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
