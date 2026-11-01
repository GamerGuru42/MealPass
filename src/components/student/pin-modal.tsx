'use client';

import React, { useState, useEffect } from 'react';
import { X, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { formatNaira } from '@/lib/utils';

interface PinModalProps {
  isOpen: boolean;
  orderTotal: number;
  currentBalance: number;
  onClose: () => void;
  onConfirm: (pin: string) => Promise<void>;
  isLoading?: boolean;
}

export function PinModal({
  isOpen,
  orderTotal,
  currentBalance,
  onClose,
  onConfirm,
  isLoading = false,
}: PinModalProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');

  const balanceAfterOrder = currentBalance - orderTotal;

  const handleDigitPress = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
      setError('');
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (typeof window !== 'undefined' && !navigator.onLine) {
      setError('You are offline. An active internet connection is required to authorize MealPass transactions.');
      return;
    }

    if (pin.length !== 4) {
      setError('Please enter your full 4-digit PIN');
      return;
    }

    try {
      setError('');
      await onConfirm(pin);
      setPin('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Transaction failed. Please check your PIN and balance.');
      }
    }
  };

  // Keyboard accessibility: handle physical keyboard digits, Backspace, Escape, and Enter
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading) return;
      if (e.key >= '0' && e.key <= '9') {
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && pin.length === 4) {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, isLoading]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-modal-title"
    >
      {/* Screen Reader Announcement */}
      <div className="sr-only" aria-live="polite">
        {pin.length === 0 ? 'PIN entry dialog opened. Enter 4 digits.' : `${pin.length} of 4 digits entered.`}
      </div>
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-brand-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-gold-400" />
            <span id="pin-modal-title" className="font-bold text-sm">
              Authorize Order Deduction
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Cancel order authorization"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Order Financial Summary (Prompt Section 5) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between items-center text-slate-500">
              <span>Current Meal Balance:</span>
              <span className="font-mono font-bold text-slate-700">{formatNaira(currentBalance)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-900 font-semibold">
              <span>Order Total:</span>
              <span className="font-mono font-extrabold text-brand-600 text-sm">
                {formatNaira(orderTotal)}
              </span>
            </div>
            {currentBalance >= orderTotal ? (
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-bold text-emerald-700">
                <span>Balance After Order:</span>
                <span className="font-mono text-sm">{formatNaira(balanceAfterOrder)}</span>
              </div>
            ) : (
              <div className="pt-2 border-t border-rose-200 flex justify-between items-center font-bold text-rose-700">
                <span>Shortfall:</span>
                <span className="font-mono text-sm">Short by {formatNaira(orderTotal - currentBalance)}</span>
              </div>
            )}
          </div>

          {/* PIN Input Display */}
          <div className="text-center py-1">
            <span className="text-xs text-slate-500 font-medium block mb-2">
              Enter your 4-digit MealPass PIN (Default: 1234)
            </span>
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((index) => {
                const isFilled = pin.length > index;
                return (
                  <div
                    key={index}
                    aria-label={`Digit ${index + 1} of 4: ${isFilled ? 'entered' : 'empty'}`}
                    className={`w-11 h-12 rounded-xl flex items-center justify-center text-xl font-bold border-2 transition-all ${
                      isFilled
                        ? 'border-brand-600 bg-brand-50 text-brand-900 shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-transparent'
                    }`}
                  >
                    {isFilled ? '●' : '○'}
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <div role="alert" aria-live="assertive" className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* Mobile Touch Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigitPress(digit)}
                disabled={isLoading || pin.length >= 4}
                aria-label={`Digit ${digit}`}
                className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-brand-100 text-slate-900 font-bold text-lg transition-colors flex items-center justify-center shadow-sm"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              disabled={isLoading || pin.length === 0}
              aria-label="Clear all entered digits"
              className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-xs transition-colors flex items-center justify-center"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleDigitPress('0')}
              disabled={isLoading || pin.length >= 4}
              aria-label="Digit 0"
              className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-brand-100 text-slate-900 font-bold text-lg transition-colors flex items-center justify-center shadow-sm"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading || pin.length === 0}
              aria-label="Delete last digit"
              className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center"
            >
              ⌫
            </button>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isLoading || pin.length !== 4}
            className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all ${
              pin.length === 4 && !isLoading
                ? 'bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <span>Authorizing & Deducting...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Confirm & Place Order</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

