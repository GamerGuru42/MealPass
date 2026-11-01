'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { StudentShell } from '@/components/layout/student-shell';
import { formatNaira } from '@/lib/utils';
import {
  UtensilsCrossed,
  Receipt,
  ArrowLeftRight,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Store,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Smartphone,
  ChefHat,
  Landmark,
  UserCheck,
  Building2,
  Clock,
  Layers,
  Check,
} from 'lucide-react';

export default function HomePage() {
  const [balance, setBalance] = useState<number>(12500);
  const [availableMeals, setAvailableMeals] = useState<number>(8);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/student/dashboard?studentProfileId=f0000000-0000-0000-0000-000000000001');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.financial) {
            const bal = Number(json.data.financial.balance);
            setBalance(bal);
            setAvailableMeals(Math.max(0, Math.floor(bal / 1500)));
          }
        }
      } catch (err) {
        console.error('Failed to load home dashboard info:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <StudentShell studentName="Benny Iduoku-Ben" matricNumber="CU/2024/0142">
      <div className="space-y-7 sm:space-y-8">
        {/* =========================================================================
            1. FULL-WIDTH HERO BANNER (Matches Proposed Mockup)
        ========================================================================== */}
        <section
          className="rounded-[2.25rem] overflow-hidden relative shadow-md shadow-blue-950/5 min-h-[270px] md:min-h-[300px] flex items-stretch bg-[#081735]"
          aria-label="Welcome Banner"
        >
          {/* Background Food Image */}
          <div className="absolute inset-0 w-full h-full">
            <img
              src="/images/hero-food.jpg"
              alt="Appetizing university dining meal"
              className="w-full h-full object-cover object-right md:object-[75%_center]"
            />
            {/* Smooth Left Dark Gradient Mask (Matches Mockup curve) */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#071739] via-[#09224f]/95 via-50% to-transparent" />
            <div className="absolute inset-0 bg-radial-at-l from-[#071739]/80 to-transparent" />
          </div>

          {/* Left Text & CTA Content */}
          <div className="relative z-10 max-w-xl p-6 sm:p-8 md:p-10 flex flex-col justify-center">
            {/* Pill Greeting Badge */}
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-300 mb-2.5">
              <span>WELCOME TO MEALPASS</span>
              <span>👋</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1] mb-2 sm:mb-3">
              Good Food. <br />
              <span className="text-white">Great Campus Life.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-slate-200/90 font-medium max-w-md leading-relaxed mb-5 sm:mb-6">
              Quick, secure and convenient dining for Cosmopolitan University students, faculty and staff.
            </p>

            {/* Primary Action Button */}
            <div className="flex items-center gap-3">
              <Link
                href="/student/menu"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-400/20 hover:shadow-amber-400/30 transition-all transform hover:-translate-y-0.5"
              >
                <span>Order Your Meal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/cafeteria"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm backdrop-blur-sm border border-white/20 transition-all"
              >
                <ChefHat className="w-4 h-4 text-amber-300" />
                <span>Kitchen Queue</span>
              </Link>
            </div>

            {/* Carousel Navigation Indicators */}
            <div className="flex items-center gap-1.5 mt-6">
              <span className="w-6 h-1.5 rounded-full bg-amber-400" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500/60" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500/60" />
            </div>
          </div>
        </section>

        {/* =========================================================================
            2. MIDDLE ROW: 3 ACTION CARDS (Matches Mockup)
        ========================================================================== */}
        <section
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5"
          aria-label="Quick Actions"
        >
          {/* Card 1: Order Meal */}
          <Link
            href="/student/menu"
            className="group p-5 rounded-2xl bg-white border border-slate-200/70 shadow-xs hover:shadow-md transition-all flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform shrink-0">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Order Meal
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Browse menu and place order</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 2: Check Balance */}
          <Link
            href="/student/account"
            className="group p-5 rounded-2xl bg-white border border-slate-200/70 shadow-xs hover:shadow-md transition-all flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Check Balance
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">View your wallet balance</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 3: View Transactions */}
          <Link
            href="/student/transactions"
            className="group p-5 rounded-2xl bg-white border border-slate-200/70 shadow-xs hover:shadow-md transition-all flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-105 transition-transform shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                  View Transactions
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">See your recent activity</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-purple-600 group-hover:text-white transition-all shrink-0">
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>
        </section>

        {/* =========================================================================
            3. BOTTOM ROW: ACCOUNT OVERVIEW, QUICK LINKS & SECURITY (Matches Mockup)
        ========================================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5" aria-label="Account Overview and Quick Links">
          {/* Left Column: Account Overview Widget (Matches Mockup) */}
          <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/70 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Your Account Overview</h3>
                </div>
                <Link
                  href="/student/account"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 group"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {/* Dark Navy Balance Card */}
              <div className="rounded-2xl bg-[#091527] text-white p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-inner">
                {/* Wallet Balance */}
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                      Wallet Balance
                    </span>
                    <span className="text-2xl font-black tracking-tight text-white">
                      {formatNaira(balance)}
                    </span>
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="hidden sm:block h-10 w-[1px] bg-slate-800" />

                {/* Available Meals */}
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
                    <UtensilsCrossed className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                      Available Meals
                    </span>
                    <span className="text-2xl font-black tracking-tight text-white">
                      {availableMeals} Meals
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-4 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Cosmopolitan University Bursary cleared for Semester Session 2024/2025</span>
            </p>
          </div>

          {/* Middle Column: Quick Links */}
          <div className="lg:col-span-3 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/70 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-4">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Quick Links</h3>
              </div>

              <div className="space-y-2">
                <Link
                  href="/cafeteria"
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-700 group border border-transparent hover:border-slate-100"
                >
                  <div className="flex items-center gap-2.5">
                    <Store className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
                    <span>Cafeteria Queue</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  href="/student/menu"
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-700 group border border-transparent hover:border-slate-100"
                >
                  <div className="flex items-center gap-2.5">
                    <Receipt className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    <span>Meal Menu</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  href="/student/orders"
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-700 group border border-transparent hover:border-slate-100"
                >
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-slate-400 group-hover:text-purple-500 transition-colors" />
                    <span>Order Tracking</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 mt-2">
              <span className="text-[10px] text-slate-400 block font-medium">Cosmopolitan University Dining</span>
            </div>
          </div>

          {/* Right Column: Secure & Reliable Card */}
          <div className="lg:col-span-3 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/70 shadow-xs flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>

              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Secure & Reliable
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                Your meals and transactions are always protected with cryptographic PIN and verified double-entry ledgers.
              </p>
            </div>

            {/* University Seal / Campus Background Graphic */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                Verified Safe
              </span>
              <span>NextGen Tech</span>
            </div>
          </div>
        </section>

        {/* =========================================================================
            4. CAMPUS WORKSPACES & PORTALS (Dedicated Access Hub)
        ========================================================================== */}
        <section className="space-y-4 pt-2" aria-label="Campus Portals">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Campus Workspaces & Systems
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Direct access to student dining, kitchen display systems, and bursary accounting
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Student Portal */}
            <Link
              href="/student"
              className="p-5 rounded-2xl bg-white border border-slate-200/70 shadow-xs hover:shadow-md hover:border-blue-400 transition-all flex flex-col justify-between group text-left"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Smartphone className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-0.5">
                  Students
                </span>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Student Dining App
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                  Pre-order campus meals, manage allowances, and present pickup QR passes.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                <span>Enter Student Portal</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* 2. Cafeteria Kitchen Queue */}
            <Link
              href="/cafeteria"
              className="p-5 rounded-2xl bg-white border border-slate-200/70 shadow-xs hover:shadow-md hover:border-amber-400 transition-all flex flex-col justify-between group text-left"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <ChefHat className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-0.5">
                  Kitchen Display
                </span>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                  Cafeteria Operations
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                  Live ticket queue: Accept → Prepare → Ready. Scan pickup tokens instantly.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
                <span>Open Kitchen Board</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* 3. University Finance Desk */}
            <Link
              href="/admin"
              className="p-5 rounded-2xl bg-white border border-slate-200/70 shadow-xs hover:shadow-md hover:border-emerald-400 transition-all flex flex-col justify-between group text-left"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Landmark className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block mb-0.5">
                  Bursary Desk
                </span>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Finance & Admin
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                  Semester bursary allocations, double-entry ledger audits, and student clearances.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                <span>Access Finance Desk</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* 4. Operator Onboarding */}
            <Link
              href="/onboard"
              className="p-5 rounded-2xl bg-white border border-slate-200/70 shadow-xs hover:shadow-md hover:border-purple-400 transition-all flex flex-col justify-between group text-left"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <UserCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block mb-0.5">
                  Activation
                </span>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                  Staff Onboarding
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                  Activate operator credentials, accept invitations, and verify cafeteria access.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-700">
                <span>Start Onboarding</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </section>

        {/* =========================================================================
            5. ACTIVE CAMPUS CAFETERIAS DIRECTORY
        ========================================================================== */}
        <section className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/70 shadow-xs" aria-label="Cafeteria Directory">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">Active Campus Cafeterias</h3>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-Time Kitchen Service Active</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Main Campus Cafeteria</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Central Academic Complex • Hot meals & beverages</p>
                <span className="inline-block mt-2 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  Avg. Wait: ~8 mins
                </span>
              </div>
              <Link
                href="/student/menu"
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 hover:border-blue-400 text-xs font-bold text-slate-700 hover:text-blue-600 shadow-2xs transition-all"
              >
                View Menu
              </Link>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Kado Campus Cafeteria</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Medical & Sciences Annex • Express pickup available</p>
                <span className="inline-block mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  Avg. Wait: ~5 mins
                </span>
              </div>
              <Link
                href="/student/menu"
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 hover:border-emerald-400 text-xs font-bold text-slate-700 hover:text-emerald-600 shadow-2xs transition-all"
              >
                View Menu
              </Link>
            </div>
          </div>
        </section>
      </div>
    </StudentShell>
  );
}
