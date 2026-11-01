'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    };

    // Initial check
    if (!navigator.onLine) {
      setIsOffline(true);
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`w-full py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 transition-colors z-50 sticky top-0 ${
        isOffline
          ? 'bg-amber-600 text-white shadow-md'
          : 'bg-emerald-600 text-white shadow-sm'
      }`}
    >
      {isOffline ? (
        <>
          <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>You&apos;re offline. Connect to the internet to place or update MealPass orders.</span>
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Connection restored. Online financial operations active.</span>
        </>
      )}
    </div>
  );
}

