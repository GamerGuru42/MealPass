'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { StudentShell } from '@/components/layout/student-shell';
import { ReceiptModal, ReceiptOrder } from '@/components/student/receipt-modal';
import { PickupQrModal, QrOrder } from '@/components/student/pickup-qr-modal';
import { useRealtimeOrders } from '@/lib/supabase/realtime';
import { formatNaira, formatLagosDate, formatLagosTimeOnly } from '@/lib/utils';
import {
  UtensilsCrossed,
  Utensils,
  Receipt,
  ArrowLeftRight,
  QrCode,
  ArrowRight,
  Clock,
  ShieldCheck,
  TrendingUp,
  Wallet,
  BarChart3,
  Zap,
  Store,
  BookOpen,
  HelpCircle,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Tag,
  Building2,
  Plus,
} from 'lucide-react';

export default function StudentDashboardPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [totalAllocated, setTotalAllocated] = useState<number>(0);
  const [totalConsumed, setTotalConsumed] = useState<number>(0);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<ReceiptOrder | null>(null);
  const [selectedQrOrder, setSelectedQrOrder] = useState<QrOrder | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [isQrOpen, setIsQrOpen] = useState<boolean>(false);
  const [supportModalOpen, setSupportModalOpen] = useState<boolean>(false);

  // Two-Campus State
  const [selectedCampusId, setSelectedCampusId] = useState<string>('c0000000-0000-0000-0000-000000000001');
  const campusName =
    selectedCampusId === 'c0000000-0000-0000-0000-000000000001'
      ? 'Main Campus (Alma House)'
      : 'Kado Campus';

  const [campusMenu, setCampusMenu] = useState<any[]>([]);

  const [studentInfo, setStudentInfo] = useState<{
    name: string;
    matricNumber: string;
    department: string;
    level: string;
  }>({
    name: 'Student Dining Access',
    matricNumber: '',
    department: 'Undergraduate Studies',
    level: '',
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      // 1. Resolve Session if present
      let targetProfileId: string | null = null;
      try {
        const sessionRes = await fetch('/api/auth/session');
        if (sessionRes.ok) {
          const sJson = await sessionRes.json();
          if (sJson.authenticated && sJson.user) {
            targetProfileId = sJson.user.studentProfileId || sJson.user.userId || null;
            setStudentInfo({
              name: sJson.user.name || 'Student Dining Access',
              matricNumber: sJson.user.matricNumber || '',
              department: sJson.user.department || 'Undergraduate Studies',
              level: sJson.user.level || '',
            });
          }
        }
      } catch {
        // no active session
      }

      // 2. Fetch authoritative student dashboard data if profile ID known
      const url = targetProfileId
        ? `/api/student/dashboard?studentProfileId=${targetProfileId}`
        : '/api/student/dashboard';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          if (d.student) {
            setStudentInfo((prev) => ({
              name: d.student.name || prev.name,
              matricNumber: d.student.matricNumber || prev.matricNumber,
              department: d.student.department || prev.department,
              level: d.student.level || prev.level,
            }));
          }
          if (d.financial) {
            setBalance(Number(d.financial.balance || 0));
            setTotalAllocated(Number(d.financial.totalAllocated || 0));
            setTotalConsumed(Number(d.financial.totalConsumed || 0));
          } else {
            setBalance(0);
          }
          setActiveOrder(d.activeOrder || null);
          setRecentOrders(d.recentOrders || []);
        } else {
          setBalance(0);
        }
      } else {
        setBalance(0);
      }

      // 3. Fetch Menu for the selected campus
      const menuRes = await fetch(`/api/menu?cafeteriaId=${selectedCampusId}`);
      if (menuRes.ok) {
        const menuJson = await menuRes.json();
        if (menuJson.success) {
          setCampusMenu(menuJson.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch student dashboard:', err);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, [selectedCampusId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Live Realtime WebSocket subscription on student orders
  useRealtimeOrders({
    studentProfileId: 'f0000000-0000-0000-0000-000000000001',
    onOrderInserted: fetchDashboardData,
    onOrderUpdated: fetchDashboardData,
  });

  const handleOpenReceipt = (order: any) => {
    setSelectedReceiptOrder({
      id: order.id,
      orderNumber: order.orderNumber || order.order_number,
      studentName: studentInfo.name,
      matricNumber: studentInfo.matricNumber,
      cafeteriaName: order.cafeteriaName || campusName,
      status: order.status,
      totalAmount: Number(order.totalAmount || order.total_amount),
      pickupCode: order.pickupCode || order.pickup_code,
      placedAt: order.placedAt || order.placed_at || new Date().toISOString(),
      items: (order.items || order.order_items || []).map((it: any) => ({
        id: it.id,
        itemName: it.itemName || it.item_name,
        unitPrice: Number(it.unitPrice || it.unit_price),
        quantity: Number(it.quantity),
        subtotal: Number(it.subtotal),
      })),
    });
    setIsReceiptOpen(true);
  };

  const handleOpenQr = (order: any) => {
    setSelectedQrOrder({
      orderNumber: order.orderNumber || order.order_number,
      pickupCode: order.pickupCode || order.pickup_code,
      pickupQrToken: order.pickupQrToken || order.pickup_qr_token || 'TOKEN-CU-DEMO',
      cafeteriaName: order.cafeteriaName || campusName,
      cafeteriaId: selectedCampusId,
    });
    setIsQrOpen(true);
  };

  const estimatedMeals = balance !== null && balance > 0 ? Math.floor(balance / 1500) : 0;

  return (
    <StudentShell
      studentName={studentInfo.name}
      matricNumber={studentInfo.matricNumber}
      selectedCampusId={selectedCampusId}
      onSelectCampus={setSelectedCampusId}
    >
      <div className="space-y-6 sm:space-y-7">
        {/* =====================================================================
            1. HERO BANNER (Matches User Proposed Mockup Exactly)
        ====================================================================== */}
        <section
          className="rounded-[2.25rem] overflow-hidden relative shadow-md shadow-blue-950/5 min-h-[260px] md:min-h-[290px] flex items-stretch bg-[#081735]"
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
          <div className="relative z-10 max-w-xl p-6 sm:p-8 md:p-10 flex flex-col justify-center text-left">
            {/* Pill Greeting Badge */}
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-300 mb-2.5">
              <span>WELCOME TO MEALPASS</span>
              <span>👋</span>
              <span className="text-white/60">•</span>
              <span className="text-white/80">{campusName}</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.08]">
              Good Food.
              <span className="text-amber-400 block mt-0.5">Great Campus Life.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-slate-200/90 mt-3 max-w-sm sm:max-w-md font-medium leading-relaxed">
              Your verified university feeding allowance is active. Order fresh meals for counter pickup.
            </p>

            {/* Primary Action Button */}
            <div className="mt-6 flex items-center gap-4">
              <Link
                href="/student/menu"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>Order Your Meal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Carousel Indicator Dots */}
            <div className="flex items-center gap-1.5 mt-6" aria-hidden="true">
              <span className="w-6 h-2 rounded-full bg-amber-400" />
              <span className="w-2 h-2 rounded-full bg-white/40" />
              <span className="w-2 h-2 rounded-full bg-white/40" />
            </div>
          </div>
        </section>

        {/* =====================================================================
            ACTIVE ORDER PICKUP ALERT (Displayed when order is in progress)
        ====================================================================== */}
        {activeOrder && (
          <div className="rounded-3xl p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-200 flex items-center justify-center shrink-0 shadow-inner">
                <Clock className="w-6 h-6 text-amber-900 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-sm text-amber-900">
                    {activeOrder.orderNumber}
                  </span>
                  <span
                    className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      activeOrder.status === 'READY'
                        ? 'bg-emerald-600 text-white'
                        : activeOrder.status === 'PREPARING'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-200 text-amber-900'
                    }`}
                  >
                    {activeOrder.status === 'READY' ? 'READY FOR COUNTER PICKUP' : activeOrder.status}
                  </span>
                </div>
                <p className="text-xs text-amber-900/90 mt-1">
                  {activeOrder.status === 'READY'
                    ? `Your meal is ready at ${campusName} counter! Present your pass below.`
                    : activeOrder.status === 'PREPARING'
                    ? 'The cafeteria kitchen is actively preparing your order.'
                    : 'Order confirmed and queued in cafeteria order system.'}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-600">Pickup Pass:</span>
                  <span className="font-mono font-black text-sm text-brand-900 bg-white/90 px-2.5 py-0.5 rounded-lg border border-amber-300">
                    {activeOrder.pickupCode}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleOpenQr(activeOrder)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-blue-900 text-white text-xs font-bold hover:bg-blue-800 transition-colors shadow-sm"
              >
                <QrCode className="w-4 h-4 text-amber-400" />
                Pickup QR
              </button>
              <button
                onClick={() => handleOpenReceipt(activeOrder)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-white text-slate-800 text-xs font-bold border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
              >
                <Receipt className="w-4 h-4 text-slate-500" />
                Receipt
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            2. MIDDLE ACTION CARDS ROW (3 Cards: Order, Balance, Transactions)
        ====================================================================== */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5" aria-label="Quick Actions">
          {/* Card 1: Order Meal */}
          <Link
            href="/student/menu"
            className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex items-center justify-between group text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                  Order Meal
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Browse menu and place your order</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-blue-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-colors shrink-0">
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 2: Check Balance */}
          <Link
            href="/student/account"
            className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex items-center justify-between group text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Check Balance
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">View your feeding balance</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-emerald-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-colors shrink-0">
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 3: View Transactions */}
          <Link
            href="/student/transactions"
            className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-purple-300 transition-all flex items-center justify-between group text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-purple-600 transition-colors">
                  View Purchases
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">See your meal purchase history</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-purple-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-colors shrink-0">
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>
        </section>

        {/* =====================================================================
            3. BOTTOM ROW: ACCOUNT OVERVIEW, QUICK LINKS & SECURITY
        ====================================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5" aria-label="Dashboard Details">
          {/* Card 1: Your Account Overview (Span 6 on desktop) */}
          <div className="lg:col-span-6 p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between text-left">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <h2 className="font-bold text-sm sm:text-base text-slate-900">Feeding Balance Overview</h2>
              </div>
              <Link
                href="/student/transactions"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
              >
                <span>View Details</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* Dark Navy Balance Card (Matches Mockup) */}
            <div className="mt-2 rounded-2xl bg-[#091527] text-white p-4 sm:p-5 flex items-center justify-between gap-4 shadow-inner">
              {/* Wallet Balance */}
              <div className="flex items-center gap-3 sm:gap-4 flex-1">
                <div className="w-11 h-11 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Feeding Balance</span>
                  <span className="text-lg sm:text-2xl font-black text-white tracking-tight mt-0.5 block">
                    {balance === null && loading ? '...' : formatNaira(balance ?? 0)}
                  </span>
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="h-10 w-[1px] bg-slate-800 shrink-0" />

              {/* Available Meals */}
              <div className="flex items-center gap-3 sm:gap-4 flex-1 pl-2">
                <div className="w-11 h-11 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Meals Available Today</span>
                  <span className="text-lg sm:text-2xl font-black text-white tracking-tight mt-0.5 block">
                    {estimatedMeals} Meals
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-4 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Feeding entitlement verified by Madam at the cafeteria desk</span>
            </p>
          </div>

          {/* Card 2: Quick Links (Span 3 on desktop) */}
          <div className="lg:col-span-3 p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between text-left">
            <div className="flex items-center gap-2 pb-2">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <h2 className="font-bold text-sm sm:text-base text-slate-900">Cafeteria Links</h2>
            </div>

            <div className="space-y-1.5 mt-2">
              <Link
                href="/student/orders"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Store className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                  <span>Order Pickup Status</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                href="/student/menu"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                  <span>Browse Campus Menu</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </Link>

              <button
                onClick={() => setSupportModalOpen(true)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors group text-left"
              >
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                  <span>Cafeteria Help</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400">
              <span>Current: {campusName}</span>
            </div>
          </div>

          {/* Card 3: Secure & Reliable */}
          <div className="lg:col-span-3 p-5 rounded-3xl bg-gradient-to-br from-blue-50/80 via-white to-blue-50/30 border border-blue-100/80 shadow-xs relative overflow-hidden flex flex-col justify-between text-left">
            <div>
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 mt-3.5">
                Secure & Reliable
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed max-w-[210px]">
                Your meal allowance is protected with cryptographic PIN and counter QR verification.
              </p>
            </div>

            <div className="mt-4 pt-2 flex justify-end">
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                Ledger Protected
              </span>
            </div>
          </div>
        </section>

        {/* =====================================================================
            4. TODAY'S FOOD PRICES & AFFORDABLE MEAL OPTIONS
        ====================================================================== */}
        <section className="space-y-4 pt-2 text-left" aria-label="Affordable Campus Meals">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Today&apos;s Affordable Campus Meals ({campusName})</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Freshly prepared meals within your daily feeding allowance
              </p>
            </div>
            <Link
              href="/student/menu"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
            >
              <span>Full Menu</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {campusMenu.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {campusMenu.slice(0, 4).map((dish: any) => (
                <div
                  key={dish.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {dish.categoryName || 'Campus Dish'}
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                        Affordable
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 leading-snug">{dish.name}</h3>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-base font-black text-slate-900">{formatNaira(dish.price)}</span>
                    <Link
                      href="/student/menu"
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      <span>Order</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-white border border-slate-200/80 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">No Dishes Currently Listed for {campusName}</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                The cafeteria kitchen has not posted today&apos;s active selections yet. Please check back shortly or visit the counter.
              </p>
            </div>
          )}
        </section>

        {/* =====================================================================
            5. RECENT MEAL PURCHASES
        ====================================================================== */}
        <section className="space-y-4 pt-2 text-left" aria-label="Recent Purchases">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-700" />
                <span>Recent Meal Purchases</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Meals debited from your student feeding balance
              </p>
            </div>
            <Link
              href="/student/transactions"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {recentOrders.length > 0 ? (
              recentOrders.slice(0, 3).map((ord: any) => (
                <div key={ord.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                      <UtensilsCrossed className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{ord.orderNumber}</p>
                      <p className="text-[11px] text-slate-500">
                        {ord.cafeteriaName || campusName} • {formatLagosDate(ord.placedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-rose-600 block">
                      -{formatNaira(ord.totalAmount)}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">
                      {ord.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                <span>No meal purchases recorded yet this week.</span>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* =====================================================================
          MODALS (Receipt, QR, Support)
      ====================================================================== */}
      {selectedReceiptOrder && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          order={selectedReceiptOrder}
        />
      )}

      {selectedQrOrder && (
        <PickupQrModal
          isOpen={isQrOpen}
          onClose={() => setIsQrOpen(false)}
          order={selectedQrOrder}
        />
      )}
    </StudentShell>
  );
}
