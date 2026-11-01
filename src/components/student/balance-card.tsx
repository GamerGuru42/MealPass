'use client';

import React from 'react';
import Link from 'next/link';
import { formatNaira } from '@/lib/utils';
import { Wallet, ArrowUpRight, History, ShieldCheck, PieChart, Sparkles } from 'lucide-react';

interface BalanceCardProps {
  balance: number;
  totalAllocated?: number;
  totalConsumed?: number;
  isFeedingActive?: boolean;
  matricNumber?: string;
  studentName?: string;
  periodName?: string;
}

export function BalanceCard({
  balance,
  totalAllocated = 50000.0,
  totalConsumed = 1299.0,
  isFeedingActive = true,
  matricNumber = 'CU/2024/0142',
  studentName = 'Amina Ibrahim',
  periodName = '2025/2026 First Semester',
}: BalanceCardProps) {
  const percentageLeft = totalAllocated > 0 ? Math.max(0, Math.min(100, (balance / totalAllocated) * 100)) : 100;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 text-white shadow-xl p-5 sm:p-7 border border-brand-700/50">
      {/* Decorative university watermark pattern */}
      <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
        <svg width="220" height="220" viewBox="0 0 120 120" fill="currentColor">
          <circle cx="60" cy="60" r="50" stroke="white" strokeWidth="4" />
          <path d="M60 22 C42 22 34 32 34 50 C34 76 60 92 60 92 C60 92 86 76 86 50 C86 32 78 22 60 22 Z" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
        {/* Card Header: Institutional identity & Clearance Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur border border-white/20">
              <Wallet className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-300 font-bold block">
                Cosmopolitan University
              </span>
              <span className="text-[11px] text-gold-300/90 font-mono font-medium">
                {periodName}
              </span>
            </div>
          </div>

          {isFeedingActive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <ShieldCheck className="w-3.5 h-3.5" />
              Feeding Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Pending Clearance
            </span>
          )}
        </div>

        {/* Balance Display */}
        <div>
          <span className="text-xs text-slate-300 font-medium block">
            Meal Balance
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-5xl font-black tracking-tight text-white font-sans">
              {formatNaira(balance)}
            </span>
          </div>

          {/* Context Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between items-center text-[11px] text-slate-300 mb-1">
              <span>Allocated: {formatNaira(totalAllocated)}</span>
              <span>Spent: {formatNaira(totalConsumed)}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gold-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${percentageLeft}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card Actions */}
        <div className="pt-3 border-t border-white/15 flex items-center gap-2.5">
          <Link
            href="/student/menu"
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gold-500 hover:bg-gold-400 active:scale-[0.98] text-brand-950 font-black text-xs sm:text-sm shadow-md transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            Pre-Order Food
          </Link>
          <Link
            href="/student/transactions"
            className="inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-[0.98] text-white font-bold text-xs sm:text-sm border border-white/20 backdrop-blur transition-all"
          >
            <History className="w-4 h-4 text-slate-300" />
            History
          </Link>
        </div>
      </div>
    </div>
  );
}
