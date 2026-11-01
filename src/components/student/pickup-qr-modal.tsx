'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, QrCode } from 'lucide-react';

export interface QrOrder {
  orderNumber: string;
  pickupCode: string;
  pickupQrToken: string;
  cafeteriaName: string;
  cafeteriaId?: string;
}

interface PickupQrModalProps {
  order: QrOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PickupQrModal({ order, isOpen, onClose }: PickupQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (order?.pickupQrToken) {
      // Secure QR payload: ONLY contains secure token and order reference
      const securePayload = JSON.stringify({
        token: order.pickupQrToken,
        orderNumber: order.orderNumber,
        cafeteriaId: order.cafeteriaId || 'c0000000-0000-0000-0000-000000000001',
      });

      QRCode.toDataURL(securePayload, {
        width: 260,
        margin: 2,
        color: {
          dark: '#1e3a5f',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch(() => setQrDataUrl(''));
    }
  }, [order]);

  // Keyboard navigation: Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
    >
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 text-center">
        {/* Header */}
        <div className="px-5 py-4 bg-brand-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-gold-400" />
            <span id="qr-modal-title" className="font-bold text-sm">
              Cafeteria Pickup Pass
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Cosmopolitan University
            </span>
            <h3 className="font-mono font-bold text-lg text-brand-900">{order.orderNumber}</h3>
            <p className="text-xs text-slate-500">{order.cafeteriaName}</p>
          </div>

          {/* Secure QR Code Frame */}
          <div className="p-4 bg-slate-50 rounded-2xl border-2 border-brand-100 inline-block shadow-inner">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Secure Cafeteria Pickup QR Code"
                className="w-48 h-48 mx-auto rounded-lg"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center bg-slate-200 rounded-lg text-slate-400 text-xs">
                Generating Secure Token...
              </div>
            )}
          </div>

          {/* Accessible Alternative: High-Contrast Pickup Code */}
          <div className="bg-brand-50 rounded-xl p-3 border border-brand-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Alternative Pickup Code
            </span>
            <span className="font-mono font-extrabold text-2xl tracking-widest text-brand-900">
              {order.pickupCode}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              Read this 6-character code to the cafeteria cashier if QR scanning is unavailable.
            </p>
          </div>

          {/* Instructions */}
          <p className="text-[11px] text-slate-400 italic">
            Tokens are single-use and expire upon food receipt verification.
          </p>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
