'use client';

import React, { useState, useEffect } from 'react';
import { StudentShell } from '@/components/layout/student-shell';
import { CosmopolitanCrest } from '@/components/shared/logo';
import {
  User,
  ShieldCheck,
  Lock,
  Clock,
  HelpCircle,
  Smartphone,
  CheckCircle2,
  Calendar,
  Building,
  GraduationCap,
  Mail,
  Phone,
  Hash,
  ExternalLink,
  LogOut,
} from 'lucide-react';

export default function StudentAccountPage() {
  const [student, setStudent] = useState({
    name: 'Amina Ibrahim',
    matricNumber: 'CU/2024/0142',
    department: 'Computer Science',
    faculty: 'Faculty of Information Technology',
    level: '300 Level',
    email: 'amina.ibrahim@cosmopolitan.edu.ng',
    phone: '+234 812 345 6789',
    isFeedingActive: true,
    period: '2025/2026 First Semester',
    feedingAccountId: '10000000-0000-0000-0000-000000000001',
  });

  useEffect(() => {
    fetch('/api/student/dashboard?studentProfileId=f0000000-0000-0000-0000-000000000001')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.student) {
          const s = json.data.student;
          setStudent((prev) => ({
            ...prev,
            name: s.name || prev.name,
            matricNumber: s.matricNumber || prev.matricNumber,
            department: s.department || prev.department,
            faculty: s.faculty || prev.faculty,
            level: s.level || prev.level,
            email: s.email || prev.email,
            phone: s.phone || prev.phone,
            isFeedingActive: s.isFeedingActive ?? prev.isFeedingActive,
          }));
        }
      })
      .catch((err) => console.error('Failed to load profile:', err));
  }, []);

  return (
    <StudentShell studentName={student.name} matricNumber={student.matricNumber}>
      <div className="space-y-5">
        {/* Profile Header Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-brand-900 text-gold-400 font-serif font-black text-2xl sm:text-3xl flex items-center justify-center shrink-0 ring-4 ring-brand-100 shadow-md">
              {student.name.split(' ').map((n) => n[0]).join('')}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">{student.name}</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Bursary Cleared
                </span>
              </div>
              <p className="text-xs font-mono font-bold text-brand-600">{student.matricNumber}</p>
              <p className="text-xs text-slate-500">
                {student.department} • {student.level} • Cosmopolitan University
              </p>
            </div>
          </div>
        </div>

        {/* Academic & University Profile */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-brand-600" />
            Academic & Institutional Profile
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium block">Department</span>
              <span className="font-bold text-slate-800 text-sm">{student.department}</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium block">Faculty</span>
              <span className="font-bold text-slate-800 text-sm">{student.faculty}</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium block">Current Feeding Period</span>
              <span className="font-bold text-slate-800 text-sm">{student.period}</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium block">Feeding Account Reference</span>
              <span className="font-mono font-bold text-slate-800 text-[11px] break-all">{student.feedingAccountId}</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium block">Institutional Email</span>
              <span className="font-semibold text-slate-800 text-xs">{student.email}</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium block">Phone Contact</span>
              <span className="font-semibold text-slate-800 text-xs">{student.phone}</span>
            </div>
          </div>
        </div>

        {/* Security & PIN */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand-600" />
            Security & Transaction PIN
          </h2>

          <div className="p-4 bg-brand-50 border border-brand-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-brand-900 block">4-Digit Authorization PIN</span>
                <span className="text-xs text-brand-700">Secures all meal deductions at cafeteria checkout</span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Active & Verified
              </span>
            </div>
            <p className="text-[11px] text-slate-600 pt-1">
              Your default PIN is set to <strong>1234</strong>. Never disclose your PIN to cashiers or peers.
            </p>
          </div>
        </div>

        {/* Cafeteria Hours & Guidelines */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-600" />
            Cafeteria Operating Hours
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="font-bold text-slate-700 block">Breakfast</span>
              <span className="text-brand-900 font-mono font-bold mt-1 block">07:30 – 10:30</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="font-bold text-slate-700 block">Lunch</span>
              <span className="text-brand-900 font-mono font-bold mt-1 block">12:00 – 16:00</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="font-bold text-slate-700 block">Dinner</span>
              <span className="text-brand-900 font-mono font-bold mt-1 block">17:30 – 20:30</span>
            </div>
          </div>
        </div>

        {/* Session Management & Logout (Prompt 7 Section 33 & 45) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand-600" />
            Device & Session Privacy
          </h2>
          <p className="text-xs text-slate-500">
            Using a shared smartphone or computer? Sign out to clear your active session and prevent unauthorized balance access.
          </p>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.clear();
                localStorage.removeItem('mealpass_session');
                window.location.href = '/';
              }
            }}
            className="w-full py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors flex items-center justify-center gap-2 min-h-[48px]"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out & Clear Active Session</span>
          </button>
        </div>

        {/* Institutional Attribution */}
        <div className="text-center py-4 space-y-1">
          <div className="flex justify-center mb-1">
            <CosmopolitanCrest className="w-8 h-8 opacity-70" />
          </div>
          <p className="text-xs font-bold text-slate-700">Cosmopolitan University MealPass</p>
          <p className="text-[11px] text-slate-400">Digital Feeding & Cafeteria Platform</p>
          <p className="text-[11px] font-semibold text-brand-700">Powered by NextGen Technologies</p>
        </div>
      </div>
    </StudentShell>
  );
}

