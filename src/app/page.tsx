'use client';

import React from 'react';
import Link from 'next/link';
import { CosmopolitanCrest, NextGenAttribution } from '@/components/shared/logo';
import {
  Smartphone,
  ChefHat,
  Landmark,
  ShieldCheck,
  ArrowRight,
  Receipt,
  Sparkles,
  Lock,
  Layers,
  CheckCircle2,
  UtensilsCrossed,
  Wallet,
  QrCode,
  Clock,
  Zap,
  TrendingUp,
  UserCheck,
  Building2,
  Check,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f4f6fb] flex flex-col justify-between antialiased text-slate-900 selection:bg-amber-400 selection:text-slate-950">
      {/* =========================================================================
          TOP UNIVERSITY BRAND NAVBAR
      ========================================================================== */}
      <header className="bg-[#091527] border-b border-slate-800/80 text-white sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between py-3">
          {/* University Crest & MealPass Logo */}
          <Link href="/" className="flex items-center gap-3.5 group">
            <CosmopolitanCrest className="w-10 h-10 group-hover:scale-105 transition-transform shrink-0" />
            <div className="flex flex-col">
              <span className="font-serif text-[10px] sm:text-xs font-bold tracking-widest text-amber-300 uppercase leading-none">
                COSMOPOLITAN UNIVERSITY
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Meal<span className="text-amber-400">Pass</span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400/10 text-amber-300 border border-amber-400/20 px-2 py-0.5 rounded-full ml-1">
                  Official Portal
                </span>
              </div>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-2 text-xs font-semibold">
            <Link
              href="/student"
              className="px-3.5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              Student Portal
            </Link>
            <Link
              href="/cafeteria"
              className="px-3.5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cafeteria Operations
            </Link>
            <Link
              href="/admin"
              className="px-3.5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              Finance & Bursary
            </Link>
            <Link
              href="/onboard"
              className="px-3.5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              Staff Onboarding
            </Link>
          </nav>

          {/* Quick Action Button */}
          <div className="flex items-center gap-3">
            <Link
              href="/student"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              <Smartphone className="w-4 h-4" />
              <span>Open Student App</span>
            </Link>
          </div>
        </div>
      </header>

      {/* =========================================================================
          HERO SECTION (Matching Proposed High-Fidelity Aesthetic)
      ========================================================================== */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 w-full space-y-12 sm:space-y-16">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Headlines & Call to Action */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-900 text-xs font-bold shadow-xs">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Cosmopolitan University Digital Feeding System</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.08]">
              Good Food. <br />
              <span className="text-blue-600">Great Campus Life.</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 max-w-xl font-medium leading-relaxed">
              Replacing obsolete paper meal tickets with an authoritative financial ledger, pre-ordering,
              cryptographic PIN security, and instant counter QR fulfillment.
            </p>

            {/* Launch Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Link
                href="/student"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#091527] hover:bg-slate-900 text-white font-bold text-sm shadow-xl shadow-slate-950/10 hover:shadow-slate-950/20 transition-all transform hover:-translate-y-0.5"
              >
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>Student Dining App</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/cafeteria"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all"
              >
                <ChefHat className="w-4 h-4 text-amber-600" />
                <span>Cafeteria Kitchen Queue</span>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="pt-4 flex flex-wrap items-center gap-5 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Bank-Grade Ledger Invariants</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero Double-Spending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>PWA Offline Resilience</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Mockup Showcase (Matches the UI Design Image) */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-[2.5rem] bg-[#091527] p-6 sm:p-7 text-white shadow-2xl shadow-blue-950/20 border border-slate-800 space-y-5 overflow-hidden">
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

              {/* Header preview inside mockup */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    BI
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Benny Iduoku-Ben</p>
                    <p className="text-[10px] text-slate-400 font-mono">CU/2024/0142 • Computer Science</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Bursary Cleared
                </span>
              </div>

              {/* Hero Food Banner Thumbnail */}
              <div className="rounded-2xl overflow-hidden relative h-36 border border-slate-800">
                <img
                  src="/images/hero-food.jpg"
                  alt="University dining"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#071739] via-[#071739]/80 to-transparent p-4 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    WELCOME TO MEALPASS 👋
                  </span>
                  <p className="text-base font-black text-white leading-tight mt-0.5">
                    Good Food. <br />
                    <span className="text-amber-400">Great Campus Life.</span>
                  </p>
                </div>
              </div>

              {/* Account Overview Widget (Matches Mockup) */}
              <div className="rounded-2xl bg-black/40 border border-slate-800 p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Wallet Balance</span>
                    <span className="text-lg font-black text-white">₦12,500.00</span>
                  </div>
                </div>

                <div className="h-8 w-[1px] bg-slate-800" />

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center">
                    <UtensilsCrossed className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Available</span>
                    <span className="text-lg font-black text-white">8 Meals</span>
                  </div>
                </div>
              </div>

              {/* Active Pickup Pass Preview */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <QrCode className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Pickup Pass: CU-7489</p>
                    <p className="text-[10px] text-slate-400">Main Campus Cafeteria • Ready</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  Ready
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            ROLE-BASED PORTAL ACCESS GRID (Modern 4-Card Hub)
        ========================================================================== */}
        <section className="space-y-6 pt-6" aria-label="Portals">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 text-left">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-blue-600 block">
                Role-Based Campus Workspaces
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                Enter Your Dedicated Portal
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-md">
              Secure, authorized environments tailored specifically for students, cafeteria operators, and university bursary auditors.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1. Student Portal */}
            <Link
              href="/student"
              className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-blue-400 transition-all flex flex-col justify-between group text-left"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Smartphone className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
                  Students
                </span>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Student Portal
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  View meal balances, browse cafeteria menus, pre-order with PIN, and present digital pickup QR codes.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                <span>Enter Student App</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* 2. Cafeteria Kitchen Queue */}
            <Link
              href="/cafeteria"
              className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-amber-400 transition-all flex flex-col justify-between group text-left"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <ChefHat className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
                  Kitchen & Counter
                </span>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                  Cafeteria Operations
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Real-time ticket board: Accept $\to$ Preparing $\to$ Ready. Scan pickup tokens and verify student collections.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700 group-hover:text-amber-800">
                <span>Open Kitchen Board</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* 3. University Finance Desk */}
            <Link
              href="/admin"
              className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-400 transition-all flex flex-col justify-between group text-left"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Landmark className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                  Bursary & Audit
                </span>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Finance & Admin
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Allocate semester feeding balances, reconcile financial ledgers, configure academic periods, and audit transactions.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:text-emerald-800">
                <span>Access Finance Desk</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* 4. Operator Onboarding */}
            <Link
              href="/onboard"
              className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-purple-400 transition-all flex flex-col justify-between group text-left"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <UserCheck className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 block mb-1">
                  Activation
                </span>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                  Staff Onboarding
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Accept administrative invitations, configure operational cafeteria credentials, and activate kitchen accounts.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-700 group-hover:text-purple-800">
                <span>Activate Account</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </section>

        {/* =========================================================================
            ARCHITECTURAL PILLARS (Clean Modern 3-Column Strip)
        ========================================================================== */}
        <section className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs text-left space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Institutional Integrity: Single Source of Truth
              </h3>
              <p className="text-xs text-slate-500">
                Core engineering principles guaranteeing trust between Cosmopolitan University students, cafeterias, and bursary.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Authoritative Double-Entry Ledger</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Wallet balances are never stored as arbitrary counters. Every addition and deduction is computed from immutable, append-only ledger entries.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Dual-Key PIN & Token Verification</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Orders require 4-digit student transaction PIN authorization with automated lockout protection after 3 failed attempts to prevent theft.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Separation of Financial & Kitchen State</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Payment confirmation occurs atomically at order placement. Kitchen preparation operates as a distinct lifecycle with automatic refund guarantees on cancellation.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* =========================================================================
          INSTITUTIONAL UNIVERSITY FOOTER
      ========================================================================== */}
      <footer className="bg-white border-t border-slate-200/80 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CosmopolitanCrest className="w-8 h-8 opacity-80" />
            <div>
              <p className="font-serif font-bold text-slate-900 uppercase">Cosmopolitan University</p>
              <p className="text-[11px] text-slate-500">Official MealPass Digital Dining & Cafeteria Platform</p>
            </div>
          </div>

          <div className="text-center sm:text-right text-[11px] space-y-0.5">
            <p>Student Activities Center • Main Campus • Abuja, Nigeria</p>
            <NextGenAttribution />
          </div>
        </div>
      </footer>
    </div>
  );
}
