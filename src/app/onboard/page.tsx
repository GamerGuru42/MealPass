'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  const [password, setPassword] = useState('');
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
          userFullName: fullName.trim(),
          userEmail: email.trim(),
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800">
      {/* Top Banner */}
      <header className="bg-university-navy text-white py-4 px-6 shadow-md border-b border-university-accent/30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-university-accent flex items-center justify-center font-bold text-university-navy text-xl shadow">
              MP
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg leading-tight">MealPass</h1>
              <p className="text-xs text-slate-300">Cosmopolitan University · Operator Portal</p>
            </div>
          </div>
          <span className="text-xs bg-university-accent/20 text-university-accent font-semibold px-2.5 py-1 rounded-full border border-university-accent/30">
            Official Onboarding
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {successResult ? (
          <div className="bg-white rounded-2xl shadow-xl border border-emerald-200 p-8 text-center animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Onboarding Complete!</h2>
            <p className="text-sm text-slate-600 mb-6">{successResult.message}</p>
            <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-200 mb-6 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Assigned Role:</span>
                <span className="font-bold text-university-navy">{successResult.data?.role}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Platform:</span>
                <span className="font-bold text-slate-700">Cosmopolitan University MealPass</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Audit Status:</span>
                <span className="text-emerald-700 font-bold">Verified in Permanent Record</span>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-2 text-xs text-slate-500">
              <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span>Redirecting to your Cafeteria Dashboard...</span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
            <div className="mb-6">
              <div className="inline-flex items-center space-x-2 bg-amber-50 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full border border-amber-200 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Single-Use Operator Invitation</span>
              </div>
              <h2 className="text-2xl font-bold font-heading text-slate-900">Operator Activation</h2>
              <p className="text-sm text-slate-600 mt-1">
                Welcome to MealPass. Please enter or confirm your university invitation token to activate your operator credentials.
              </p>
            </div>

            {/* Token Input (if not already verified) */}
            {!invitation && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Invitation Code or Secure Token
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="e.g. INV-1730419200000-XXXXX"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-university-navy font-mono"
                    />
                    <button
                      type="button"
                      disabled={verifying || !token.trim()}
                      onClick={() => verifyToken(token)}
                      className="bg-university-navy hover:bg-university-navy/90 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
                    >
                      {verifying ? 'Verifying...' : 'Validate'}
                    </button>
                  </div>
                </div>

                {verifyError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{verifyError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Verified Invitation Details */}
            {invitation && (
              <form onSubmit={handleAccept} className="space-y-5 animate-fade-in">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Role</span>
                    <span className="inline-flex items-center space-x-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                      <Lock className="w-3 h-3" />
                      <span>{invitation.role}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Campus / Outlet</span>
                    <span className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>{invitation.cafeteriaName || 'Main Campus (Alma House)'}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Invited By</span>
                    <span className="text-xs font-medium text-slate-700">{invitation.invitedByName || 'Administrator'}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Legal Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Margaret Okonkwo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-university-navy font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Registered Email Address
                    </label>
                    <input
                      type="email"
                      readOnly
                      value={email}
                      className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-600 font-mono"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Email address is tied to this single-use university invitation.
                    </p>
                  </div>
                </div>

                {errorMessage && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-university-navy hover:bg-university-navy/90 text-white py-3 rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Activating Operator Profile...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-university-accent" />
                      <span>Confirm & Activate Operator Profile</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <Link href="/login" className="hover:text-university-navy underline">
                Already registered? Sign In
              </Link>
              <span>Powered by NextGen Technologies</span>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-500">
        © 2026 Cosmopolitan University · MealPass Digital Feeding Platform
      </footer>
    </div>
  );
}

export default function OperatorOnboardingPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500">
          Loading operator activation portal...
        </div>
      }
    >
      <OperatorOnboardingContent />
    </React.Suspense>
  );
}

