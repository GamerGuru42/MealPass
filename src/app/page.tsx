'use client';

import React from 'react';
import Link from 'next/link';
import { CosmopolitanCrest, Logo, NextGenAttribution } from '@/components/shared/logo';
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
  CheckCircle,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between pb-safe">
      {/* Top University Brand Banner */}
      <header className="bg-brand-900 border-b border-brand-800 text-white py-4 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CosmopolitanCrest className="w-10 h-10" />
            <div>
              <p className="font-serif text-xs font-bold tracking-wider text-gold-400 uppercase">
                Cosmopolitan University
              </p>
              <h1 className="text-lg font-black tracking-tight text-white">MealPass</h1>
            </div>
          </div>
          <span className="text-xs bg-white/10 text-slate-300 px-3 py-1 rounded-full border border-white/20 hidden sm:inline-block">
            Production V1.0 • PWA Ready
          </span>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12 flex-1 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-900 text-xs font-semibold mb-6">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <span>Digital Feeding & Cafeteria Management Platform</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight max-w-3xl leading-tight">
          Goodbye Paper Tickets. <br />
          <span className="text-brand-600">Secure Digital Dining</span> for Cosmopolitan University.
        </h2>

        <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
          Replacing physical feeding booklets with an authoritative financial ledger, pre-ordering,
          instant digital receipts, and real-time kitchen fulfillment.
        </p>

        {/* Portal Entry Cards (Role Based Access) */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-5 w-full text-left">
          {/* 1. Student Portal */}
          <Link
            href="/student"
            className="group relative p-6 rounded-3xl bg-white border-2 border-slate-200 hover:border-brand-500 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Smartphone className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 block mb-1">
                Mobile-First PWA
              </span>
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                Student Portal
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Check ₦ balance, browse digital menu, pre-order with PIN, view digital receipts & QR pickup pass.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-brand-600">
              <span>Open Student App</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 2. Cafeteria Kitchen & Staff Portal */}
          <Link
            href="/cafeteria"
            className="group relative p-6 rounded-3xl bg-white border-2 border-slate-200 hover:border-gold-500 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-gold-50 text-gold-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ChefHat className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gold-600 block mb-1">
                Kitchen & Staff
              </span>
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-gold-700 transition-colors">
                Cafeteria Queue
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Live order board: Accepted → Preparing → Ready. Scan QR tokens or enter codes to mark received.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-gold-700">
              <span>Open Kitchen Board</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 3. University Finance & Admin Portal */}
          <Link
            href="/admin"
            className="group relative p-6 rounded-3xl bg-white border-2 border-slate-200 hover:border-emerald-500 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Landmark className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
                Bursary & Admin
              </span>
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Finance & Audit
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Verify bank payments, allocate semester feeding balances, reconcile immutable transaction ledger.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
              <span>Open Finance Desk</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Core Principles Strip (Section 2 & 3 of Prompt) */}
        <div className="mt-12 w-full p-6 bg-white rounded-3xl border border-slate-200 text-left">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-brand-600" />
            <h4 className="font-bold text-sm text-slate-900">
              Architectural Principle: Enter Information Once — Propagate Everywhere
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Authoritative Ledger:</strong> Balances are derived from immutable append-only transactions.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Zero Manual Calculations:</strong> The server verifies prices, balances, and deducts atomically.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Separate Statuses:</strong> Financial success and kitchen preparation are strictly separated.
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-brand-900">COSMOPOLITAN UNIVERSITY</span>
            <span>•</span>
            <span>Official Feeding & Cafeteria Platform</span>
          </div>
          <NextGenAttribution />
        </div>
      </footer>
    </div>
  );
}

