'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CosmopolitanCrest } from '@/components/shared/logo';
import {
  ChefHat,
  Clock,
  UtensilsCrossed,
  FileSpreadsheet,
  Users,
  BarChart3,
  Search,
  Building2,
  Menu,
  X,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  Flame,
  CheckCircle2,
} from 'lucide-react';

interface CafeteriaShellProps {
  children: React.ReactNode;
  staffRole?: 'CAFETERIA_STAFF' | 'CAFETERIA_HEAD';
  staffName?: string;
  campusName?: string;
  selectedCafeteriaId?: string;
  onSelectCafeteria?: (id: string) => void;
  onRoleToggle?: (role: 'CAFETERIA_STAFF' | 'CAFETERIA_HEAD') => void;
}

export function CafeteriaShell({
  children,
  staffRole = 'CAFETERIA_HEAD',
  staffName = 'Madam Margaret Okonkwo',
  campusName = 'Main Campus (Alma House)',
  selectedCafeteriaId = 'c0000000-0000-0000-0000-000000000001',
  onSelectCafeteria,
  onRoleToggle,
}: CafeteriaShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Kitchen Queue', href: '/cafeteria', icon: Clock, exact: true },
    { label: 'Menu & Prices', href: '/cafeteria/menu', icon: UtensilsCrossed },
    { label: 'Daily Reports', href: '/cafeteria/reports', icon: BarChart3 },
    { label: 'Staff Roster', href: '/cafeteria/staff', icon: Users },
    { label: 'Data Migration', href: '/cafeteria/migration', icon: FileSpreadsheet },
  ];

  return (
    <div className="min-h-screen bg-[#f4f6fb] flex flex-col lg:flex-row antialiased text-slate-900">
      {/* =========================================================================
          DESKTOP SIDEBAR
      ========================================================================== */}
      <aside className="hidden lg:flex flex-col justify-between w-64 xl:w-72 bg-[#091527] text-white h-screen sticky top-0 p-5 shrink-0 z-40 border-r border-slate-800/80 select-none overflow-y-auto">
        <div className="space-y-6">
          {/* University Branding */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-3 group">
              <CosmopolitanCrest className="w-10 h-10 group-hover:scale-105 transition-transform shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-slate-300 font-semibold font-serif leading-tight">
                  COSMOPOLITAN
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold font-serif leading-tight">
                  UNIVERSITY
                </span>
              </div>
            </Link>

            {/* MealPass Operations Banner */}
            <div className="flex items-center gap-2.5 pt-1 border-t border-slate-800/60">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <ChefHat className="w-4 h-4" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-black tracking-tight text-white">
                  Cafeteria <span className="text-amber-400">Ops</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Order Fulfillment</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 pt-2" aria-label="Cafeteria Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Campus Switcher / Card */}
        <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-3.5 text-white space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <Building2 className="w-4 h-4" />
            <span>Active Campus Location</span>
          </div>
          <div className="space-y-1 pt-1">
            <button
              onClick={() => onSelectCafeteria && onSelectCafeteria('c0000000-0000-0000-0000-000000000001')}
              className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-semibold text-left transition-colors flex items-center justify-between ${
                selectedCafeteriaId === 'c0000000-0000-0000-0000-000000000001'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <span>Main (Alma House)</span>
              {selectedCafeteriaId === 'c0000000-0000-0000-0000-000000000001' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </button>
            <button
              onClick={() => onSelectCafeteria && onSelectCafeteria('c0000000-0000-0000-0000-000000000002')}
              className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-semibold text-left transition-colors flex items-center justify-between ${
                selectedCafeteriaId === 'c0000000-0000-0000-0000-000000000002'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <span>Kado Campus</span>
              {selectedCafeteriaId === 'c0000000-0000-0000-0000-000000000002' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          MOBILE DRAWER
      ========================================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-[#091527] text-white h-full p-5 flex flex-col justify-between z-10 shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CosmopolitanCrest className="w-8 h-8" />
                  <span className="text-base font-black text-white">Cafeteria Ops</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium ${
                        isActive
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN APPLICATION AREA
      ========================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-[#f4f6fb]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between border-b border-slate-200/60 gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-200/60"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-800 hidden sm:inline-block">
                {campusName}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 hidden md:inline-block">
                Live Kitchen Sync
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Switcher */}
            {onRoleToggle && (
              <div className="flex items-center bg-white p-1 rounded-full border border-slate-200 shadow-xs text-xs">
                <button
                  type="button"
                  onClick={() => onRoleToggle('CAFETERIA_STAFF')}
                  className={`px-3 py-1 rounded-full font-bold transition-colors ${
                    staffRole === 'CAFETERIA_STAFF'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Staff
                </button>
                <button
                  type="button"
                  onClick={() => onRoleToggle('CAFETERIA_HEAD')}
                  className={`px-3 py-1 rounded-full font-bold transition-colors ${
                    staffRole === 'CAFETERIA_HEAD'
                      ? 'bg-[#091527] text-amber-300 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Madam / Head
                </button>
              </div>
            )}

            {/* Operator Chip */}
            <div className="flex items-center gap-2 p-1.5 sm:pr-3 rounded-full bg-white border border-slate-200 shadow-xs">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center">
                <ChefHat className="w-4 h-4" />
              </div>
              <div className="hidden sm:flex flex-col text-left leading-none">
                <span className="text-xs font-bold text-slate-900">{staffName}</span>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                  {staffRole === 'CAFETERIA_HEAD' ? 'Cafeteria Head' : 'Kitchen Staff'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}

