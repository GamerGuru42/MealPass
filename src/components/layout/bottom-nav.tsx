'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, UtensilsCrossed, ReceiptText, History, User } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: 'Home', href: '/student', icon: Home },
  { label: 'Menu', href: '/student/menu', icon: UtensilsCrossed },
  { label: 'Orders', href: '/student/orders', icon: ReceiptText },
  { label: 'History', href: '/student/transactions', icon: History },
  { label: 'Account', href: '/student/account', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-slate-200 pb-safe"
      aria-label="Mobile Navigation"
    >
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 transition-colors relative min-h-[48px] ${
                isActive
                  ? 'text-brand-600 font-bold'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} aria-hidden="true" />
              <span className="text-[10px] leading-none">{item.label}</span>
              {isActive && (
                <span className="absolute top-1 w-6 h-1 bg-brand-500 rounded-full" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
