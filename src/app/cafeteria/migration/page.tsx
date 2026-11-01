'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { formatNaira } from '@/lib/utils';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Edit2,
  Save,
  Trash2,
  Sparkles,
  ArrowLeft,
  Coins,
  Users,
} from 'lucide-react';

export default function LegacyRecordMigrationPage() {
  const [activeTab, setActiveTab] = useState<'DOCUMENT' | 'MANUAL'>('DOCUMENT');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Manual Entry Rows State
  const [manualRows, setManualRows] = useState<Array<{
    matricNumber: string;
    studentName: string;
    balance: string;
    department: string;
  }>>([
    { matricNumber: 'CU/2024/0401', studentName: 'Faruq Al-Hassan', balance: '25000', department: 'Computer Science' },
    { matricNumber: 'CU/2024/0402', studentName: 'Blessing Okeke', balance: '30000', department: 'Economics' },
  ]);

  // Preview & Validation State
  const [previewSummary, setPreviewSummary] = useState<any | null>(null);
  const [previewRecords, setPreviewRecords] = useState<any[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editBuffer, setEditBuffer] = useState<any | null>(null);

  // Execution & Confirmation State
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [executionError, setExecutionError] = useState('');

  // Handle Document Upload
  const handleFileUpload = async (file: File) => {
    setSelectedFile(file);
    setUploading(true);
    setUploadError('');
    setExecutionResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/migration/upload', {
        method: 'POST',
        headers: { 'x-user-role': 'CAFETERIA_HEAD' },
        body: formData,
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setPreviewSummary(json.data.summary);
        setPreviewRecords(json.data.records);
      } else {
        setUploadError(json.error || 'Failed to extract records from document.');
        setPreviewSummary(null);
        setPreviewRecords([]);
      }
    } catch {
      setUploadError('Network error uploading document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Handle Manual Entry Validation
  const handleValidateManual = async () => {
    setUploading(true);
    setUploadError('');
    setExecutionResult(null);

    try {
      const formatted = manualRows.map((r) => ({
        matricNumber: r.matricNumber.trim(),
        studentName: r.studentName.trim(),
        balance: r.balance.trim(),
        department: r.department.trim(),
      }));

      const res = await fetch('/api/admin/migration/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'CAFETERIA_HEAD',
        },
        body: JSON.stringify({ students: formatted }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setPreviewSummary(json.data.summary);
        setPreviewRecords(json.data.records);
      } else {
        setUploadError(json.error || 'Validation failed for manual entries.');
      }
    } catch {
      setUploadError('Network error validating records.');
    } finally {
      setUploading(false);
    }
  };

  // Inline Record Editing
  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditBuffer({ ...previewRecords[index] });
  };

  const saveEdit = (index: number) => {
    if (!editBuffer) return;
    const updated = [...previewRecords];
    const rec = { ...editBuffer };

    // Re-validate single row
    const num = parseFloat(String(rec.importedBalance).replace(/[^\d.]/g, ''));
    const isNumValid = !isNaN(num) && num >= 0;
    const isMatricValid = /^CU\/\d{4}\/\d{3,5}$/i.test(rec.matricNumber) || rec.matricNumber.length >= 5;
    const isNameValid = (rec.studentName || '').trim().length >= 3;

    const errors: string[] = [];
    if (!isMatricValid) errors.push('Invalid matric format');
    if (!isNameValid) errors.push('Missing/short name');
    if (!isNumValid) errors.push('Invalid balance');

    rec.importedBalance = isNumValid ? num : 0;
    rec.validationStatus = errors.length === 0 ? 'CORRECTED' : 'INVALID';
    rec.errorMessage = errors.length > 0 ? errors.join('; ') : undefined;

    updated[index] = rec;
    setPreviewRecords(updated);
    setEditingIndex(null);
    setEditBuffer(null);

    // Recompute summary
    const validCount = updated.filter((r) => r.validationStatus === 'VALID' || r.validationStatus === 'CORRECTED').length;
    const invalidCount = updated.filter((r) => r.validationStatus === 'INVALID').length;
    const totalLiab = updated
      .filter((r) => r.validationStatus === 'VALID' || r.validationStatus === 'CORRECTED')
      .reduce((sum, r) => sum + r.importedBalance, 0);

    setPreviewSummary((prev: any) => ({
      ...prev,
      validCount,
      invalidCount,
      totalLiability: Math.round(totalLiab * 100) / 100,
    }));
  };

  // Execute Confirmed Migration
  const handleExecuteMigration = async () => {
    if (previewRecords.length === 0) return;
    setExecuting(true);
    setExecutionError('');

    try {
      const idempotencyKey = `MIG-EXEC-${Date.now()}`;
      const res = await fetch('/api/admin/migration/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'CAFETERIA_HEAD',
        },
        body: JSON.stringify({
          sourceType: activeTab === 'DOCUMENT' ? 'FILE_UPLOAD' : 'MANUAL_ENTRY',
          fileName: selectedFile?.name || (activeTab === 'MANUAL' ? 'Manual Batch' : undefined),
          fileFormat: previewSummary?.fileFormat || 'CSV',
          records: previewRecords,
          confirmedByName: 'Madam Margaret Okonkwo (Cafeteria Head)',
          idempotencyKey,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setExecutionResult(json.data);
        setPreviewRecords([]);
        setPreviewSummary(null);
      } else {
        setExecutionError(json.error || 'Failed to execute migration batch.');
      }
    } catch {
      setExecutionError('Network error executing migration batch.');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center space-x-2 text-xs text-slate-500 mb-4">
          <Link href="/cafeteria" className="hover:text-university-navy flex items-center space-x-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kitchen & Counter Dashboard</span>
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-bold">Legacy Student Record Migration</span>
        </div>

        {/* Page Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-university-accent/15 text-university-navy text-xs font-bold px-3 py-1 rounded-full mb-2">
              <Coins className="w-3.5 h-3.5 text-university-accent" />
              <span>Dedicated Opening Balance Ledger Flow</span>
            </div>
            <h1 className="text-2xl font-bold font-heading text-slate-900">Legacy Feeding Entitlements Migration</h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Upload historical feeding vouchers, student rosters, or enter manual records. The system normalizes, audits, and credits opening balances with dedicated <code className="text-xs bg-slate-100 px-1 py-0.5 rounded text-university-navy font-mono">OPENING_BALANCE</code> ledger entries.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-right">
              <span className="text-[11px] text-slate-500 block uppercase font-bold tracking-wider">Operator Scope</span>
              <span className="text-xs font-bold text-university-navy">Madam Margaret Okonkwo</span>
            </div>
          </div>
        </div>

        {/* Success Confirmation Banner */}
        {executionResult && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-6 shadow-sm animate-fade-in">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-emerald-900">Migration Successfully Confirmed & Landed!</h3>
                <p className="text-sm text-emerald-700 mt-0.5">
                  Batch <strong>#{executionResult.batchNumber}</strong> has been committed to the authoritative append-only ledger with zero financial variance.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div className="bg-white rounded-xl p-3 border border-emerald-200">
                    <span className="text-[11px] text-slate-500 block">Migrated Students</span>
                    <span className="text-lg font-extrabold text-emerald-700">{executionResult.migratedCount}</span>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-emerald-200">
                    <span className="text-[11px] text-slate-500 block">Total Opening Balance</span>
                    <span className="text-lg font-extrabold text-university-navy">{formatNaira(executionResult.totalAmountMigrated)}</span>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-emerald-200">
                    <span className="text-[11px] text-slate-500 block">Ledger Tx Type</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">OPENING_BALANCE</span>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-emerald-200">
                    <span className="text-[11px] text-slate-500 block">Reconciliation</span>
                    <span className="text-xs font-bold text-emerald-700 flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>₦0.00 Variance</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 mb-6">
          <button
            onClick={() => setActiveTab('DOCUMENT')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-2 transition ${
              activeTab === 'DOCUMENT'
                ? 'bg-university-navy text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Method A: Document Import (DOCX, XLSX, CSV, PDF)</span>
          </button>
          <button
            onClick={() => setActiveTab('MANUAL')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-2 transition ${
              activeTab === 'MANUAL'
                ? 'bg-university-navy text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Method B: Manual Student Entry</span>
          </button>
        </div>

        {/* TAB 1: DOCUMENT UPLOAD */}
        {activeTab === 'DOCUMENT' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
            <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center space-x-2">
              <Upload className="w-4 h-4 text-university-accent" />
              <span>Select Legacy Document for Extraction</span>
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Supported file formats: <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.docx</strong>, <strong>.pdf</strong>. The engine parses matric numbers, student full names, and balance entitlements.
            </p>

            <div className="border-2 border-dashed border-slate-300 hover:border-university-navy rounded-2xl p-8 text-center transition bg-slate-50 hover:bg-slate-100/50 cursor-pointer relative">
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.docx,.pdf,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="w-12 h-12 bg-university-navy/10 text-university-navy rounded-full flex items-center justify-center mx-auto mb-3">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                {selectedFile ? selectedFile.name : 'Click to browse or drop historical student document here'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                CSV, Excel (.xlsx), Word (.docx), or PDF roster documents up to 10MB
              </p>
              {uploading && (
                <div className="mt-4 flex items-center justify-center space-x-2 text-xs text-university-navy font-semibold">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Extracting, normalizing, and auditing document rows...</span>
                </div>
              )}
            </div>

            {uploadError && (
              <div className="mt-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MANUAL STUDENT ENTRY */}
        {activeTab === 'MANUAL' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                  <UserPlus className="w-4 h-4 text-university-accent" />
                  <span>Manual Student Record Entry</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter student records manually using the exact same validation rules and opening balance ledger mapping.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setManualRows([
                    ...manualRows,
                    { matricNumber: '', studentName: '', balance: '0', department: 'General Studies' },
                  ])
                }
                className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-xl border border-slate-300 transition flex items-center space-x-1"
              >
                <span>+ Add Row</span>
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {manualRows.map((row, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="w-full sm:w-1/4">
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Matric Number</label>
                    <input
                      type="text"
                      placeholder="CU/2024/XXXX"
                      value={row.matricNumber}
                      onChange={(e) => {
                        const copy = [...manualRows];
                        copy[idx].matricNumber = e.target.value;
                        setManualRows(copy);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-university-navy"
                    />
                  </div>

                  <div className="w-full sm:w-1/3">
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Student Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Amina Ibrahim"
                      value={row.studentName}
                      onChange={(e) => {
                        const copy = [...manualRows];
                        copy[idx].studentName = e.target.value;
                        setManualRows(copy);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-university-navy"
                    />
                  </div>

                  <div className="w-full sm:w-1/5">
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Opening Balance (₦)</label>
                    <input
                      type="text"
                      placeholder="e.g. 50000"
                      value={row.balance}
                      onChange={(e) => {
                        const copy = [...manualRows];
                        copy[idx].balance = e.target.value;
                        setManualRows(copy);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-university-navy"
                    />
                  </div>

                  <div className="w-full sm:w-1/4">
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Department</label>
                    <input
                      type="text"
                      placeholder="Department"
                      value={row.department}
                      onChange={(e) => {
                        const copy = [...manualRows];
                        copy[idx].department = e.target.value;
                        setManualRows(copy);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-university-navy"
                    />
                  </div>

                  {manualRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setManualRows(manualRows.filter((_, i) => i !== idx))}
                      className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition"
                      title="Remove Row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleValidateManual}
              disabled={uploading}
              className="bg-university-navy hover:bg-university-navy/90 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow transition flex items-center space-x-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-university-accent" />
              <span>Validate & Review Manual Records</span>
            </button>
          </div>
        )}

        {/* VALIDATION PREVIEW & REVIEW INTERFACE */}
        {previewSummary && previewRecords.length > 0 && (
          <div className="space-y-6 animate-fade-in">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Extracted</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{previewSummary.totalExtracted}</span>
                <span className="text-[11px] text-slate-500">{previewSummary.fileName || 'Active Import'}</span>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-sm">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Valid for Migration</span>
                <span className="text-2xl font-black text-emerald-700 mt-1 block">{previewSummary.validCount}</span>
                <span className="text-[11px] text-emerald-600">Compliant with all validation rules</span>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-rose-200 shadow-sm">
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">Requires Correction</span>
                <span className="text-2xl font-black text-rose-700 mt-1 block">{previewSummary.invalidCount}</span>
                <span className="text-[11px] text-rose-600">Format or duplicate issues flagged</span>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-university-navy/20 shadow-sm">
                <span className="text-xs font-bold text-university-navy uppercase tracking-wider block">Total Opening Liability</span>
                <span className="text-2xl font-black text-university-navy mt-1 block">{formatNaira(previewSummary.totalLiability)}</span>
                <span className="text-[11px] text-slate-500">Credited to feeding accounts</span>
              </div>
            </div>

            {/* Records Review Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Interactive Record Review & Correction Matrix</h3>
                  <p className="text-xs text-slate-500">
                    Review extracted records before committing. Click the edit icon to fix formatting or errors directly inline.
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="flex items-center space-x-1 text-emerald-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Valid</span>
                  </span>
                  <span className="flex items-center space-x-1 text-amber-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Corrected</span>
                  </span>
                  <span className="flex items-center space-x-1 text-rose-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Invalid</span>
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Matric Number</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4 text-right">Opening Balance</th>
                      <th className="py-3 px-4">Details / Errors</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRecords.map((rec, idx) => {
                      const isEditing = editingIndex === idx;

                      return (
                        <tr key={rec.tempId || idx} className={rec.validationStatus === 'INVALID' ? 'bg-rose-50/50' : 'hover:bg-slate-50/70'}>
                          <td className="py-3 px-4">
                            {rec.validationStatus === 'VALID' && (
                              <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>VALID</span>
                              </span>
                            )}
                            {rec.validationStatus === 'CORRECTED' && (
                              <span className="inline-flex items-center space-x-1 bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>CORRECTED</span>
                              </span>
                            )}
                            {rec.validationStatus === 'INVALID' && (
                              <span className="inline-flex items-center space-x-1 bg-rose-100 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                                <XCircle className="w-3 h-3" />
                                <span>INVALID</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editBuffer.matricNumber}
                                onChange={(e) => setEditBuffer({ ...editBuffer, matricNumber: e.target.value })}
                                className="px-2 py-1 bg-white border border-slate-300 rounded text-xs w-28 font-mono"
                              />
                            ) : (
                              rec.matricNumber
                            )}
                          </td>

                          <td className="py-3 px-4 font-medium text-slate-800">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editBuffer.studentName}
                                onChange={(e) => setEditBuffer({ ...editBuffer, studentName: e.target.value })}
                                className="px-2 py-1 bg-white border border-slate-300 rounded text-xs w-40"
                              />
                            ) : (
                              rec.studentName
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-600">
                            {rec.department || 'General Studies'}
                          </td>

                          <td className="py-3 px-4 text-right font-extrabold text-university-navy">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editBuffer.importedBalance}
                                onChange={(e) => setEditBuffer({ ...editBuffer, importedBalance: e.target.value })}
                                className="px-2 py-1 bg-white border border-slate-300 rounded text-xs w-24 text-right"
                              />
                            ) : (
                              formatNaira(rec.importedBalance)
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-500">
                            {rec.errorMessage ? (
                              <span className="text-rose-600 font-semibold flex items-center space-x-1">
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>{rec.errorMessage}</span>
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-medium">Ready for opening ledger entry</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            {isEditing ? (
                              <button
                                type="button"
                                onClick={() => saveEdit(idx)}
                                className="text-emerald-600 hover:text-emerald-800 p-1 rounded hover:bg-emerald-50 transition"
                                title="Save corrections"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEdit(idx)}
                                className="text-slate-500 hover:text-university-navy p-1 rounded hover:bg-slate-100 transition"
                                title="Edit & correct record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Execution Actions */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Ready to Commit Authoritative Opening Balances?</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirming this batch will atomically write immutable <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-university-navy">OPENING_BALANCE</code> ledger records and update student balances.
                </p>
                {executionError && (
                  <p className="text-xs text-rose-600 font-semibold mt-2">{executionError}</p>
                )}
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewRecords([]);
                    setPreviewSummary(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-300 transition"
                >
                  Discard Batch
                </button>

                <button
                  type="button"
                  disabled={executing || previewSummary.validCount === 0}
                  onClick={handleExecuteMigration}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {executing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Committing Opening Balances...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Confirm & Migrate {previewSummary.validCount} Student Records ({formatNaira(previewSummary.totalLiability)})</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

