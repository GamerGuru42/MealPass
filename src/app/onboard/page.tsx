'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CosmopolitanCrest, NextGenAttribution } from '@/components/shared/logo';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  UtensilsCrossed,
  UserCheck,
  Sparkles,
  Lock,
  Building2,
  ChefHat,
  Smartphone,
} from 'lucide-react';

function OperatorOnboardingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [token, setToken] = useState(searchParams.get('token') || '');
  const [invitation, setInvitation] = useState<any | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Acceptance Form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-verify if token is in query param
  useEffect(() => {
    const queryToken = searchParams.get('token');
    if (queryToken) {
      setToken(queryToken);
      verifyToken(queryToken);
    }
  }, [searchParams]);

  const verifyToken = async (tok: string) => {
    if (!tok.trim()) return;
    setVerifying(true);
    setVerifyError('');
    try {
      const res = await fetch(`/api/auth/invitations/accept?token=${encodeURIComponent(tok.trim())}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setInvitation(json.data);
        setEmail(json.data.email || '');
      } else {
        setVerifyError(json.error || 'Invalid or expired invitation token.');
        setInvitation(null);
      }
    } catch {
      setVerifyError('Network error connecting to university verification server.');
      setInvitation(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage('Please provide your full official legal name.');
      return;
    }
    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          fullName: fullName.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessResult(json);
        setTimeout(() => {
          router.push('/cafeteria');
        }, 2500);
      } else {
        setErrorMessage(json.error || 'Failed to complete operator onboarding.');
      }
    } catch {
      setErrorMessage('Network error completing onboarding. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] flex flex-col justify-between text-slate-800 antialiased">
      {/* Top University Brand Navbar */}
      <header className="bg-[#091527] text-white py-4 px-4 sm:px-8 shadow-md border-b border-slate-800">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <CosmopolitanCrest className="w-10 h-10" />
            <div>
              <p className="font-serif text-[10px] sm:text-xs font-bold tracking-widest text-amber-300 uppercase leading-none">
                COSMOPOLITAN UNIVERSITY
              </p>
              <h1 className="text-lg font-black tracking-tight text-white mt-0.5">
                Meal<span className="text-amber-400">Pass</span>
              </h1>
            </div>
          </Link>
          <span className="text-xs bg-amber-400/10 text-amber-300 font-bold px-3 py-1 rounded-full border border-amber-400/20">
            Staff Activation Portal
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center my-6 sm:my-10">
        {successResult ? (
          <div className="bg-white rounded-3xl shadow-xl border border-emerald-200 p-8 sm:p-10 text-center animate-in fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Activation Complete!</h2>
            <p className="text-xs sm:text-sm text-slate-600 mb-6">{successResult.message}</p>
            <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-200 mb-6 space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Assigned Operational Role:</span>
                <span className="font-bold text-blue-900">{successResult.data?.role}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Campus Dining Authority:</span>
                <span className="font-bold text-slate-800">Cosmopolitan University MealPass</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Cryptographic Audit:</span>
                <span className="text-emerald-700 font-bold">Verified in Immutable Database</span>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-2 text-xs text-slate-500 font-medium">
              <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span>Redirecting to your Cafeteria Operations Board...</span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 sm:p-9 space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-200 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Single-Use Administrative Invitation</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Operator Activation
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Welcome to MealPass. Enter or confirm your single-use university invitation token to activate your cafeteria staff profile.
              </p>
            </div>

            {/* Token Input (if not already verified) */}
            {!invitation && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Invitation Code or Secure Token
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. INV-1730419200000-XXXXX"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-mono"
                    />
                    <button
                      type="button"
                      disabled={verifying || !token.trim()}
                      onClick={() => verifyToken(token)}
                      className="bg-[#091527] hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
                    >
                      {verifying ? 'Verifying...' : 'Validate'}
                    </button>
                  </div>
                </div>

                {verifyError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-2xl flex items-center gap-2.5 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{verifyError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Verified Invitation Details */}
            {invitation && (
              <form onSubmit={handleAccept} className="space-y-5 animate-in fade-in">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Assigned Role
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                      <Lock className="w-3 h-3" />
                      <span>{invitation.role}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Campus Outlet
                    </span>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>{invitation.cafeteriaName || 'Main Campus (Alma House)'}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Invited By
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {invitation.invitedByName || 'Cosmopolitan University Bursary'}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Legal Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Margaret Okonkwo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Registered Email Address
                    </label>
                    <input
                      type="email"
                      readOnly
                      value={email}
                      className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-600 font-mono"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Email address is cryptographically bound to this single-use administrative invitation.
                    </p>
                  </div>
                </div>

                {errorMessage && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-2xl flex items-center gap-2.5 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 py-3.5 rounded-2xl font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Activating Profile in Database...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-slate-950" />
                      <span>Confirm & Activate Operator Profile</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <Link href="/cafeteria" className="text-blue-600 font-bold hover:underline">
                Return to Cafeteria Board
              </Link>
              <NextGenAttribution />
            </div>
          </div>
        )}
      </main>

      {/* Institutional Footer */}
      <footer className="text-center py-5 border-t border-slate-200/80 bg-white text-xs text-slate-500">
        <p>Cosmopolitan University • MealPass Digital Dining Platform</p>
      </footer>
    </div>
  );
}

export default function OperatorOnboardingPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#f4f6fb] flex items-center justify-center text-xs text-slate-500 font-bold">
          Loading operator activation portal...
        </div>
      }
    >
      <OperatorOnboardingContent />
    </React.Suspense>
  );
}
