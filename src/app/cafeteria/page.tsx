'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CafeteriaShell } from '@/components/layout/cafeteria-shell';
import { useRealtimeOrders } from '@/lib/supabase/realtime';
import { formatNaira, formatLagosDate, formatLagosTimeOnly } from '@/lib/utils';
import { OrderStatus } from '@/types';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  QrCode,
  Search,
  Filter,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  Flame,
  CheckCheck,
  PackageCheck,
  Utensils,
  RefreshCw,
  XCircle,
  ShieldCheck,
  UserCheck,
  FileText,
  BadgeAlert,
  SlidersHorizontal,
  Users,
  BarChart3,
} from 'lucide-react';

export default function CafeteriaQueuePage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'NEW' | 'PREPARING' | 'READY' | 'COMPLETED' | 'ALL'>('NEW');

  // Role Switcher: Cafeteria Staff vs Cafeteria Head (Madam)
  const [staffRole, setStaffRole] = useState<'CAFETERIA_STAFF' | 'CAFETERIA_HEAD'>('CAFETERIA_STAFF');
  const staffName = staffRole === 'CAFETERIA_HEAD' ? 'Madam Margaret Okonkwo (Head)' : 'Tunde Adeyemi (Kitchen Staff)';

  // Operational Metrics
  const [metrics, setMetrics] = useState({
    newOrders: 0,
    preparing: 0,
    ready: 0,
    completedToday: 0,
    cancelledToday: 0,
    totalOrdersToday: 0,
    totalValueToday: 0,
  });

  // Verify Pickup Counter State
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Manual Override Dialog (Head/Madam Only)
  const [manualOrder, setManualOrder] = useState<any | null>(null);
  const [manualReason, setManualReason] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState('');

  // Cancel Order Dialog
  const [cancelOrder, setCancelOrder] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Action submission states (orderId -> boolean)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Campus Selection (Two-Campus Foundation)
  const [selectedCafeteriaId, setSelectedCafeteriaId] = useState<string>('c0000000-0000-0000-0000-000000000001');
  const cafeteriaId = selectedCafeteriaId;
  const campusName = selectedCafeteriaId === 'c0000000-0000-0000-0000-000000000001' ? 'Main Campus (Alma House)' : 'Kado Campus';

  // Fetch live queue from server
  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`/api/cafeteria/queue?cafeteriaId=${cafeteriaId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setOrders(json.data?.orders || (Array.isArray(json.data) ? json.data : json.orders || []));
          if (json.data?.metrics || json.metrics) {
            setMetrics(json.data?.metrics || json.metrics);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch cafeteria queue:', err);
    } finally {
      setLoading(false);
    }
  }, [cafeteriaId]);

  useEffect(() => {
    fetchQueue();
    // 10s polling backup in addition to Realtime
    const interval = setInterval(fetchQueue, 10000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  // Live Supabase Realtime subscription
  useRealtimeOrders({
    cafeteriaId,
    onOrderInserted: fetchQueue,
    onOrderUpdated: fetchQueue,
  });

  // Strict Lifecycle Transition Handler
  const handleTransition = async (orderId: string, nextStatus: OrderStatus) => {
    setActionLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          reason: `Transitioned to ${nextStatus} by ${staffName}`,
          isManual: false,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || 'Failed to update order status');
      } else {
        await fetchQueue();
      }
    } catch (err) {
      alert('Network error while updating order status');
    } finally {
      setActionLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // Pickup Verification Handler
  const handleVerifyPickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyInput.trim()) return;

    setVerifyLoading(true);
    setVerifyMessage(null);

    try {
      const res = await fetch('/api/cafeteria/verify-pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchKey: verifyInput.trim(),
          cafeteriaId,
          method: 'COUNTER',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setVerifyMessage({ text: json.error || 'Pickup verification failed', type: 'error' });
      } else {
        setVerifyMessage({ text: `✓ ${json.message}`, type: 'success' });
        setVerifyInput('');
        await fetchQueue();
      }
    } catch (err) {
      setVerifyMessage({ text: 'Network error during pickup verification', type: 'error' });
    } finally {
      setVerifyLoading(false);
    }
  };

  // Manual Override Handler
  const handleConfirmManualOverride = async () => {
    if (!manualOrder) return;
    if (manualReason.trim().length < 5) {
      setManualError('Please provide a detailed reason (at least 5 characters).');
      return;
    }

    setManualLoading(true);
    setManualError('');

    try {
      const res = await fetch('/api/cafeteria/manual-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: manualOrder.id,
          cafeteriaId,
          role: staffRole,
          authorizedBy: staffName,
          reason: manualReason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setManualError(json.error || 'Failed to execute manual override');
      } else {
        setManualOrder(null);
        setManualReason('');
        await fetchQueue();
      }
    } catch (err) {
      setManualError('Network error executing override');
    } finally {
      setManualLoading(false);
    }
  };

  // Cancel Order Handler
  const handleConfirmCancelOrder = async () => {
    if (!cancelOrder) return;
    if (!cancelReason.trim()) {
      setCancelError('A cancellation reason is required.');
      return;
    }

    setCancelLoading(true);
    setCancelError('');

    try {
      const res = await fetch(`/api/orders/${cancelOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          reason: cancelReason.trim(),
          isManual: false,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setCancelError(json.error || 'Failed to cancel order');
      } else {
        setCancelOrder(null);
        setCancelReason('');
        await fetchQueue();
      }
    } catch (err) {
      setCancelError('Network error cancelling order');
    } finally {
      setCancelLoading(false);
    }
  };

  // Filter orders by active queue tab
  const newOrders = orders.filter((o) => o.status === 'PLACED');
  const preparingOrders = orders.filter((o) => ['ACCEPTED', 'PREPARING'].includes(o.status));
  const readyOrders = orders.filter((o) => o.status === 'READY');
  const completedOrders = orders.filter((o) => ['RECEIVED', 'CANCELLED'].includes(o.status));

  let currentTabOrders = orders;
  if (activeTab === 'NEW') currentTabOrders = newOrders;
  else if (activeTab === 'PREPARING') currentTabOrders = preparingOrders;
  else if (activeTab === 'READY') currentTabOrders = readyOrders;
  else if (activeTab === 'COMPLETED') currentTabOrders = completedOrders;

  const filteredOrders = currentTabOrders.filter((o) => {
    const s = searchQuery.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(s) ||
      o.pickupCode.toLowerCase().includes(s) ||
      o.studentName.toLowerCase().includes(s) ||
      o.items.some((i: any) => i.itemName.toLowerCase().includes(s))
    );
  });

  const calculateElapsedMinutes = (placedAt: string) => {
    const diff = Math.floor((Date.now() - new Date(placedAt).getTime()) / 60000);
    if (diff < 1) return 'Just now';
    return `${diff}m ago`;
  };

  return (
    <CafeteriaShell
      staffRole={staffRole}
      staffName={staffName}
      campusName={campusName}
      selectedCafeteriaId={selectedCafeteriaId}
      onSelectCafeteria={setSelectedCafeteriaId}
      onRoleToggle={setStaffRole}
    >
      <div className="space-y-6">
        {/* Quick Refresh & Queue Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Live Kitchen Order Fulfillment
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time WebSocket queue for {campusName}. Accept incoming orders, advance to preparing, and verify pickup codes.
            </p>
          </div>
          <button
            onClick={fetchQueue}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all w-fit"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Board</span>
          </button>
        </div>
        {/* Counter Pickup Verification Section */}
        <section aria-labelledby="pickup-counter-title" className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-brand-600" />
              <h2 id="pickup-counter-title" className="font-black text-sm text-slate-900">
                Counter Pickup Verification
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">
              Supports optical QR barcode scanners & manual 6-character code
            </span>
          </div>

          <form onSubmit={handleVerifyPickup} className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                aria-label="Scan student QR pass or enter 6-character code"
                placeholder="Scan student QR pass or enter 6-character code (e.g. CU-0B5A)..."
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                className="w-full pl-4 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-inner"
              />
              {verifyInput && (
                <button
                  type="button"
                  onClick={() => setVerifyInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={verifyLoading || !verifyInput.trim()}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-brand-900 hover:bg-brand-800 disabled:bg-slate-300 text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 min-h-[48px]"
            >
              {verifyLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-gold-400" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-gold-400" />
                  <span>Verify & Release Food</span>
                </>
              )}
            </button>
          </form>

          {/* Verification Notification Banner */}
          {verifyMessage && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                verifyMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border border-rose-300'
              }`}
            >
              {verifyMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="flex-1">{verifyMessage.text}</span>
              <button
                onClick={() => setVerifyMessage(null)}
                className="text-slate-400 hover:text-slate-600 ml-2"
              >
                ✕
              </button>
            </div>
          )}
        </section>

        {/* Operational Metrics Cards */}
        <section aria-labelledby="metrics-title">
          <h2 id="metrics-title" className="sr-only">Today&apos;s Operational Metrics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">New Orders</span>
              <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">{metrics.newOrders}</span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">In Kitchen</span>
              <span className="text-2xl font-black text-amber-700 font-mono mt-0.5 block">{metrics.preparing}</span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Ready for Pickup</span>
              <span className="text-2xl font-black text-emerald-700 font-mono mt-0.5 block">{metrics.ready}</span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Completed Today</span>
              <span className="text-2xl font-black text-blue-700 font-mono mt-0.5 block">{metrics.completedToday}</span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-brand-900 rounded-2xl p-4 text-white shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Total Value (Today)</span>
              <span className="text-xl font-black text-gold-400 font-mono mt-0.5 block">{formatNaira(metrics.totalValueToday)}</span>
            </div>
          </div>
        </section>

        {/* Live Queue Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'NEW', label: `New (${newOrders.length})` },
              { id: 'PREPARING', label: `Cooking (${preparingOrders.length})` },
              { id: 'READY', label: `Ready for Pickup (${readyOrders.length})` },
              { id: 'COMPLETED', label: `Completed (${completedOrders.length})` },
              { id: 'ALL', label: `All (${orders.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-colors min-h-[44px] ${
                  activeTab === tab.id
                    ? 'bg-brand-900 text-white shadow-md'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by order #, code, or dish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs"
            />
          </div>
        </div>

        {/* Live Queue Orders Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-600" />
            <span className="text-xs font-semibold">Synchronizing cafeteria order queue...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 space-y-2">
            <Utensils className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-sm text-slate-700">No orders in this queue group</p>
            <p className="text-xs text-slate-400">Incoming student orders will appear here automatically via Realtime sync.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => {
              const isReady = order.status === 'READY';
              const isPlaced = order.status === 'PLACED';
              const isAccepted = order.status === 'ACCEPTED';
              const isPreparing = order.status === 'PREPARING';
              const isReceived = order.status === 'RECEIVED';
              const isCancelled = order.status === 'CANCELLED';
              const isLoadingThis = actionLoading[order.id];

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-3xl border p-5 shadow-sm flex flex-col justify-between transition-all ${
                    isReady
                      ? 'border-2 border-emerald-400 ring-2 ring-emerald-100 bg-emerald-50/20'
                      : isPlaced
                      ? 'border-2 border-brand-300'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Order Top Metadata */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-black text-sm text-slate-900">
                            {order.orderNumber}
                          </span>
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                              isReady
                                ? 'bg-emerald-600 text-white animate-bounce'
                                : isPreparing
                                ? 'bg-amber-600 text-white'
                                : isPlaced
                                ? 'bg-brand-600 text-white'
                                : isReceived
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isReady ? 'READY FOR COUNTER' : order.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{calculateElapsedMinutes(order.placedAt)}</span>
                          <span>•</span>
                          <span className="font-semibold">{order.studentName}</span>
                        </div>
                      </div>

                      {/* Prominent Pickup Code */}
                      <div className="bg-brand-50 border border-brand-200 rounded-xl px-2.5 py-1 text-center shrink-0">
                        <span className="text-[8px] uppercase font-bold text-slate-400 block">Pass Code</span>
                        <span className="font-mono font-black text-sm text-brand-900 tracking-wider">
                          {order.pickupCode}
                        </span>
                      </div>
                    </div>

                    {/* Special Kitchen Note */}
                    {order.notes && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                        <span className="font-bold block text-[10px] uppercase text-amber-800">Student Note:</span>
                        <p className="italic mt-0.5">{order.notes}</p>
                      </div>
                    )}

                    {/* Order Items List */}
                    <div className="bg-slate-50 rounded-2xl p-3 space-y-1.5 text-xs">
                      {order.items.map((it: any) => (
                        <div key={it.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-white border border-slate-200 font-bold text-[11px] text-brand-900 flex items-center justify-center">
                              {it.quantity}
                            </span>
                            <span className="font-bold text-slate-800">{it.itemName}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-700">
                            {formatNaira(it.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Total & Timestamps */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <span className="text-slate-400 font-medium">Order Total</span>
                      <span className="font-mono font-extrabold text-sm text-slate-900">
                        {formatNaira(order.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Operational Action Controls */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    {/* Placed -> Accept */}
                    {isPlaced && (
                      <button
                        onClick={() => handleTransition(order.id, 'ACCEPTED')}
                        disabled={isLoadingThis}
                        className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-black text-xs shadow-xs transition-colors min-h-[44px]"
                      >
                        {isLoadingThis ? 'Updating...' : 'Accept Order'}
                      </button>
                    )}

                    {/* Accepted -> Preparing */}
                    {isAccepted && (
                      <button
                        onClick={() => handleTransition(order.id, 'PREPARING')}
                        disabled={isLoadingThis}
                        className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-black text-xs shadow-xs transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
                      >
                        <Flame className="w-4 h-4 text-gold-300" />
                        <span>{isLoadingThis ? 'Updating...' : 'Start Cooking / Prep'}</span>
                      </button>
                    )}

                    {/* Preparing -> Ready */}
                    {isPreparing && (
                      <button
                        onClick={() => handleTransition(order.id, 'READY')}
                        disabled={isLoadingThis}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-xs shadow-xs transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
                      >
                        <CheckCheck className="w-4 h-4 text-white" />
                        <span>{isLoadingThis ? 'Updating...' : 'Mark Ready for Pickup'}</span>
                      </button>
                    )}

                    {/* Ready -> Direct Counter Verification Trigger */}
                    {isReady && (
                      <div className="space-y-1.5">
                        <button
                          onClick={() => {
                            setVerifyInput(order.pickupCode);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="w-full py-2.5 px-4 rounded-xl bg-brand-900 hover:bg-brand-800 text-white font-black text-xs shadow-sm transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
                        >
                          <QrCode className="w-4 h-4 text-gold-400" />
                          <span>Verify Pickup Pass</span>
                        </button>

                        {/* Manual Override (Madam/Head only) */}
                        {staffRole === 'CAFETERIA_HEAD' && (
                          <button
                            onClick={() => {
                              setManualOrder(order);
                              setManualReason('');
                              setManualError('');
                            }}
                            className="w-full py-1.5 text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center justify-center gap-1 underline"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Manual Collection Override
                          </button>
                        )}
                      </div>
                    )}

                    {/* Cancellation Trigger for Unfulfilled Orders */}
                    {!isReceived && !isCancelled && (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => {
                            setCancelOrder(order);
                            setCancelReason('');
                            setCancelError('');
                          }}
                          className="text-[10px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          Cancel & Refund
                        </button>
                      </div>
                    )}

                    {/* Completed Order Notes */}
                    {isReceived && (
                      <div className="text-center py-1">
                        <span className="text-[11px] font-bold text-slate-500">
                          ✓ Collected at {order.receivedAt ? formatLagosTimeOnly(order.receivedAt) : 'Counter'}
                        </span>
                      </div>
                    )}

                    {isCancelled && (
                      <div className="text-center py-1">
                        <span className="text-[11px] font-bold text-rose-700">
                          Cancelled & Refunded to Student Ledger
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Override Confirmation Dialog (Head / Madam Only) */}
      {manualOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-900 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Manual Collection Override
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Authorized Cafeteria Head emergency collection protocol.
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold text-amber-800">Order:</span>
                <span className="font-mono font-bold">{manualOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-amber-800">Student:</span>
                <span className="font-bold">{manualOrder.studentName} ({manualOrder.matricNumber})</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-amber-800">Pass Code:</span>
                <span className="font-mono font-black">{manualOrder.pickupCode}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mandatory Operational Justification (min 5 characters) *
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Student phone battery depleted; verified identity with physical student ID card."
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
                className="w-full p-3 rounded-2xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
              />
              {manualError && (
                <p className="text-xs text-rose-600 font-bold mt-1">{manualError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setManualOrder(null)}
                disabled={manualLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmManualOverride}
                disabled={manualLoading || manualReason.trim().length < 5}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white shadow-md flex items-center gap-1.5"
              >
                {manualLoading ? 'Auditing...' : 'Confirm Override & Release'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Dialog */}
      {cancelOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-900 shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Cancel Order & Automatic Refund
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Funds will be automatically credited back to student ledger.
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-950 space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold text-rose-800">Order:</span>
                <span className="font-mono font-bold">{cancelOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-rose-800">Refund Amount:</span>
                <span className="font-mono font-black text-rose-900">{formatNaira(cancelOrder.totalAmount)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cancellation Reason *
              </label>
              <input
                type="text"
                placeholder="e.g. Dish ran out of stock in kitchen; kitchen closure"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-3 rounded-2xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500 font-sans"
              />
              {cancelError && (
                <p className="text-xs text-rose-600 font-bold mt-1">{cancelError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setCancelOrder(null)}
                disabled={cancelLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Dismiss
              </button>
              <button
                onClick={handleConfirmCancelOrder}
                disabled={cancelLoading || !cancelReason.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white shadow-md flex items-center gap-1.5"
              >
                {cancelLoading ? 'Refunding...' : 'Confirm Cancellation & Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </CafeteriaShell>
  );
}
