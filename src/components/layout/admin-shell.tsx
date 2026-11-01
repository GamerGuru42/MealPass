'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CosmopolitanCrest } from '@/components/shared/logo';
import {
  Landmark,
  Users,
  CreditCard,
  Calendar,
  Scale,
  History,
  FileSpreadsheet,
  ShieldCheck,
  Building2,
  Menu,
  X,
  RefreshCw,
  ExternalLink,
  ChefHat,
  Smartphone,
} from 'lucide-react';

export type AdminTab =
  | 'overview'
  | 'students'
  | 'allocation'
  | 'periods'
  | 'reconciliation'
  | 'audit'
  | 'reports';

interface AdminShellProps {
  children: React.ReactNode;
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  adminName?: string;
  matricNumber?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function AdminShell({
  children,
  activeTab,
  onTabChange,
  adminName = 'Dr. Chinedu Bello',
  matricNumber = 'BURSARY-01',
  onRefresh,
  isRefreshing = false,
}: AdminShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs: Array<{ id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: 'Bursary Overview', icon: Landmark },
    { id: 'students', label: 'Student Wallets', icon: Users },
    { id: 'allocation', label: 'Funds Allocation', icon: CreditCard },
    { id: 'periods', label: 'Academic Periods', icon: Calendar },
    { id: 'reconciliation', label: 'Ledger Audit', icon: Scale },
    { id: 'audit', label: 'System Logs', icon: History },
    { id: 'reports', label: 'Export Reports', icon: FileSpreadsheet },
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

            {/* MealPass Admin Identity */}
            <div className="flex items-center gap-2.5 pt-1 border-t border-slate-800/60">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Landmark className="w-4 h-4" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-black tracking-tight text-white">
                  Finance <span className="text-emerald-400">& Bursary</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Clearance & Ledger</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="space-y-1.5 pt-2" aria-label="Admin Navigation">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all text-left ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Integrity Indicator */}
        <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-3.5 text-white space-y-1.5 text-center">
          <div className="w-7 h-7 rounded-full bg-emerald-400/20 text-emerald-300 mx-auto flex items-center justify-center mb-1">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold leading-tight">Double-Entry Ledger</p>
          <p className="text-[10px] text-slate-400 leading-tight">Immutable Append-Only Audit</p>
          <div className="pt-2 flex items-center justify-center gap-2 text-[10px] text-slate-400">
            <Link href="/cafeteria" className="hover:text-white flex items-center gap-1">
              <ChefHat className="w-3 h-3" />
              <span>Cafeteria</span>
            </Link>
            <span>•</span>
            <Link href="/student" className="hover:text-white flex items-center gap-1">
              <Smartphone className="w-3 h-3" />
              <span>Student App</span>
            </Link>
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
                  <span className="text-base font-black text-white">Bursary Desk</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        onTabChange(tab.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium text-left ${
                        isActive
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{tab.label}</span>
                    </button>
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
                Cosmopolitan University Bursary
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 hidden md:inline-block">
                Authoritative Double-Entry Ledger
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
                title="Refresh Ledger Telemetry"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh Data</span>
              </button>
            )}

            {/* Administrator Chip */}
            <div className="flex items-center gap-2 p-1.5 sm:pr-3 rounded-full bg-white border border-slate-200 shadow-xs">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                CB
              </div>
              <div className="hidden sm:flex flex-col text-left leading-none">
                <span className="text-xs font-bold text-slate-900">{adminName}</span>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5">Finance Administrator</span>
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
