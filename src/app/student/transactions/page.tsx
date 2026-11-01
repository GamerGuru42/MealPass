'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StudentShell } from '@/components/layout/student-shell';
import { ReceiptModal, ReceiptOrder } from '@/components/student/receipt-modal';
import { formatNaira, formatLagosDate } from '@/lib/utils';
import {
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  History,
  RotateCcw,
  RefreshCw,
  Receipt,
  Download,
} from 'lucide-react';

export default function StudentTransactionsPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [balance, setBalance] = useState<number>(48701);
  const [totalAllocated, setTotalAllocated] = useState<number>(50000);
  const [totalSpent, setTotalSpent] = useState<number>(1299);
  const [totalRefunded, setTotalRefunded] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<ReceiptOrder | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/transactions?studentProfileId=f0000000-0000-0000-0000-000000000001');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if (Array.isArray(json.data)) {
            setEntries(json.data);
          }
          if (json.summary) {
            setBalance(Number(json.summary.currentBalance || 48701));
            setTotalAllocated(Number(json.summary.totalAllocated || 50000));
            setTotalSpent(Number(json.summary.totalSpent || 1299));
            setTotalRefunded(Number(json.summary.totalRefunded || 0));
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filteredEntries = entries.filter((entry) => {
    const txType = entry.transactionType || entry.transaction_type;
    const matchesType = typeFilter === 'ALL' || txType === typeFilter;
    const desc = entry.description || '';
    const ref = entry.referenceId || entry.reference_id || '';
    const matchesSearch =
      desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.id.toLowerCase().includes(searchQuery.toLowerCase());

    const createdAt = entry.createdAt || entry.created_at;
    const entryTime = new Date(createdAt).getTime();
    const matchesStart = !startDate || entryTime >= new Date(startDate).getTime();
    const matchesEnd = !endDate || entryTime <= new Date(endDate).setHours(23, 59, 59, 999);

    return matchesType && matchesSearch && matchesStart && matchesEnd;
  });

  const handleOpenReceiptFromRef = (entry: any) => {
    const orderNum = entry.referenceId || entry.reference_id || `ORD-${entry.id.substring(0, 8)}`;
    setSelectedReceiptOrder({
      id: entry.id,
      orderNumber: orderNum,
      studentName: 'Amina Ibrahim',
      matricNumber: 'CU/2024/0142',
      cafeteriaName: 'Main Campus Cafeteria',
      status: 'RECEIVED',
      totalAmount: Number(entry.amount),
      pickupCode: orderNum.slice(-4),
      placedAt: entry.createdAt || entry.created_at || new Date().toISOString(),
      items: [
        {
          itemName: entry.description || 'Cafeteria Meal Deduction',
          unitPrice: Number(entry.amount),
          quantity: 1,
          subtotal: Number(entry.amount),
        },
      ],
    });
    setIsReceiptOpen(true);
  };

  return (
    <StudentShell studentName="Benny Iduoku-Ben" matricNumber="CU/2024/0142">
      <div className="space-y-5">
        {/* Authoritative Ledger Summary Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Bursary Feeding Scheme
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Verified Records
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Transaction History
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                View your complete feeding history: bursary allocations, cafeteria purchases, and refunds.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-brand-900 text-white shrink-0 sm:text-right">
              <span className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold block">
                Current Meal Balance
              </span>
              <span className="text-2xl sm:text-3xl font-black text-gold-400 font-mono">
                {formatNaira(balance)}
              </span>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 text-center sm:text-left">
              <span className="text-[10px] font-bold uppercase text-emerald-800 block">Total Allocated</span>
              <span className="text-sm sm:text-base font-extrabold text-emerald-900 font-mono mt-0.5 block">
                {formatNaira(totalAllocated)}
              </span>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 text-center sm:text-left">
              <span className="text-[10px] font-bold uppercase text-amber-800 block">Total Spent</span>
              <span className="text-sm sm:text-base font-extrabold text-amber-900 font-mono mt-0.5 block">
                {formatNaira(totalSpent)}
              </span>
            </div>

            <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3 text-center sm:text-left">
              <span className="text-[10px] font-bold uppercase text-blue-800 block">Total Refunded</span>
              <span className="text-sm sm:text-base font-extrabold text-blue-900 font-mono mt-0.5 block">
                {formatNaira(totalRefunded)}
              </span>
            </div>
          </div>

          {/* Search & Transaction Type Filters */}
          <div className="pt-3 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Search transactions by reference ID, description, or amount"
                placeholder="Search transactions by reference ID, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {[
                { id: 'ALL', label: 'All Transactions' },
                { id: 'MEAL_DEDUCTION', label: 'Cafeteria Spending' },
                { id: 'ALLOCATION', label: 'Allocations' },
                { id: 'REFUND', label: 'Refunds' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTypeFilter(tab.id)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[44px] flex items-center ${
                    typeFilter === tab.id
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

        {/* Transactions List */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-600" />
            <span className="text-xs font-medium">Retrieving transaction history...</span>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-500">
            <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No transactions found</p>
            <p className="text-xs text-slate-400 mt-1">No transactions match your selected filter.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Transaction & Description</span>
              <span>Amount & Balance</span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredEntries.map((entry) => {
                const txType = entry.transactionType || entry.transaction_type;
                const isDeduction = txType === 'MEAL_DEDUCTION';
                const isAllocation = txType === 'ALLOCATION';
                const isRefund = txType === 'REFUND';
                const amt = Number(entry.amount);
                const runBal = Number(entry.runningBalance || entry.running_balance);
                const ref = entry.referenceId || entry.reference_id;
                const createdAt = entry.createdAt || entry.created_at;

                return (
                  <div key={entry.id} className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isDeduction
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : isAllocation
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : 'bg-blue-50 text-blue-600 border border-blue-200'
                        }`}
                      >
                        {isDeduction ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : isAllocation ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-slate-900">
                            {entry.description || txType}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              isDeduction
                                ? 'bg-rose-100 text-rose-800'
                                : isAllocation
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {txType}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap">
                          <span>{createdAt ? formatLagosDate(createdAt) : 'Recent'}</span>
                          {ref && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-slate-600">Ref: {ref}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`font-mono font-black text-sm sm:text-base block ${
                          isDeduction ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {isDeduction ? `- ${formatNaira(amt)}` : `+ ${formatNaira(amt)}`}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                        Bal: {formatNaira(runBal)}
                      </span>

                      {isDeduction && (
                        <button
                          onClick={() => handleOpenReceiptFromRef(entry)}
                          className="mt-1 text-[10px] font-bold text-brand-600 hover:text-brand-800 inline-flex items-center gap-1"
                        >
                          <Receipt className="w-3 h-3" />
                          View Receipt
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Receipts Modal */}
      <ReceiptModal
        order={selectedReceiptOrder}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />
    </StudentShell>
  );
}
