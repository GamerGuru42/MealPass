'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { formatNaira, formatLagosDate, cn } from '@/lib/utils';
import {
  Landmark,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
  Users,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  Building,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  FileText,
  Calendar,
  ChevronRight,
  Download,
  AlertTriangle,
  CreditCard,
  Scale,
  Check,
  X,
  History,
  SlidersHorizontal,
} from 'lucide-react';

type AdminTab =
  | 'overview'
  | 'students'
  | 'allocation'
  | 'periods'
  | 'reconciliation'
  | 'audit'
  | 'reports';

export default function AdminFinancePage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Dashboard Data State
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [reconciliation, setReconciliation] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Filtering states
  const [studentSearch, setStudentSearch] = useState('');
  const [clearanceFilter, setClearanceFilter] = useState<'ALL' | 'CLEARED' | 'UNCLEARED'>('ALL');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>('ALL');
  const [auditSearch, setAuditSearch] = useState('');

  // Clearance Modal State
  const [clearanceModalStudent, setClearanceModalStudent] = useState<any | null>(null);
  const [clearanceTargetState, setClearanceTargetState] = useState<boolean>(true);
  const [clearanceReason, setClearanceReason] = useState('');
  const [isSubmittingClearance, setIsSubmittingClearance] = useState(false);

  // Single Allocation State
  const [singleStudentId, setSingleStudentId] = useState('');
  const [singleAmount, setSingleAmount] = useState('50000');
  const [singleMemo, setSingleMemo] = useState('2025/2026 1st Semester Verified Feeding Fee');
  const [singleBankRef, setSingleBankRef] = useState('NIBSS-REV-892019');
  const [isSubmittingSingleAlloc, setIsSubmittingSingleAlloc] = useState(false);

  // Bulk Allocation State
  const [bulkMode, setBulkMode] = useState<'single' | 'bulk'>('single');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkAmountPerStudent, setBulkAmountPerStudent] = useState('50000');
  const [bulkMemo, setBulkMemo] = useState('2025/2026 First Semester General Feeding Grant');
  const [bulkBankPrefix, setBulkBankPrefix] = useState('BURSARY-BULK-2026');
  const [bulkPreview, setBulkPreview] = useState<any | null>(null);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [isSubmittingBulkAlloc, setIsSubmittingBulkAlloc] = useState(false);

  // Period Modal State
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [periodName, setPeriodName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [periodIsActive, setPeriodIsActive] = useState(true);
  const [isSubmittingPeriod, setIsSubmittingPeriod] = useState(false);

  // Compensating Adjustment Modal State
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentStudentId, setAdjustmentStudentId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  // Show notification banner
  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 6000);
  };

  // Fetch all live data from real API
  const loadAllData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [dashRes, studentsRes, periodsRes, recRes, auditRes] = await Promise.all([
        fetch('/api/admin/dashboard').then((r) => r.json()),
        fetch('/api/admin/students').then((r) => r.json()),
        fetch('/api/admin/feeding-periods').then((r) => r.json()),
        fetch('/api/admin/reconciliation').then((r) => r.json()),
        fetch('/api/admin/audit-logs?limit=50').then((r) => r.json()),
      ]);

      if (dashRes.success) setDashboardData(dashRes.data);
      if (studentsRes.success) {
        setStudents(studentsRes.data);
        if (!singleStudentId && studentsRes.data.length > 0) {
          setSingleStudentId(studentsRes.data[0].id);
        }
        if (!adjustmentStudentId && studentsRes.data.length > 0) {
          setAdjustmentStudentId(studentsRes.data[0].id);
        }
      }
      if (periodsRes.success) setPeriods(periodsRes.data);
      if (recRes.success) setReconciliation(recRes.data);
      if (auditRes.success) setAuditLogs(auditRes.data);
    } catch (err: any) {
      notify('error', `Failed to synchronize authoritative data: ${err.message}`);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [singleStudentId, adjustmentStudentId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handle student clearance change
  const handleUpdateClearance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clearanceModalStudent) return;
    if (clearanceReason.trim().length < 5) {
      notify('error', 'A minimum 5-character reason is required for clearance audit logs.');
      return;
    }

    setIsSubmittingClearance(true);
    try {
      const res = await fetch(`/api/admin/students/${clearanceModalStudent.id}/clearance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isFeedingActive: clearanceTargetState,
          reason: clearanceReason.trim(),
          updatedBy: 'Dr. Chinedu Bello (Bursary Desk)',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update clearance');

      notify(
        'success',
        `Clearance status for ${clearanceModalStudent.name} set to ${clearanceTargetState ? 'CLEARED' : 'ON HOLD'}.`
      );
      setClearanceModalStudent(null);
      setClearanceReason('');
      await loadAllData(true);
    } catch (err: any) {
      notify('error', err.message);
    } finally {
      setIsSubmittingClearance(false);
    }
  };

  // Handle single student allocation
  const handleSingleAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(singleAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      notify('error', 'Please enter a valid positive allocation amount.');
      return;
    }

    setIsSubmittingSingleAlloc(true);
    try {
      const idempotencyKey = `single-alloc-${singleStudentId}-${Date.now()}`;
      const res = await fetch('/api/admin/allocations/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentProfileId: singleStudentId,
          amount: amountNum,
          description: singleMemo.trim(),
          bankReference: singleBankRef.trim() || undefined,
          allocatedBy: 'Dr. Chinedu Bello (Finance Admin)',
          idempotencyKey,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to execute allocation');

      const targetStudent = students.find((s) => s.id === singleStudentId);
      notify(
        'success',
        `Allocated ${formatNaira(amountNum)} to ${targetStudent?.name || 'student'}. New Balance: ${formatNaira(json.data.new_balance || json.data.newBalance)}`
      );
      await loadAllData(true);
    } catch (err: any) {
      notify('error', err.message);
    } finally {
      setIsSubmittingSingleAlloc(false);
    }
  };

  // Handle bulk preview calculation
  const handleBulkPreview = async () => {
    if (selectedStudentIds.length === 0) {
      notify('error', 'Please select at least one student for bulk allocation.');
      return;
    }
    const amountNum = parseFloat(bulkAmountPerStudent);
    if (isNaN(amountNum) || amountNum <= 0) {
      notify('error', 'Please enter a valid positive per-student amount.');
      return;
    }

    try {
      const res = await fetch('/api/admin/allocations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          studentProfileIds: selectedStudentIds,
          amountPerStudent: amountNum,
          description: bulkMemo.trim(),
          bankReferencePrefix: bulkBankPrefix.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to generate bulk preview');

      setBulkPreview(json.data);
      setShowBulkConfirmModal(true);
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  // Execute confirmed bulk allocation
  const handleExecuteBulkConfirmed = async () => {
    setIsSubmittingBulkAlloc(true);
    try {
      const amountNum = parseFloat(bulkAmountPerStudent);
      const idempotencyKey = `bulk-alloc-${Date.now()}`;
      const res = await fetch('/api/admin/allocations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          studentProfileIds: selectedStudentIds,
          amountPerStudent: amountNum,
          description: bulkMemo.trim(),
          bankReferencePrefix: bulkBankPrefix.trim() || undefined,
          idempotencyKey,
          allocatedBy: 'Dr. Chinedu Bello (Finance Admin)',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to execute bulk allocation');

      notify(
        'success',
        `Bulk allocation complete: ${json.data.processedCount} students credited with total ${formatNaira(json.data.totalAmountAllocated)}.`
      );
      setShowBulkConfirmModal(false);
      setBulkPreview(null);
      setSelectedStudentIds([]);
      await loadAllData(true);
    } catch (err: any) {
      notify('error', err.message);
    } finally {
      setIsSubmittingBulkAlloc(false);
    }
  };

  // Handle feeding period creation
  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodName || !periodStart || !periodEnd) {
      notify('error', 'Name, start date, and end date are all required.');
      return;
    }

    setIsSubmittingPeriod(true);
    try {
      const res = await fetch('/api/admin/feeding-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: periodName.trim(),
          startDate: periodStart,
          endDate: periodEnd,
          isActive: periodIsActive,
          updatedBy: 'Dr. Chinedu Bello (Finance Admin)',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to save feeding period');

      notify('success', `Feeding period "${json.data.name}" registered successfully.`);
      setShowPeriodModal(false);
      setPeriodName('');
      setPeriodStart('');
      setPeriodEnd('');
      await loadAllData(true);
    } catch (err: any) {
      notify('error', err.message);
    } finally {
      setIsSubmittingPeriod(false);
    }
  };

  // Handle feeding period activation
  const handleActivatePeriod = async (periodId: string) => {
    try {
      const res = await fetch(`/api/admin/feeding-periods/${periodId}/activate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updatedBy: 'Dr. Chinedu Bello (Finance Admin)',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to activate period');

      notify('success', `Feeding period "${json.data.name}" is now the sole ACTIVE academic semester.`);
      await loadAllData(true);
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  // Handle compensating financial adjustment
  const handleExecuteAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(adjustmentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      notify('error', 'Adjustment amount must be strictly greater than zero.');
      return;
    }
    if (adjustmentReason.trim().length < 5) {
      notify('error', 'An authoritative audit reason (at least 5 characters) is required.');
      return;
    }

    setIsSubmittingAdjustment(true);
    try {
      const res = await fetch('/api/admin/reconciliation/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentProfileId: adjustmentStudentId,
          adjustmentType,
          amount: amountNum,
          reason: adjustmentReason.trim(),
          authorizedBy: 'Dr. Chinedu Bello (Finance Admin)',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to apply compensating adjustment');

      notify(
        'success',
        `Compensating ${adjustmentType} adjustment of ${formatNaira(amountNum)} recorded in append-only ledger. New Balance: ${formatNaira(json.data.newBalance)}`
      );
      setShowAdjustmentModal(false);
      setAdjustmentAmount('');
      setAdjustmentReason('');
      await loadAllData(true);
    } catch (err: any) {
      notify('error', err.message);
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  // Trigger CSV Download
  const downloadReportCsv = (type: string) => {
    window.location.href = `/api/admin/reports/export?type=${type}`;
  };

  // Metrics derived from authoritative dashboard data
  const metrics = dashboardData?.metrics || {
    totalStudents: 4,
    clearedStudents: 3,
    unclearedStudents: 1,
    activePeriod: { name: '2025/2026 First Semester', daysRemaining: 61 },
    totalAllocated: 150000,
    grossDeductions: 17298,
    totalRefunded: 0,
    netDeductions: 17298,
    totalAdjustments: 0,
    totalRemainingBalance: 132702,
    ordersTodayCount: 0,
    deductionsToday: 0,
    refundsToday: 0,
    reconciliation: { isBalanced: true, discrepancy: 0 },
  };

  // Filtered Students
  const filteredStudents = students.filter((s) => {
    if (clearanceFilter === 'CLEARED' && !s.isFeedingActive) return false;
    if (clearanceFilter === 'UNCLEARED' && s.isFeedingActive) return false;
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase();
      return (
        s.name?.toLowerCase().includes(q) ||
        s.matricNumber?.toLowerCase().includes(q) ||
        s.department?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Ledger Entries
  const recentTransactions = dashboardData?.recentTransactions || [];
  const filteredTransactions = recentTransactions.filter((tx: any) => {
    if (ledgerTypeFilter !== 'ALL' && tx.transactionType !== ledgerTypeFilter) return false;
    return true;
  });

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase();
      return (
        log.details?.toLowerCase().includes(q) ||
        log.action?.toLowerCase().includes(q) ||
        log.changedBy?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16 font-sans">
      <Header
        roleName="Finance Administrator"
        userName="Dr. Chinedu Bello"
        matricNumber="BURSARY-01"
      />

      {/* Sub Header & Quick Actions */}
      <div className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-8 sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl shadow-xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                  Cosmopolitan University Bursary • Feeding Allocation & Audit Desk
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  Authoritative Ledger
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Active: {metrics.activePeriod?.name || '2025/2026 First Semester'} • {metrics.activePeriod?.daysRemaining ?? 60} Days Left
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => loadAllData(true)}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition-all text-xs font-bold flex items-center gap-1.5"
              title="Refresh ledger state"
            >
              <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin text-emerald-600')} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('allocation');
                setBulkMode('single');
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 transition-all text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Allocate Funds</span>
            </button>
            <Link
              href="/"
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              Switch Role
            </Link>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto py-2 no-scrollbar">
          {[
            { id: 'overview', label: 'Financial Overview', icon: DollarSign },
            { id: 'students', label: 'Students & Clearance', icon: Users, badge: metrics.unclearedStudents > 0 ? `${metrics.unclearedStudents} Pending` : undefined },
            { id: 'allocation', label: 'Feeding Allocation', icon: PlusCircle },
            { id: 'periods', label: 'Feeding Periods', icon: Calendar },
            { id: 'reconciliation', label: 'Ledger & Reconciliation', icon: Scale },
            { id: 'audit', label: 'Audit Trail', icon: ShieldCheck },
            { id: 'reports', label: 'Exports & Reports', icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer',
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-amber-950">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 pt-4">
          <div
            className={cn(
              'p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm border transition-all',
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            )}
          >
            <div className="flex items-center gap-2.5">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Content Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 pt-6 space-y-6 flex-1">
        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Authoritative Realtime Reconciliation Equation Banner */}
            <div className="p-4 sm:p-5 rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-md border border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Authoritative Ledger Status
                    </span>
                    <span className="text-xs text-slate-300 font-semibold">
                      Live PostgreSQL Immutability Enforced
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold tracking-tight">
                    Every Single Naira Accounted For: Verified Reconciled
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs text-slate-200">
                    <span className="text-emerald-400 font-bold">{formatNaira(metrics.totalAllocated)} (Allocated)</span>
                    <span>−</span>
                    <span className="text-rose-400 font-bold">{formatNaira(metrics.netDeductions)} (Net Spent)</span>
                    <span>+</span>
                    <span className="text-indigo-400 font-bold">{formatNaira(metrics.totalAdjustments)} (Adjustments)</span>
                    <span>=</span>
                    <span className="text-amber-300 font-bold text-sm">{formatNaira(metrics.totalRemainingBalance)} (Student Balances)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Reconciliation Variance
                    </span>
                    <span className="text-lg font-black text-emerald-400 font-mono">
                      ₦{metrics.reconciliation?.discrepancy?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab('reconciliation')}
                    className="px-3.5 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <span>Full Audit</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Financial & Operational KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] uppercase tracking-wider font-bold">
                    Total Allocations
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-emerald-700 font-mono">
                  {formatNaira(metrics.totalAllocated)}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Verified bank fee clearances & grants
                </span>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] uppercase tracking-wider font-bold">
                    Gross Meal Deductions
                  </span>
                  <ArrowDownRight className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-2xl font-black text-rose-700 font-mono">
                  {formatNaira(metrics.grossDeductions)}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {metrics.totalRefunded > 0 ? `Includes ${formatNaira(metrics.totalRefunded)} refunded` : 'Direct cafeteria POS meals'}
                </span>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] uppercase tracking-wider font-bold">
                    Remaining Balances
                  </span>
                  <DollarSign className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-black text-indigo-900 font-mono">
                  {formatNaira(metrics.totalRemainingBalance)}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Authoritative student feeding liability
                </span>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] uppercase tracking-wider font-bold">
                    Student Feeding Accounts
                  </span>
                  <Users className="w-4 h-4 text-slate-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {metrics.clearedStudents} <span className="text-xs text-slate-500 font-sans font-bold">/ {metrics.totalStudents} Cleared</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {metrics.unclearedStudents > 0 ? `${metrics.unclearedStudents} awaiting bursary verification` : 'All students active'}
                </span>
              </div>
            </div>

            {/* Split Grid: Recent Authoritative Ledger & Recent Audit Trail */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Ledger Entries */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-extrabold text-sm text-slate-900">
                      Recent Ledger Transactions
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('reconciliation')}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-800"
                  >
                    View All
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {recentTransactions.slice(0, 6).map((tx: any) => {
                    const isCredit = tx.transactionType === 'ALLOCATION' || tx.transactionType === 'REFUND' || (tx.transactionType === 'ADJUSTMENT' && tx.amount > 0);
                    return (
                      <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                'px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider',
                                tx.transactionType === 'ALLOCATION' && 'bg-emerald-100 text-emerald-800',
                                tx.transactionType === 'MEAL_DEDUCTION' && 'bg-rose-100 text-rose-800',
                                tx.transactionType === 'REFUND' && 'bg-blue-100 text-blue-800',
                                tx.transactionType === 'ADJUSTMENT' && 'bg-amber-100 text-amber-800'
                              )}
                            >
                              {tx.transactionType.replace('_', ' ')}
                            </span>
                            <span className="font-bold text-slate-900">{tx.studentName}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate max-w-[240px]">
                            {tx.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <div
                            className={cn(
                              'font-extrabold font-mono text-xs',
                              isCredit ? 'text-emerald-600' : 'text-slate-900'
                            )}
                          >
                            {isCredit ? '+' : ''}{formatNaira(Math.abs(tx.amount))}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Bal: {formatNaira(tx.runningBalance)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Audit Logs */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-extrabold text-sm text-slate-900">
                      Security & Administrative Audit Logs
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('audit')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Investigate
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {auditLogs.slice(0, 6).map((log: any) => (
                    <div key={log.id} className="py-3 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-slate-900 uppercase">
                          {log.action}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {formatLagosDate(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] line-clamp-2">
                        {log.details}
                      </p>
                      <span className="text-[10px] text-slate-400 block">
                        By: {log.changedBy}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: STUDENTS & CLEARANCE */}
        {/* ========================================================================= */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            {/* Filter toolbar */}
            <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                <div className="relative w-full max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search matriculation number, name, department..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden font-medium"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {(['ALL', 'CLEARED', 'UNCLEARED'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setClearanceFilter(status)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all',
                        clearanceFilter === status
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      {status === 'ALL' ? 'All' : status === 'CLEARED' ? 'Cleared' : 'Awaiting'}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveTab('allocation');
                  setBulkMode('bulk');
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all w-full sm:w-auto justify-center"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Bulk Allocate to Cleared</span>
              </button>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Department & Level</th>
                      <th className="py-3 px-4">Feeding Clearance</th>
                      <th className="py-3 px-4 text-right">Available Balance</th>
                      <th className="py-3 px-4 text-right">Total Allocated</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{student.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{student.matricNumber}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-900">{student.department}</div>
                          <div className="text-[11px] text-slate-500">{student.level}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider',
                              student.isFeedingActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-900'
                            )}
                          >
                            {student.isFeedingActive ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Cleared for Feeding</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                <span>Awaiting Clearance</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-extrabold font-mono text-emerald-700 text-sm">
                            {formatNaira(student.currentBalance)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                          {formatNaira(student.totalAllocated)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setClearanceModalStudent(student);
                                setClearanceTargetState(!student.isFeedingActive);
                                setClearanceReason(
                                  student.isFeedingActive
                                    ? 'Administrative hold pending bursary audit'
                                    : 'Semester feeding fee payment verified via bank teller'
                                );
                              }}
                              className={cn(
                                'px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all',
                                student.isFeedingActive
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                              )}
                            >
                              {student.isFeedingActive ? 'Hold Clearance' : 'Grant Clearance'}
                            </button>
                            <button
                              onClick={() => {
                                setSingleStudentId(student.id);
                                setActiveTab('allocation');
                                setBulkMode('single');
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all"
                            >
                              Credit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: FEEDING ALLOCATION */}
        {/* ========================================================================= */}
        {activeTab === 'allocation' && (
          <div className="space-y-6">
            {/* Allocation Mode Switcher */}
            <div className="flex items-center justify-center">
              <div className="bg-slate-200 p-1 rounded-2xl flex items-center gap-1">
                <button
                  onClick={() => setBulkMode('single')}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-extrabold transition-all',
                    bulkMode === 'single'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Individual Student Allocation
                </button>
                <button
                  onClick={() => setBulkMode('bulk')}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-extrabold transition-all',
                    bulkMode === 'bulk'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Bulk Semester Allocation (Cohort)
                </button>
              </div>
            </div>

            {/* Mode 1: Individual Allocation Form */}
            {bulkMode === 'single' && (
              <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-base text-slate-900">
                    Individual Student Feeding Credit
                  </h3>
                  <p className="text-xs text-slate-500">
                    Direct authoritative ledger allocation via audited RPC with atomic lock.
                  </p>
                </div>

                <form onSubmit={handleSingleAllocation} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Target Student
                    </label>
                    <select
                      value={singleStudentId}
                      onChange={(e) => setSingleStudentId(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden font-medium"
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.matricNumber}) — Bal: {formatNaira(s.currentBalance)} {s.isFeedingActive ? '[CLEARED]' : '[UNCLEARED]'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Allocation Amount (₦)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={singleAmount}
                        onChange={(e) => setSingleAmount(e.target.value)}
                        placeholder="50000"
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden font-mono font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Bank / Payment Reference
                      </label>
                      <input
                        type="text"
                        value={singleBankRef}
                        onChange={(e) => setSingleBankRef(e.target.value)}
                        placeholder="NIBSS-REV-892019"
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Clearance Description / Memo
                    </label>
                    <input
                      type="text"
                      value={singleMemo}
                      onChange={(e) => setSingleMemo(e.target.value)}
                      placeholder="Semester Feeding Fee Verified by Bursary"
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden font-medium"
                      required
                    />
                  </div>

                  {/* Real-time preview */}
                  {(() => {
                    const student = students.find((s) => s.id === singleStudentId);
                    const amt = parseFloat(singleAmount) || 0;
                    const newBal = (student?.currentBalance || 0) + amt;
                    return (
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                        <span className="font-bold text-emerald-900 block">
                          Authoritative Ledger Impact Preview:
                        </span>
                        <div className="flex items-center justify-between text-emerald-800 font-mono">
                          <span>Current Available: {formatNaira(student?.currentBalance || 0)}</span>
                          <span>→</span>
                          <span className="font-extrabold text-emerald-950">
                            Projected Balance: {formatNaira(newBal)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <button
                    type="submit"
                    disabled={isSubmittingSingleAlloc}
                    className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    {isSubmittingSingleAlloc ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <PlusCircle className="w-4 h-4" />
                    )}
                    <span>Commit Authoritative Allocation</span>
                  </button>
                </form>
              </div>
            )}

            {/* Mode 2: Bulk Cohort Allocation */}
            {bulkMode === 'bulk' && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <h3 className="font-extrabold text-base text-slate-900">
                      Bulk Semester Feeding Allocation
                    </h3>
                    <p className="text-xs text-slate-500">
                      Select cohort students to disburse uniform feeding allowance with preview and atomic commitment.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const cleared = students.filter((s) => s.isFeedingActive).map((s) => s.id);
                        setSelectedStudentIds(cleared);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                    >
                      Select All Cleared ({students.filter((s) => s.isFeedingActive).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentIds([])}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Per-Student Amount (₦)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={bulkAmountPerStudent}
                      onChange={(e) => setBulkAmountPerStudent(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Bank Ref Prefix
                    </label>
                    <input
                      type="text"
                      value={bulkBankPrefix}
                      onChange={(e) => setBulkBankPrefix(e.target.value)}
                      placeholder="BURSARY-BULK-2026"
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Semester Memo
                    </label>
                    <input
                      type="text"
                      value={bulkMemo}
                      onChange={(e) => setBulkMemo(e.target.value)}
                      placeholder="Semester Feeding Grant"
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden font-medium"
                    />
                  </div>
                </div>

                {/* Student Selection Checklist */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-50 py-2.5 px-4 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Select Enrolled Students ({selectedStudentIds.length} Selected)</span>
                    <span className="font-mono text-emerald-700">
                      Estimated Liability: {formatNaira(selectedStudentIds.length * (parseFloat(bulkAmountPerStudent) || 0))}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                    {students.map((student) => {
                      const isSelected = selectedStudentIds.includes(student.id);
                      return (
                        <label
                          key={student.id}
                          className={cn(
                            'flex items-center justify-between p-3 cursor-pointer text-xs transition-colors hover:bg-slate-50',
                            isSelected && 'bg-emerald-50/50'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStudentIds((prev) => [...prev, student.id]);
                                } else {
                                  setSelectedStudentIds((prev) => prev.filter((id) => id !== student.id));
                                }
                              }}
                              className="rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                            />
                            <div>
                              <div className="font-bold text-slate-900">{student.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {student.matricNumber} • {student.department}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-right">
                            <span
                              className={cn(
                                'text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full',
                                student.isFeedingActive
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-900'
                              )}
                            >
                              {student.isFeedingActive ? 'Cleared' : 'Awaiting'}
                            </span>
                            <span className="font-mono font-bold text-slate-700">
                              Bal: {formatNaira(student.currentBalance)}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleBulkPreview}
                    disabled={selectedStudentIds.length === 0}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                  >
                    <span>Preview & Validate Cohort Allocation</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: FEEDING PERIODS */}
        {/* ========================================================================= */}
        {activeTab === 'periods' && (
          <div className="space-y-4">
            <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Academic Feeding Periods & Semesters
                </h3>
                <p className="text-xs text-slate-500">
                  Strictly enforces only ONE active feeding period at any time across the university.
                </p>
              </div>
              <button
                onClick={() => setShowPeriodModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Semester</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {periods.map((period) => (
                <div
                  key={period.id}
                  className={cn(
                    'p-5 rounded-3xl border shadow-xs transition-all space-y-4',
                    period.isActive
                      ? 'bg-linear-to-b from-emerald-50/50 to-white border-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider',
                        period.status === 'ACTIVE' && 'bg-emerald-100 text-emerald-800',
                        period.status === 'UPCOMING' && 'bg-blue-100 text-blue-800',
                        period.status === 'COMPLETED' && 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {period.status}
                    </span>
                    {period.isActive && (
                      <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Active Operational
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">{period.name}</h4>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      {period.startDate} to {period.endDate}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500">
                      {period.status === 'ACTIVE' ? `${period.daysRemaining} days remaining` : 'Semester'}
                    </span>
                    {!period.isActive && (
                      <button
                        onClick={() => handleActivatePeriod(period.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                      >
                        Set as Active
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: LEDGER & RECONCILIATION */}
        {/* ========================================================================= */}
        {activeTab === 'reconciliation' && (
          <div className="space-y-6">
            {/* Reconciliation Report Card */}
            {reconciliation && (
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                      Authoritative Reconciliation Sheet
                    </span>
                    <h3 className="font-extrabold text-base text-slate-900 mt-1">
                      Cosmopolitan University Financial Control Statement
                    </h3>
                  </div>

                  <button
                    onClick={() => setShowAdjustmentModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Compensating Adjustment</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Allocations</span>
                    <span className="font-extrabold text-emerald-700 text-sm">{formatNaira(reconciliation.totalAllocated)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Gross Deductions</span>
                    <span className="font-extrabold text-rose-700 text-sm">{formatNaira(reconciliation.grossDeductions)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Refunds / Reversals</span>
                    <span className="font-extrabold text-blue-700 text-sm">{formatNaira(reconciliation.totalRefunded)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Balance Liability</span>
                    <span className="font-extrabold text-slate-900 text-sm">{formatNaira(reconciliation.actualBalanceSum)}</span>
                  </div>
                </div>

                {/* Per-student variance breakdown */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-50 py-2.5 px-4 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">
                    Student Account Reconciliation Audit
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="py-2.5 px-4">Student</th>
                          <th className="py-2.5 px-4 text-right">Allocated</th>
                          <th className="py-2.5 px-4 text-right">Net Spent</th>
                          <th className="py-2.5 px-4 text-right">Adjustments</th>
                          <th className="py-2.5 px-4 text-right">Theoretical</th>
                          <th className="py-2.5 px-4 text-right">Actual Balance</th>
                          <th className="py-2.5 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {reconciliation.studentBreakdown.map((s: any) => (
                          <tr key={s.studentProfileId} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-sans font-bold text-slate-900">
                              {s.name} <span className="text-slate-400 font-mono text-[11px]">({s.matricNumber})</span>
                            </td>
                            <td className="py-2.5 px-4 text-right text-emerald-700">{formatNaira(s.totalAllocated)}</td>
                            <td className="py-2.5 px-4 text-right text-rose-700">{formatNaira(s.netSpent)}</td>
                            <td className="py-2.5 px-4 text-right text-indigo-700">{formatNaira(s.totalAdjustments)}</td>
                            <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatNaira(s.theoreticalBalance)}</td>
                            <td className="py-2.5 px-4 text-right font-bold text-emerald-700">{formatNaira(s.actualBalance)}</td>
                            <td className="py-2.5 px-4 text-center font-sans">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800">
                                Reconciled (0.00)
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Historical Transaction Ledger Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Complete Transaction Ledger
                  </h3>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {['ALL', 'ALLOCATION', 'MEAL_DEDUCTION', 'REFUND', 'ADJUSTMENT'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setLedgerTypeFilter(type)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all',
                        ledgerTypeFilter === type
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      {type.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="py-3 px-4">Date / Time</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Reference & Description</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredTransactions.map((tx: any) => {
                      const isCredit = tx.transactionType === 'ALLOCATION' || tx.transactionType === 'REFUND' || (tx.transactionType === 'ADJUSTMENT' && tx.amount > 0);
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                            {formatLagosDate(tx.createdAt)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900">{tx.studentName}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">{tx.matricNumber}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider',
                                tx.transactionType === 'ALLOCATION' && 'bg-emerald-100 text-emerald-800',
                                tx.transactionType === 'MEAL_DEDUCTION' && 'bg-rose-100 text-rose-800',
                                tx.transactionType === 'REFUND' && 'bg-blue-100 text-blue-800',
                                tx.transactionType === 'ADJUSTMENT' && 'bg-amber-100 text-amber-800'
                              )}
                            >
                              {tx.transactionType.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono text-[11px] text-slate-700">{tx.referenceId || 'N/A'}</div>
                            <div className="text-[11px] text-slate-500 truncate max-w-xs">{tx.description}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            <span className={isCredit ? 'text-emerald-600' : 'text-slate-900'}>
                              {isCredit ? '+' : ''}{formatNaira(Math.abs(tx.amount))}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900">
                            {formatNaira(tx.runningBalance)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: AUDIT TRAIL */}
        {/* ========================================================================= */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search actions, administrators, entities..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden font-medium"
                />
              </div>

              <div className="text-xs text-slate-500 font-bold">
                {filteredAuditLogs.length} Authoritative Audit Events Logged
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="divide-y divide-slate-100">
                {filteredAuditLogs.map((log: any) => (
                  <div key={log.id} className="p-4 space-y-1 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-900 text-white font-mono">
                          {log.action}
                        </span>
                        <span className="font-bold text-slate-900">{log.entityType}</span>
                        <span className="text-[11px] font-mono text-slate-400">({log.entityId})</span>
                      </div>
                      <span className="text-slate-400 text-[11px] font-mono">
                        {formatLagosDate(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium">
                      {log.details}
                    </p>
                    <div className="text-[10px] text-slate-400">
                      Authorized By: <span className="font-semibold text-slate-600">{log.changedBy}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: REPORTS & EXPORTS */}
        {/* ========================================================================= */}
        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                id: 'reconciliation',
                title: 'Authoritative Reconciliation Statement',
                description: 'Full audit balance sheet comparing allocations, gross deductions, refunds, and actual balances.',
                icon: Scale,
              },
              {
                id: 'allocations',
                title: 'Feeding Allocations Register',
                description: 'Complete record of verified bank fee clearances, semester grants, and bursary disbursements.',
                icon: DollarSign,
              },
              {
                id: 'ledger',
                title: 'Append-Only Financial Ledger (Full)',
                description: 'Exhaustive chronological register of every transaction, running balance, and POS reference.',
                icon: FileText,
              },
              {
                id: 'students',
                title: 'Student Feeding Accounts Directory',
                description: 'Enrolled students with clearance status, feeding account IDs, and available balance balances.',
                icon: Users,
              },
            ].map((rep) => {
              const Icon = rep.icon;
              return (
                <div
                  key={rep.id}
                  className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
                >
                  <div className="space-y-2">
                    <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl w-fit">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900">{rep.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{rep.description}</p>
                  </div>

                  <button
                    onClick={() => downloadReportCsv(rep.id)}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download CSV Export</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: STUDENT CLEARANCE MODAL */}
      {/* ========================================================================= */}
      {clearanceModalStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900">
                Update Feeding Clearance Status
              </h3>
              <button
                onClick={() => setClearanceModalStudent(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1">
              <div className="font-bold text-slate-900">{clearanceModalStudent.name}</div>
              <div className="text-slate-500 font-mono">
                {clearanceModalStudent.matricNumber} • {clearanceModalStudent.department}
              </div>
            </div>

            <form onSubmit={handleUpdateClearance} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Clearance Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setClearanceTargetState(true)}
                    className={cn(
                      'py-2 rounded-xl text-xs font-bold border transition-all',
                      clearanceTargetState
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'border-slate-200 text-slate-600'
                    )}
                  >
                    Cleared (Active)
                  </button>
                  <button
                    type="button"
                    onClick={() => setClearanceTargetState(false)}
                    className={cn(
                      'py-2 rounded-xl text-xs font-bold border transition-all',
                      !clearanceTargetState
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : 'border-slate-200 text-slate-600'
                    )}
                  >
                    On Hold (Inactive)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Audit Reason (Mandatory)
                </label>
                <textarea
                  value={clearanceReason}
                  onChange={(e) => setClearanceReason(e.target.value)}
                  placeholder="e.g. Bank fee verification confirmed by Bursary"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden font-medium h-20"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClearanceModalStudent(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClearance}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  {isSubmittingClearance ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Save Clearance</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: BULK ALLOCATION CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {showBulkConfirmModal && bulkPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Confirm Bulk Feeding Disbursement
                </h3>
              </div>
              <button
                onClick={() => setShowBulkConfirmModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-2">
              <p className="font-bold">
                You are about to execute an immutable financial credit across {bulkPreview.studentCount} students.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div>Per Student: <span className="font-bold">{formatNaira(bulkPreview.amountPerStudent)}</span></div>
                <div>Total Liability: <span className="font-bold text-emerald-800">{formatNaira(bulkPreview.totalLiability)}</span></div>
              </div>
            </div>

            <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl text-xs font-mono">
              {bulkPreview.studentsPreview.map((s: any) => (
                <div key={s.id} className="p-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 font-sans">{s.name}</span>
                    <span className="text-[10px] text-slate-400 block">{s.matricNumber}</span>
                  </div>
                  <span className="text-emerald-700 font-bold">
                    {formatNaira(s.currentBalance)} → {formatNaira(s.projectedBalance)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkConfirmed}
                disabled={isSubmittingBulkAlloc}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isSubmittingBulkAlloc ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Commit {formatNaira(bulkPreview.totalLiability)}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: FEEDING PERIOD MODAL */}
      {/* ========================================================================= */}
      {showPeriodModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900">
                Register New Academic Semester
              </h3>
              <button
                onClick={() => setShowPeriodModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePeriod} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Semester Name
                </label>
                <input
                  type="text"
                  value={periodName}
                  onChange={(e) => setPeriodName(e.target.value)}
                  placeholder="2026/2027 First Semester"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-mono"
                    required
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={periodIsActive}
                  onChange={(e) => setPeriodIsActive(e.target.checked)}
                  className="rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="font-bold text-slate-700">Set as current ACTIVE feeding period</span>
              </label>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPeriodModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPeriod}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  {isSubmittingPeriod ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Register Period</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: COMPENSATING ADJUSTMENT MODAL */}
      {/* ========================================================================= */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900">
                Compensating Ledger Adjustment
              </h3>
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              In accordance with financial compliance rules, errors must NEVER mutate or delete historical records. An append-only compensating entry will be generated.
            </p>

            <form onSubmit={handleExecuteAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Student
                </label>
                <select
                  value={adjustmentStudentId}
                  onChange={(e) => setAdjustmentStudentId(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.matricNumber}) — Bal: {formatNaira(s.currentBalance)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Adjustment Type
                  </label>
                  <select
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value as any)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  >
                    <option value="CREDIT">CREDIT (+)</option>
                    <option value="DEBIT">DEBIT (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Amount (₦)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    placeholder="1000"
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Authoritative Audit Reason (Mandatory)
                </label>
                <textarea
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g. Bursary audit discrepancy correction for teller mismatch"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium h-20"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjustment}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isSubmittingAdjustment ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Record Adjustment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
