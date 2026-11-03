'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/shared/logo';
import { Bell, User, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  roleName?: string;
  userName?: string;
  matricNumber?: string;
}

export function Header({
  roleName = 'Student',
  userName = 'Student User',
  matricNumber = '',
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-95 transition-opacity">
          <Logo size="md" />
        </Link>

        <div className="flex items-center gap-3">
          {/* Role badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-xs font-semibold text-brand-800">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
            <span>{roleName}</span>
          </div>

          {/* User profile dropdown / preview */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-xs ring-2 ring-gold-500/30">
              {userName.split(' ').map((n) => n[0]).join('')}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-none">{userName}</span>
              <span className="text-[11px] text-slate-500 font-mono">{matricNumber}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

