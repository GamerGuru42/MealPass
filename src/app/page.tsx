'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CosmopolitanCrest } from '@/components/shared/logo';
import {
  UtensilsCrossed,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lock,
  User,
  ChefHat,
  Sparkles,
  KeyRound,
  Building2,
  HelpCircle,
  Loader2,
  GraduationCap,
} from 'lucide-react';

interface StudentRecord {
  id: string;
  name: string;
  matricNumber: string;
  department: string;
  faculty: string;
  level: string;
  email: string;
  balance: number;
}

export default function GeneralQrLoginPage() {
  const router = useRouter();

  // Active Tab: Student MealPass vs Cafeteria Management
  const [activeTab, setActiveTab] = useState<'STUDENT' | 'STAFF'>('STUDENT');

  // Student Flow Step: 'ENTER_MATRIC' | 'ACTIVATION' | 'ENTER_PASSWORD' | 'NOT_FOUND'
  const [studentStep, setStudentStep] = useState<'ENTER_MATRIC' | 'ACTIVATION' | 'ENTER_PASSWORD' | 'NOT_FOUND'>('ENTER_MATRIC');
  const [matricInput, setMatricInput] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [activationPassword, setActivationPassword] = useState('');
  const [activationConfirmPassword, setActivationConfirmPassword] = useState('');
  const [activationPin, setActivationPin] = useState('');
  const [verifiedStudentRecord, setVerifiedStudentRecord] = useState<StudentRecord | null>(null);

  // Staff Login State
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffCampus, setStaffCampus] = useState('c0000000-0000-0000-0000-000000000001');

  // Loading & Error States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showQrInfoModal, setShowQrInfoModal] = useState(false);

  // 1. Step 1: Student Matric Lookup
  const handleLookupMatric = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const matric = matricInput.trim();
    if (!matric) {
      setErrorMessage('Please enter your university matriculation number.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/auth/student-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricNumber: matric }),
      });

      const json = await res.json();

      if (!res.ok || !json.found) {
        setStudentStep('NOT_FOUND');
        setErrorMessage(
          json.error ||
            `No feeding record was found for ${matric}. Please visit Madam at the Cafeteria Desk for assistance.`
        );
      } else {
        setVerifiedStudentRecord(json.student);
        if (json.isActivated) {
          // Returning student: proceed to password entry
          setStudentStep('ENTER_PASSWORD');
          setStudentPassword('');
        } else {
          // New student: proceed to first-time secure activation
          setStudentStep('ACTIVATION');
          setActivationPassword('');
          setActivationConfirmPassword('');
          setActivationPin('');
        }
      }
    } catch {
      setErrorMessage('Network error connecting to campus feeding server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Step 2A: Returning Student Login
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentPassword.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricNumber: verifiedStudentRecord?.matricNumber || matricInput,
          password: studentPassword,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMessage(`Welcome back, ${json.student.name}! Opening your MealPass...`);
        setTimeout(() => {
          router.push('/student');
        }, 600);
      } else {
        setErrorMessage(json.error || 'Incorrect password. Please verify and try again.');
      }
    } catch {
      setErrorMessage('Login failed. Please verify your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Step 2B: First-Time Account Activation
  const handleStudentActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationPassword || activationPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (activationPassword !== activationConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }
    if (!/^\d{4}$/.test(activationPin)) {
      setErrorMessage('Dining PIN must be exactly 4 numeric digits (e.g. 1234).');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/student-activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricNumber: verifiedStudentRecord?.matricNumber || matricInput,
          department: verifiedStudentRecord?.department,
          password: activationPassword,
          pin: activationPin,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMessage(`Account activated successfully! Welcome to MealPass, ${json.student.name}.`);
        setTimeout(() => {
          router.push('/student');
        }, 800);
      } else {
        setErrorMessage(json.error || 'Activation failed. Please check your inputs or visit the cafeteria.');
      }
    } catch {
      setErrorMessage('Network error during activation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Staff / Madam Login
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffEmail.trim() || !staffPassword.trim()) {
      setErrorMessage('Please provide both staff email/username and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrUsername: staffEmail,
          password: staffPassword,
          cafeteriaId: staffCampus,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMessage(`Authenticated as ${json.user.name}. Opening cafeteria console...`);
        setTimeout(() => {
          router.push('/cafeteria');
        }, 600);
      } else {
        setErrorMessage(json.error || 'Staff authentication failed. Please verify credentials.');
      }
    } catch {
      setErrorMessage('Network error connecting to staff console.');
    } finally {
      setLoading(false);
    }
  };

  // Demo Autofill Helper
  const applyDemoIdentity = (matric: string) => {
    setActiveTab('STUDENT');
    setMatricInput(matric);
    setStudentStep('ENTER_MATRIC');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const applyStaffDemo = (email: string) => {
    setActiveTab('STAFF');
    setStaffEmail(email);
    setStaffPassword('mealpass123');
    setErrorMessage('');
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen bg-[#071326] text-slate-100 flex flex-col justify-between antialiased selection:bg-amber-400 selection:text-slate-950 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* =========================================================================
          TOP INSTITUTIONAL BRAND HEADER
      ========================================================================== */}
      <header className="border-b border-slate-800/80 bg-[#091527]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3.5 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CosmopolitanCrest className="w-10 h-10 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-xs font-bold tracking-widest text-amber-300 uppercase font-serif leading-none">
                COSMOPOLITAN UNIVERSITY
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Meal<span className="text-amber-400">Pass</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400/10 text-amber-300 border border-amber-400/20 px-2 py-0.5 rounded-full">
                  Official Feeding Access
                </span>
              </div>
            </div>
          </div>

          {/* General QR Info Button */}
          <button
            onClick={() => setShowQrInfoModal(true)}
            className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
          >
            <QrCode className="w-4 h-4 text-amber-400" />
            <span>General Cafeteria QR</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          MAIN AUTHENTICATION CONTAINER
      ========================================================================== */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col justify-center">
        {/* Campus General QR Badge */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
            <QrCode className="w-4 h-4 text-amber-400" />
            <span>Cafeteria General QR Entry Point</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Digital Dining & Feeding Access
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Scan the cafeteria counter QR code or enter your matriculation number below to access your daily meal pass.
          </p>
        </div>

        {/* Authentication Card */}
        <div className="bg-[#0b1b36] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-950/40 relative">
          {/* Tab Switcher: Student vs Cafeteria Management */}
          <div className="flex items-center p-1 rounded-2xl bg-black/40 border border-slate-800 mb-6">
            <button
              onClick={() => {
                setActiveTab('STUDENT');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'STUDENT'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student MealPass</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('STAFF');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'STAFF'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ChefHat className="w-4 h-4" />
              <span>Cafeteria Staff (Madam)</span>
            </button>
          </div>

          {/* Alert / Feedback Messages */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* =====================================================================
              STUDENT FLOW (Matric -> Lookup -> Activate / Login)
          ====================================================================== */}
          {activeTab === 'STUDENT' && (
            <div className="space-y-5">
              {/* STAGE 1: ENTER MATRICULATION NUMBER */}
              {studentStep === 'ENTER_MATRIC' && (
                <form onSubmit={handleLookupMatric} className="space-y-4">
                  <div className="space-y-2 text-left">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Enter Matriculation Number</span>
                      <span className="text-[11px] font-normal text-slate-400 font-mono">e.g. CU/2024/0142</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={matricInput}
                        onChange={(e) => setMatricInput(e.target.value.toUpperCase())}
                        placeholder="CU/2024/XXXX"
                        disabled={loading}
                        autoFocus
                        className="w-full bg-[#08152b] border border-slate-700 rounded-2xl px-4 py-3.5 text-base font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all uppercase"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Your feeding account is linked to your university record as imported by Madam at the cafeteria desk.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !matricInput.trim()}
                    className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-sm shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Feeding Records...</span>
                      </>
                    ) : (
                      <>
                        <span>Find My MealPass</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STAGE 2A: RETURNING STUDENT LOGIN (ENTER PASSWORD) */}
              {studentStep === 'ENTER_PASSWORD' && verifiedStudentRecord && (
                <form onSubmit={handleStudentLogin} className="space-y-4 text-left">
                  {/* Verified Student Identification Badge */}
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{verifiedStudentRecord.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {verifiedStudentRecord.matricNumber} • {verifiedStudentRecord.department}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Active Account
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Enter Password</span>
                      <button
                        type="button"
                        onClick={() => {
                          setStudentStep('ENTER_MATRIC');
                          setStudentPassword('');
                        }}
                        className="text-[11px] font-semibold text-blue-400 hover:underline"
                      >
                        Not you? Change matric
                      </button>
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={loading}
                        autoFocus
                        className="w-full bg-[#08152b] border border-slate-700 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Demo password for seeded students is <span className="font-mono text-amber-300">mealpass123</span>
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !studentPassword}
                    className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-sm shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In to MealPass</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STAGE 2B: FIRST-TIME STUDENT ACTIVATION */}
              {studentStep === 'ACTIVATION' && verifiedStudentRecord && (
                <form onSubmit={handleStudentActivate} className="space-y-4 text-left">
                  {/* Imported Record Found Banner */}
                  <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                        First-Time Account Activation
                      </span>
                    </div>
                    <p className="text-xs text-slate-200">
                      Welcome, <span className="font-bold text-white">{verifiedStudentRecord.name}</span>! Your feeding
                      record is in the system. Complete activation to set your access password and counter dining PIN.
                    </p>
                    <div className="text-[11px] font-mono text-slate-400">
                      {verifiedStudentRecord.matricNumber} • {verifiedStudentRecord.department} ({verifiedStudentRecord.level})
                    </div>
                  </div>

                  {/* Create Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Create Access Password</label>
                    <input
                      type="password"
                      value={activationPassword}
                      onChange={(e) => setActivationPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      disabled={loading}
                      className="w-full bg-[#08152b] border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Confirm Password</label>
                    <input
                      type="password"
                      value={activationConfirmPassword}
                      onChange={(e) => setActivationConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      disabled={loading}
                      className="w-full bg-[#08152b] border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* 4-Digit Dining PIN */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Set 4-Digit Dining PIN</span>
                      <span className="text-[10px] text-slate-400 font-mono">Used at Cafeteria Counter</span>
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={activationPin}
                      onChange={(e) => setActivationPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="4 Digits (e.g. 1234)"
                      disabled={loading}
                      className="w-full bg-[#08152b] border border-slate-700 rounded-2xl px-4 py-3 text-sm font-mono tracking-widest text-center text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setStudentStep('ENTER_MATRIC')}
                      className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !activationPassword || !activationPin}
                      className="flex-1 py-3 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 transition-all"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Activating...</span>
                        </>
                      ) : (
                        <>
                          <span>Activate My MealPass</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STAGE 2C: RECORD NOT FOUND IN IMPORTED SHEETS */}
              {studentStep === 'NOT_FOUND' && (
                <div className="space-y-4 text-left">
                  <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3">
                    <div className="flex items-center gap-2.5 text-rose-400">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <h3 className="text-sm font-bold text-rose-300">No Feeding Record Found</h3>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Matriculation number <span className="font-mono font-bold text-white">{matricInput}</span> is not
                      yet listed in the imported cafeteria feeding sheets.
                    </p>
                    <div className="p-3 rounded-xl bg-black/30 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                      <p className="font-bold text-white">How to Resolve:</p>
                      <p>
                        Please visit Madam at the Cafeteria Counter (Main Campus - Alma House or Kado Campus) with your
                        university ID or fee receipt to verify your feeding entitlement and have your record added.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setStudentStep('ENTER_MATRIC');
                      setErrorMessage('');
                    }}
                    className="w-full py-3.5 px-6 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <span>Try Another Matric Number</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              CAFETERIA MANAGEMENT (MADAM & STAFF LOGIN)
          ====================================================================== */}
          {activeTab === 'STAFF' && (
            <form onSubmit={handleStaffLogin} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Staff Email or Username</label>
                <input
                  type="text"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="madam@cosmopolitan.edu.ng or staff"
                  disabled={loading}
                  className="w-full bg-[#08152b] border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Password</label>
                <input
                  type="password"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full bg-[#08152b] border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Campus Assignment</label>
                <select
                  value={staffCampus}
                  onChange={(e) => setStaffCampus(e.target.value)}
                  disabled={loading}
                  className="w-full bg-[#08152b] border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="c0000000-0000-0000-0000-000000000001">Main Campus (Alma House)</option>
                  <option value="c0000000-0000-0000-0000-000000000002">Kado Campus</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading || !staffEmail || !staffPassword}
                className="w-full py-3.5 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 transition-all mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Open Cafeteria Management</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Identities Footer for Testing & Evaluation */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-2">
              Instant Demo Identities (Click to Test):
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => applyDemoIdentity('CU/2024/0142')}
                className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-300 text-[11px] font-mono transition-colors"
              >
                CU/2024/0142 (Amina - Active)
              </button>
              <button
                type="button"
                onClick={() => applyDemoIdentity('CU/2024/0088')}
                className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-300 text-[11px] font-mono transition-colors"
              >
                CU/2024/0088 (Samuel - Active)
              </button>
              <button
                type="button"
                onClick={() => applyDemoIdentity('CU/2024/0305')}
                className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-[11px] font-mono transition-colors"
              >
                CU/2024/0305 (Unregistered Demo)
              </button>
              <button
                type="button"
                onClick={() => applyStaffDemo('madam@cosmopolitan.edu.ng')}
                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 text-[11px] font-semibold transition-colors"
              >
                Madam Okonkwo (Head)
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* =========================================================================
          CAMPUS GENERAL MEALPASS QR INFORMATION MODAL
      ========================================================================== */}
      {showQrInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0b1b36] border border-slate-700 rounded-3xl p-6 sm:p-7 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 mx-auto flex items-center justify-center">
              <QrCode className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-black text-white">General Campus QR Code</h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              This general MealPass QR code is printed on standees at the cafeterias across Main Campus (Alma House) and
              Kado Campus.
            </p>

            <div className="p-3 rounded-xl bg-black/40 border border-slate-800 text-[11px] text-slate-400 text-left space-y-1">
              <p className="text-white font-bold">How students dine:</p>
              <p>1. Scan general QR code with phone camera.</p>
              <p>2. Enter your university matriculation number.</p>
              <p>3. Activate once or enter your password to view meal balance and order.</p>
            </div>

            <button
              onClick={() => setShowQrInfoModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          FOOTER WITH OFFICIAL SYSTEM NOTICE
      ========================================================================== */}
      <footer className="border-t border-slate-800/80 py-4 px-4 text-center text-xs text-slate-500">
        <p>© 2024–2026 Cosmopolitan University • MealPass Digital Dining System</p>
        <p className="text-[10px] text-slate-600 mt-0.5">
          Main Campus (Alma House) & Kado Campus • Powered by NextGen Technologies
        </p>
      </footer>
    </div>
  );
}
