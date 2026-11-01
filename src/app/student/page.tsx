'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { BalanceCard } from '@/components/student/balance-card';
import { ReceiptModal, ReceiptOrder } from '@/components/student/receipt-modal';
import { PickupQrModal, QrOrder } from '@/components/student/pickup-qr-modal';
import { useRealtimeOrders } from '@/lib/supabase/realtime';
import { formatNaira, formatLagosDate } from '@/lib/utils';
import {
  UtensilsCrossed,
  Receipt,
  History,
  QrCode,
  ArrowRight,
  Clock,
  User,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export default function StudentDashboardPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [balance, setBalance] = useState<number>(48701);
  const [totalAllocated, setTotalAllocated] = useState<number>(50000);
  const [totalConsumed, setTotalConsumed] = useState<number>(1299);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<ReceiptOrder | null>(null);
  const [selectedQrOrder, setSelectedQrOrder] = useState<QrOrder | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [isQrOpen, setIsQrOpen] = useState<boolean>(false);
  const [studentInfo, setStudentInfo] = useState<{
    name: string;
    matricNumber: string;
    department: string;
    level: string;
  }>({
    name: 'Amina Ibrahim',
    matricNumber: 'CU/2024/0142',
    department: 'Computer Science',
    level: '300 Level',
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch('/api/student/dashboard?studentProfileId=f0000000-0000-0000-0000-000000000001');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          if (d.student) {
            setStudentInfo({
              name: d.student.name || 'Amina Ibrahim',
              matricNumber: d.student.matricNumber || 'CU/2024/0142',
              department: d.student.department || 'Computer Science',
              level: d.student.level || '300 Level',
            });
          }
          if (d.financial) {
            setBalance(Number(d.financial.balance));
            setTotalAllocated(Number(d.financial.totalAllocated));
            setTotalConsumed(Number(d.financial.totalConsumed));
          }
          setActiveOrder(d.activeOrder || null);
          setRecentOrders(d.recentOrders || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch student dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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
      cafeteriaName: order.cafeteriaName || 'Main Campus Cafeteria',
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
      cafeteriaName: order.cafeteriaName || 'Main Campus Cafeteria',
      cafeteriaId: order.cafeteriaId || 'c0000000-0000-0000-0000-000000000001',
    });
    setIsQrOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 sm:pb-12">
      <Header roleName="Student" userName={studentInfo.name} matricNumber={studentInfo.matricNumber} />

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-5 space-y-6">
        {/* Authoritative Balance Card */}
        <BalanceCard
          balance={balance}
          totalAllocated={totalAllocated}
          totalConsumed={totalConsumed}
          isFeedingActive={true}
          matricNumber={studentInfo.matricNumber}
          studentName={studentInfo.name}
        />

        {/* Active Order Pickup Notification Banner */}
        {activeOrder && (
          <div className="rounded-3xl p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
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
                        ? 'bg-emerald-600 text-white animate-bounce'
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
                    ? 'Your meal is packed and waiting at Main Campus Cafeteria counter! Present your pass below.'
                    : activeOrder.status === 'PREPARING'
                    ? 'The cafeteria kitchen is actively preparing your order.'
                    : 'Order confirmed and queued in cafeteria order system.'}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-600">Pickup Pass:</span>
                  <span className="font-mono font-black text-sm text-brand-900 bg-white/80 px-2 py-0.5 rounded-lg border border-amber-300">
                    {activeOrder.pickupCode}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleOpenQr(activeOrder)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-brand-900 text-white text-xs font-bold hover:bg-brand-800 transition-colors shadow-md"
              >
                <QrCode className="w-4 h-4 text-gold-400" />
                Pickup QR
              </button>
              <button
                onClick={() => handleOpenReceipt(activeOrder)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-white text-slate-800 text-xs font-bold border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Receipt className="w-4 h-4 text-slate-500" />
                Receipt
              </button>
            </div>
          </div>
        )}

        {/* Quick Nav Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/student/menu"
            className="p-4 rounded-3xl bg-white border border-slate-200 hover:border-brand-500 hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Pre-Order Food</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Today&apos;s menu</p>
            </div>
          </Link>

          <Link
            href="/student/orders"
            className="p-4 rounded-3xl bg-white border border-slate-200 hover:border-brand-500 hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">My Orders</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Active & past orders</p>
            </div>
          </Link>

          <Link
            href="/student/transactions"
            className="p-4 rounded-3xl bg-white border border-slate-200 hover:border-brand-500 hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Transaction History</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Balance & spending history</p>
            </div>
          </Link>

          <Link
            href="/student/account"
            className="p-4 rounded-3xl bg-white border border-slate-200 hover:border-brand-500 hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">My Profile</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Feeding eligibility</p>
            </div>
          </Link>
        </div>

        {/* Recent Orders List */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Recent Orders</h3>
              <p className="text-xs text-slate-500">Live order state & financial receipt trail</p>
            </div>
            <Link
              href="/student/orders"
              className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 flex items-center justify-center text-slate-400 gap-2 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-600" />
              <span>Loading live order history...</span>
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              <p>No recent orders found. Pre-order your meal to get started!</p>
              <Link
                href="/student/menu"
                className="mt-3 inline-block font-bold text-brand-600 hover:underline"
              >
                Browse Cafeteria Menu →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentOrders.slice(0, 4).map((order) => {
                const statusColors: Record<string, string> = {
                  PLACED: 'bg-slate-100 text-slate-700 border-slate-200',
                  ACCEPTED: 'bg-blue-50 text-blue-700 border-blue-200',
                  PREPARING: 'bg-amber-50 text-amber-700 border-amber-200',
                  READY: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
                  RECEIVED: 'bg-slate-100 text-slate-600 border-slate-200',
                  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
                };

                const orderNum = order.orderNumber || order.order_number;
                const totalAmt = Number(order.totalAmount || order.total_amount);
                const placedDate = order.placedAt || order.placed_at;
                const itemsList = order.items || order.order_items || [];

                return (
                  <div key={order.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {orderNum}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            statusColors[order.status] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 truncate mt-1">
                        {itemsList.map((i: any) => `${i.itemName || i.item_name} (x${i.quantity})`).join(', ') || 'Cafeteria Meal Items'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {placedDate ? formatLagosDate(placedDate) : 'Today'}
                      </p>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                      <span className="font-extrabold text-sm text-slate-900 font-mono">
                        {formatNaira(totalAmt)}
                      </span>
                      <button
                        onClick={() => handleOpenReceipt(order)}
                        className="text-[11px] font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1 bg-brand-50 px-2 py-1 rounded-lg transition-colors"
                      >
                        <Receipt className="w-3 h-3" />
                        Receipt
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Receipts & Pickup QR Modals */}
      <ReceiptModal
        order={selectedReceiptOrder}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />

      <PickupQrModal
        order={selectedQrOrder}
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
      />

      <BottomNav />
    </div>
  );
}
