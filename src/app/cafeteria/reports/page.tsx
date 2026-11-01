'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { formatNaira, formatLagosDate, formatLagosTimeOnly } from '@/lib/utils';
import {
  BarChart3,
  TrendingUp,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Utensils,
  Receipt,
  RefreshCw,
} from 'lucide-react';

export default function CafeteriaReportsPage() {
  const [selectedCafeteriaId, setSelectedCafeteriaId] = useState('c0000000-0000-0000-0000-000000000001');
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cafeteria/reports?cafeteriaId=${selectedCafeteriaId}`, {
        headers: { 'x-user-role': 'CAFETERIA_HEAD' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setReport(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to load operational report:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCafeteriaId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-xs text-slate-500 mb-4">
          <Link href="/cafeteria" className="hover:text-university-navy flex items-center space-x-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kitchen & Counter Dashboard</span>
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-bold">Operational Reports & Sales Summaries</span>
        </div>

        {/* Page Header with Campus Selector */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-university-navy/10 text-university-navy text-xs font-bold px-3 py-1 rounded-full mb-2">
              <BarChart3 className="w-3.5 h-3.5 text-university-navy" />
              <span>Campus Operational Telemetry</span>
            </div>
            <h1 className="text-2xl font-bold font-heading text-slate-900">Cafeteria Sales & Operations</h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Automatic daily fulfillment metrics, meal sales breakdown, and audit transaction records computed in real time.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Campus Switcher Pill */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedCafeteriaId('c0000000-0000-0000-0000-000000000001')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                  selectedCafeteriaId === 'c0000000-0000-0000-0000-000000000001'
                    ? 'bg-university-navy text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Main Campus (Alma House)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCafeteriaId('c0000000-0000-0000-0000-000000000002')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                  selectedCafeteriaId === 'c0000000-0000-0000-0000-000000000002'
                    ? 'bg-university-navy text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Kado Campus</span>
              </button>
            </div>

            <button
              type="button"
              onClick={fetchReport}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 p-2 rounded-xl transition"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-university-navy' : ''}`} />
            </button>
          </div>
        </div>

        {/* Operational Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Orders Today</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {report ? report.totalOrdersToday : 0}
            </span>
            <span className="text-[11px] text-slate-500">Orders placed on {report?.cafeteriaName}</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-sm">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Completed & Released</span>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">
              {report ? report.completedOrdersToday : 0}
            </span>
            <span className="text-[11px] text-emerald-600">Verified at counter pickup</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-rose-200 shadow-sm">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">Cancelled / Refunded</span>
            <span className="text-2xl font-black text-rose-700 mt-1 block">
              {report ? report.cancelledOrdersToday : 0}
            </span>
            <span className="text-[11px] text-rose-600">Compensating refund issued</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-university-accent/30 shadow-sm">
            <span className="text-xs font-bold text-university-navy uppercase tracking-wider block">Total Sales Value</span>
            <span className="text-2xl font-black text-university-navy mt-1 block">
              {formatNaira(report ? report.totalRevenueToday : 0)}
            </span>
            <span className="text-[11px] text-slate-500">Gross completed meal orders</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Selling Menu Items */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-university-accent" />
              <span>Top Demanded Dishes</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Dishes with highest preparation volume today at {report?.cafeteriaName}.
            </p>

            {report?.popularItems && report.popularItems.length > 0 ? (
              <div className="space-y-3">
                {report.popularItems.map((dish: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{dish.name}</h4>
                        <span className="text-[11px] text-slate-500">{dish.quantity} portions served</span>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-university-navy">{formatNaira(dish.revenue)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                No meal sales recorded for this shift yet.
              </div>
            )}
          </div>

          {/* Recent Orders Log */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Recent Order References</h3>
                <p className="text-xs text-slate-500">
                  Audit trail of operational order lifecycle states.
                </p>
              </div>
              <span className="text-xs text-slate-500 font-medium">Campus: {report?.cafeteriaName}</span>
            </div>

            {report?.recentOrders && report.recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.recentOrders.map((ord: any) => (
                      <tr key={ord.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{ord.orderNumber}</td>
                        <td className="py-3 px-4 font-medium text-slate-800">{ord.studentName}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              ord.status === 'RECEIVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'READY'
                                ? 'bg-amber-100 text-amber-800'
                                : ord.status === 'CANCELLED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span>{ord.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                          {formatLagosTimeOnly(ord.placedAt)}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-university-navy">
                          {formatNaira(ord.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                No recent orders on record for this campus.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

