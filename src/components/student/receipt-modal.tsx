'use client';

import React from 'react';
import { CosmopolitanCrest } from '@/components/shared/logo';
import { formatNaira, formatLagosDateOnly, formatLagosTimeOnly } from '@/lib/utils';
import { X, CheckCircle2, Download } from 'lucide-react';

export interface ReceiptOrder {
  id: string;
  orderNumber: string;
  studentName: string;
  matricNumber: string;
  cafeteriaName: string;
  status: string;
  totalAmount: number;
  pickupCode: string;
  placedAt: string;
  items: Array<{
    id?: string;
    itemName: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }>;
}

interface ReceiptModalProps {
  order: ReceiptOrder | null;
  ledgerEntry?: {
    id: string;
    runningBalance: number;
    amount: number;
  } | null;
  previousBalance?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptModal({
  order,
  ledgerEntry,
  previousBalance,
  isOpen,
  onClose,
}: ReceiptModalProps) {
  // Keyboard accessibility: Escape closes receipt
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const orderDate = new Date(order.placedAt);
  const formattedDate = formatLagosDateOnly(orderDate);
  const formattedTime = formatLagosTimeOnly(orderDate);

  const deducted = order.totalAmount;
  const newBal = ledgerEntry
    ? ledgerEntry.runningBalance
    : (previousBalance !== undefined ? previousBalance - deducted : 0.0);
  const prevBal = previousBalance !== undefined
    ? previousBalance
    : (ledgerEntry ? ledgerEntry.runningBalance + ledgerEntry.amount : newBal + deducted);
  const txId = ledgerEntry?.id || `TX-${order.orderNumber}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-brand-900 text-white border-b border-brand-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span id="receipt-title" className="font-bold text-sm tracking-wide">
              Official Digital Receipt
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close receipt"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Slip Content */}
        <div className="p-6 sm:p-7 max-h-[80vh] overflow-y-auto space-y-5 text-slate-900 font-sans">
          {/* Institution Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300">
            <div className="flex justify-center mb-2">
              <CosmopolitanCrest className="w-12 h-12" />
            </div>
            <h2 className="font-serif font-black text-brand-900 text-base tracking-wider uppercase">
              Cosmopolitan University
            </h2>
            <p className="font-black text-brand-600 text-lg tracking-tight">MealPass</p>
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mt-0.5">
              Official Feeding Transaction
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Digital Feeding & Cafeteria Platform
            </p>
          </div>

          {/* Transaction Metadata Grid */}
          <div className="grid grid-cols-2 gap-y-2 text-xs border-b border-dashed border-slate-300 pb-4">
            <div>
              <span className="text-slate-400 block font-medium">Transaction ID</span>
              <span className="font-mono font-bold text-slate-800 text-[11px] break-all">
                {txId}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Order ID</span>
              <span className="font-mono font-bold text-brand-600 text-[11px]">
                {order.orderNumber}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Student Name</span>
              <span className="font-semibold text-slate-800">{order.studentName}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Matric Number</span>
              <span className="font-mono font-semibold text-slate-800">{order.matricNumber}</span>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Date</span>
              <span className="text-slate-700">{formattedDate}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Exact Time</span>
              <span className="text-slate-700">{formattedTime}</span>
            </div>

            <div className="col-span-2 pt-1">
              <span className="text-slate-400 block font-medium">Cafeteria</span>
              <span className="font-semibold text-slate-800">{order.cafeteriaName}</span>
            </div>
          </div>

          {/* Items Purchased List */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <span>Items</span>
              <span>Unit & Subtotal</span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {order.items.map((item, idx) => (
                <div key={item.id || idx} className="py-2 flex items-start justify-between">
                  <div className="pr-4">
                    <p className="font-semibold text-slate-900">{item.itemName}</p>
                    <p className="text-[11px] text-slate-500">
                      Qty: {item.quantity} × {formatNaira(item.unitPrice)}
                    </p>
                  </div>
                  <span className="font-bold text-slate-900">{formatNaira(item.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Authoritative Financial Reconciliation */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span>Order Total</span>
              <span className="font-bold text-slate-900 text-sm">{formatNaira(order.totalAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 text-[11px]">
              <span>Previous Meal Balance</span>
              <span className="font-mono">{formatNaira(prevBal)}</span>
            </div>
            <div className="flex justify-between items-center text-rose-600 font-semibold text-[11px]">
              <span>Amount Deducted</span>
              <span className="font-mono">- {formatNaira(deducted)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-bold text-emerald-700">
              <span>New Meal Balance</span>
              <span className="text-sm font-mono">{formatNaira(newBal)}</span>
            </div>
          </div>

          {/* Payment Method & Transaction Status */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase text-slate-400 font-bold block">
                Payment Method
              </span>
              <span className="font-bold text-brand-800">MealPass Balance</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] uppercase text-emerald-600 font-bold block">
                Transaction Status
              </span>
              <span className="font-bold text-emerald-800">Successful</span>
            </div>
          </div>

          {/* Verification Code Box */}
          <div className="text-center p-3 rounded-xl bg-brand-50 border border-brand-200">
            <span className="text-[10px] uppercase font-bold text-brand-700 tracking-wider block">
              Pickup Code
            </span>
            <span className="font-mono font-black text-xl tracking-widest text-brand-900">
              {order.pickupCode}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Present code or QR at counter for verification
            </span>
          </div>

          {/* Footer Attribution */}
          <div className="text-center pt-2">
            <p className="text-[10px] text-slate-400">
              This digital receipt is an authoritative financial record.
            </p>
            <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
              Powered by NextGen Technologies
            </p>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            Save / Print
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
