'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, DollarSign, CreditCard } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  
  const links = [
    { href: '/', icon: Home, label: 'ホーム' },
    { href: '/expenses', icon: PlusCircle, label: '支出' },
    { href: '/income', icon: DollarSign, label: '収入' },
    { href: '/debts', icon: CreditCard, label: '借金' },
  ];
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16">
        {links.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                isActive ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <Icon size={24} />
              <span className="text-xs mt-1">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}