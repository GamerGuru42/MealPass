'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CafeteriaShell } from '@/components/layout/cafeteria-shell';
import {
  Users,
  UserPlus,
  Mail,
  Building2,
  Lock,
  Clock,
  CheckCircle2,
  Copy,
  AlertTriangle,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export default function CafeteriaStaffManagementPage() {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Invitation Form
  const [email, setEmail] = useState('');
  const [selectedCafeteriaId, setSelectedCafeteriaId] = useState('c0000000-0000-0000-0000-000000000001');
  const [expiresInHours, setExpiresInHours] = useState('48');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const fetchInvitations = async () => {
    try {
      const res = await fetch('/api/auth/invitations', {
        headers: { 'x-user-role': 'CAFETERIA_HEAD' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setInvitations(json.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to load invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setFormError('Please provide a valid staff email address.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/auth/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'CAFETERIA_HEAD',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          role: 'CAFETERIA_STAFF', // Strictly locked to CAFETERIA_STAFF
          cafeteriaId: selectedCafeteriaId,
          expiresInHours: Number(expiresInHours),
          invitedByName: 'Madam Margaret Okonkwo (Cafeteria Head)',
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMessage(`Invitation successfully generated for ${email}!`);
        setEmail('');
        fetchInvitations();
      } else {
        setFormError(json.error || 'Failed to generate invitation.');
      }
    } catch {
      setFormError('Network error issuing invitation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyInviteLink = (tok: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const link = `${origin}/onboard?token=${tok}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(tok);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  return (
    <CafeteriaShell
      staffRole="CAFETERIA_HEAD"
      staffName="Madam Margaret Okonkwo"
      selectedCafeteriaId={selectedCafeteriaId}
      onSelectCafeteria={setSelectedCafeteriaId}
    >
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-xs text-slate-500 mb-4">
          <Link href="/cafeteria" className="hover:text-university-navy flex items-center space-x-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kitchen & Counter Dashboard</span>
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-bold">Cafeteria Team & Staff Invitations</span>
        </div>

        {/* Page Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full mb-2">
              <Users className="w-3.5 h-3.5" />
              <span>Role-Gated Staff Access</span>
            </div>
            <h1 className="text-2xl font-bold font-heading text-slate-900">Cafeteria Staff Team Management</h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Invite kitchen cooks, line assistants, and counter cashiers. All invitations are single-use, strictly locked to the <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-university-navy">CAFETERIA_STAFF</code> role, and audited in the university log.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-right">
            <span className="text-[11px] text-slate-500 block uppercase font-bold tracking-wider">Authorized Manager</span>
            <span className="text-xs font-bold text-university-navy">Madam Margaret Okonkwo (Cafeteria Head)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Issue Invitation Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-university-accent" />
              <span>Invite New Staff Member</span>
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Enter the staff member&apos;s email address to generate a secure, expiring onboarding link.
            </p>

            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl mb-4 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl mb-4 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Staff Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="staff.name@gmail.com or university email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-university-navy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Campus / Outlet
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <select
                    value={selectedCafeteriaId}
                    onChange={(e) => setSelectedCafeteriaId(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-university-navy"
                  >
                    <option value="c0000000-0000-0000-0000-000000000001">Main Campus (Alma House)</option>
                    <option value="c0000000-0000-0000-0000-000000000002">Kado Campus Dining</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Authorized Role (Strictly Locked)
                </label>
                <div className="flex items-center space-x-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-bold text-slate-700">CAFETERIA_STAFF (Kitchen & Counter Fulfillment)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Role is strictly bound to kitchen fulfillment. Cannot be elevated by staff.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Invitation Validity Window
                </label>
                <select
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-university-navy"
                >
                  <option value="24">24 Hours (1 Day)</option>
                  <option value="48">48 Hours (2 Days - Recommended)</option>
                  <option value="72">72 Hours (3 Days)</option>
                  <option value="168">7 Days</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-university-navy hover:bg-university-navy/90 text-white py-2.5 rounded-xl font-bold text-xs shadow transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating Single-Use Invitation...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-university-accent" />
                    <span>Issue Single-Use Invitation</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Active Team & Issued Invitations */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Staff Members */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center space-x-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Active Cafeteria Personnel</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Staff members currently authorized to prepare meals and confirm counter pickups.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Madam Margaret Okonkwo</h4>
                    <span className="text-[11px] text-slate-500">m.okonkwo@cosmopolitan.edu.ng</span>
                    <div className="mt-1 flex items-center space-x-2">
                      <span className="text-[10px] bg-university-navy text-white font-bold px-2 py-0.5 rounded-full">
                        CAFETERIA_HEAD
                      </span>
                      <span className="text-[10px] text-slate-600 font-medium">Main & Kado Scope</span>
                    </div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Active" />
                </div>

                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Tunde Adeyemi</h4>
                    <span className="text-[11px] text-slate-500">tunde.kitchen@gmail.com</span>
                    <div className="mt-1 flex items-center space-x-2">
                      <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded-full">
                        CAFETERIA_STAFF
                      </span>
                      <span className="text-[10px] text-slate-600 font-medium">Main Campus</span>
                    </div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Active" />
                </div>
              </div>
            </div>

            {/* Issued Invitations Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Issued Onboarding Invitations</h3>
                  <p className="text-xs text-slate-500">
                    Single-use invitation links awaiting onboarding or already verified.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchInvitations}
                  className="text-xs font-bold text-university-navy hover:text-university-navy/80 flex items-center space-x-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {loading ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-university-navy" />
                  <span>Loading invitations audit record...</span>
                </div>
              ) : invitations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No invitations issued yet. Use the form on the left to invite kitchen staff.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Staff Email</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Expires</th>
                        <th className="py-3 px-4 text-center">Onboarding Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invitations.map((inv) => (
                        <tr key={inv.id || inv.invitationToken} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            {inv.status === 'PENDING' && (
                              <span className="inline-flex items-center space-x-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3" />
                                <span>PENDING</span>
                              </span>
                            )}
                            {inv.status === 'ACCEPTED' && (
                              <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>ACCEPTED</span>
                              </span>
                            )}
                            {inv.status === 'EXPIRED' && (
                              <span className="inline-flex items-center space-x-1 bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                <span>EXPIRED</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-900">{inv.email}</td>
                          <td className="py-3 px-4 font-bold text-slate-700">{inv.role}</td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {new Date(inv.expiresAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {inv.status === 'PENDING' ? (
                              <button
                                type="button"
                                onClick={() => copyInviteLink(inv.invitationToken)}
                                className="inline-flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition"
                              >
                                <Copy className="w-3 h-3" />
                                <span>{copiedToken === inv.invitationToken ? 'Copied!' : 'Copy Link'}</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400">Single-use completed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </CafeteriaShell>
  );
}

