'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StudentShell } from '@/components/layout/student-shell';
import { ReceiptModal, ReceiptOrder } from '@/components/student/receipt-modal';
import { PickupQrModal, QrOrder } from '@/components/student/pickup-qr-modal';
import { useRealtimeOrders } from '@/lib/supabase/realtime';
import { formatNaira, formatLagosDate } from '@/lib/utils';
import {
  Search,
  Filter,
  Receipt,
  QrCode,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';

export default function StudentOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<ReceiptOrder | null>(null);
  const [selectedQrOrder, setSelectedQrOrder] = useState<QrOrder | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/orders?studentProfileId=f0000000-0000-0000-0000-000000000001');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setOrders(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Realtime order updates
  useRealtimeOrders({
    studentProfileId: 'f0000000-0000-0000-0000-000000000001',
    onOrderInserted: fetchOrders,
    onOrderUpdated: fetchOrders,
  });

  const filteredOrders = orders.filter((order) => {
    const status = order.status;
    let matchesFilter = true;
    if (statusFilter === 'ACTIVE') {
      matchesFilter = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(status);
    } else if (statusFilter === 'COMPLETED') {
      matchesFilter = status === 'RECEIVED';
    } else if (statusFilter === 'CANCELLED') {
      matchesFilter = status === 'CANCELLED';
    }

    const orderNum = order.orderNumber || order.order_number || '';
    const pickupCode = order.pickupCode || order.pickup_code || '';
    const items = order.items || order.order_items || [];
    const matchesSearch =
      orderNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pickupCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      items.some((i: any) =>
        (i.itemName || i.item_name || '').toLowerCase().includes(searchQuery.toLowerCase())
      );

    return matchesFilter && matchesSearch;
  });

  const handleOpenReceipt = (order: any) => {
    setSelectedReceiptOrder({
      id: order.id,
      orderNumber: order.orderNumber || order.order_number,
      studentName: 'Amina Ibrahim',
      matricNumber: 'CU/2024/0142',
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

  const statusColors: Record<string, string> = {
    PLACED: 'bg-slate-100 text-slate-800 border-slate-300',
    ACCEPTED: 'bg-blue-50 text-blue-700 border-blue-300',
    PREPARING: 'bg-amber-50 text-amber-800 border-amber-300',
    READY: 'bg-emerald-100 text-emerald-800 border-emerald-400 font-black animate-pulse',
    RECEIVED: 'bg-slate-100 text-slate-600 border-slate-200',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const statusSteps = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'RECEIVED'];

  return (
    <StudentShell studentName="Benny Iduoku-Ben" matricNumber="CU/2024/0142">
      <div className="space-y-5">
        {/* Page Title */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              Order Lifecycle Tracking
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            My Feeding Orders
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time tracking of kitchen preparation, counter pickup codes, and digital receipts.
          </p>

          {/* Search & Status Filters */}
          <div className="mt-5 space-y-3 pt-4 border-t border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Search by order number, pickup code, or dish name"
                placeholder="Search by order number, pickup code, or dish name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {[
                { id: 'ALL', label: 'All Orders' },
                { id: 'ACTIVE', label: 'Active (In Progress)' },
                { id: 'COMPLETED', label: 'Collected' },
                { id: 'CANCELLED', label: 'Cancelled / Refunded' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[40px] ${
                    statusFilter === tab.id
                      ? 'bg-brand-900 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-600" />
            <span className="text-xs font-medium">Fetching orders from Supabase...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-500">
            <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No orders found</p>
            <p className="text-xs text-slate-400 mt-1">Place an order from the cafeteria menu to track it here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const orderNum = order.orderNumber || order.order_number;
              const pickupCode = order.pickupCode || order.pickup_code;
              const totalAmt = Number(order.totalAmount || order.total_amount);
              const placedDate = order.placedAt || order.placed_at;
              const items = order.items || order.order_items || [];
              const isCancelled = order.status === 'CANCELLED';
              const currentStepIndex = statusSteps.indexOf(order.status);

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4 hover:border-slate-300 transition-colors"
                >
                  {/* Order Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-base text-slate-900">
                          {orderNum}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                            statusColors[order.status] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {placedDate ? formatLagosDate(placedDate) : 'Today'} • {order.cafeteriaName || 'Main Campus Cafeteria'}
                      </p>
                    </div>

                    {/* Prominent Pickup Code */}
                    <div className="flex items-center gap-3">
                      <div className="bg-brand-50 border border-brand-200 rounded-xl px-3 py-1.5 text-center">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">
                          Pickup Code
                        </span>
                        <span className="font-mono font-black text-base text-brand-900">
                          {pickupCode}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">Total Paid</span>
                        <span className="font-mono font-black text-base text-slate-900">
                          {formatNaira(totalAmt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Status Progression Stepper */}
                  {!isCancelled && (
                    <div className="py-2 space-y-1">
                      <div className="sr-only" aria-live="polite">
                        Current order status: {order.status}
                      </div>
                      <div className="flex items-center justify-between relative" aria-label={`Order progression: ${order.status}`}>
                        {/* Connecting track line */}
                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-100 z-0" />
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-brand-500 z-0 transition-all duration-300"
                          style={{
                            width: `${Math.max(0, (currentStepIndex / (statusSteps.length - 1)) * 100)}%`,
                          }}
                        />

                        {statusSteps.map((step, idx) => {
                          const isDone = idx <= currentStepIndex;
                          const isCurrent = idx === currentStepIndex;

                          return (
                            <div key={step} className="flex flex-col items-center relative z-10">
                              <div
                                aria-label={`Step ${idx + 1}: ${step} - ${isCurrent ? 'Current' : isDone ? 'Completed' : 'Upcoming'}`}
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                  isCurrent
                                    ? 'bg-brand-600 text-white ring-4 ring-brand-100 scale-110 shadow-sm'
                                    : isDone
                                    ? 'bg-brand-500 text-white'
                                    : 'bg-white border-2 border-slate-200 text-slate-400'
                                }`}
                              >
                                {isDone ? '✓' : idx + 1}
                              </div>
                              <span
                                className={`text-[10px] mt-1 font-semibold uppercase hidden sm:block ${
                                  isCurrent ? 'text-brand-900 font-bold' : isDone ? 'text-slate-700' : 'text-slate-400'
                                }`}
                              >
                                {step}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Mobile current status text */}
                      <div className="sm:hidden text-center pt-1">
                        <span className="text-[11px] font-bold text-brand-900 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                          Current Status: {order.status}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Cancelled Notice */}
                  {isCancelled && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Order Cancelled & Refunded</span>
                        <p className="mt-0.5">
                          Reason: {order.cancellationReason || order.cancellation_reason || 'Kitchen adjustment'}.
                          Funds were automatically credited back to your MealPass balance.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Line Items List */}
                  <div className="bg-slate-50/70 rounded-2xl p-3.5 space-y-2 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Dishes Ordered
                    </span>
                    <div className="divide-y divide-slate-100">
                      {items.map((it: any, idx: number) => (
                        <div key={it.id || idx} className="py-1.5 flex items-center justify-between">
                          <span className="text-slate-800 font-medium">
                            {it.itemName || it.item_name} × {it.quantity}
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            {formatNaira(Number(it.subtotal || it.unitPrice * it.quantity || 0))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-1 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenQr(order)}
                      className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold transition-colors shadow-sm"
                    >
                      <QrCode className="w-3.5 h-3.5 text-gold-400" />
                      Pickup QR Pass
                    </button>
                    <button
                      onClick={() => handleOpenReceipt(order)}
                      className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                    >
                      <Receipt className="w-3.5 h-3.5 text-slate-500" />
                      Digital Receipt
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
    </StudentShell>
  );
}
