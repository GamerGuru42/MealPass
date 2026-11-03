'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { CosmopolitanCrest } from '@/components/shared/logo';
import {
  Home,
  Receipt,
  Wallet,
  Store,
  ArrowLeftRight,
  User,
  HelpCircle,
  Bell,
  Search,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  GraduationCap,
  UtensilsCrossed,
  ShieldCheck,
  CheckCircle2,
  Utensils,
  UserCheck,
  LogOut,
} from 'lucide-react';

interface StudentShellProps {
  children: React.ReactNode;
  studentName?: string;
  matricNumber?: string;
  onSearch?: (query: string) => void;
  selectedCampusId?: string;
  onSelectCampus?: (campusId: string) => void;
}

export function StudentShell({
  children,
  studentName = 'Cosmopolitan Student',
  matricNumber = '',
  onSearch,
  selectedCampusId = 'c0000000-0000-0000-0000-000000000001',
  onSelectCampus,
}: StudentShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCampusId, setCurrentCampusId] = useState(selectedCampusId);

  const [currentStudentName, setCurrentStudentName] = useState(studentName);
  const [currentMatricNumber, setCurrentMatricNumber] = useState(matricNumber);

  React.useEffect(() => {
    if (studentName && studentName !== 'Cosmopolitan Student') {
      setCurrentStudentName(studentName);
      if (matricNumber) setCurrentMatricNumber(matricNumber);
      return;
    }

    let isMounted = true;
    fetch('/api/auth/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.authenticated && data.user) {
          if (data.user.name) setCurrentStudentName(data.user.name);
          if (data.user.matricNumber) setCurrentMatricNumber(data.user.matricNumber);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [studentName, matricNumber]);

  const initials = currentStudentName && currentStudentName.trim()
    ? currentStudentName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'CU';

  const navItems = [
    { label: 'Home', href: '/student', icon: Home, exact: true },
    { label: 'Campus Menu', href: '/student/menu', icon: Store },
    { label: 'My Orders', href: '/student/orders', icon: Receipt },
    { label: 'Feeding Balance', href: '/student/account', icon: Wallet },
    { label: 'Purchase History', href: '/student/transactions', icon: ArrowLeftRight },
    { label: 'Profile', href: '/student/account', icon: User },
    {
      label: 'Help & Support',
      href: '#support',
      icon: HelpCircle,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        setSupportModalOpen(true);
      },
    },
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (onSearch) onSearch(val);
  };

  const handleCampusChange = (cid: string) => {
    setCurrentCampusId(cid);
    if (onSelectCampus) onSelectCampus(cid);
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] flex flex-col lg:flex-row antialiased text-slate-900">
      {/* =========================================================================
          DESKTOP SIDEBAR (Matches Mockup)
      ========================================================================== */}
      <aside className="hidden lg:flex flex-col justify-between w-64 xl:w-72 bg-[#091527] text-white h-screen sticky top-0 p-5 shrink-0 z-40 border-r border-slate-800/80 select-none overflow-y-auto">
        <div className="space-y-6">
          {/* University & MealPass Brand */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-3 group">
              <CosmopolitanCrest className="w-10 h-10 group-hover:scale-105 transition-transform shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-slate-300 font-semibold font-serif leading-tight">
                  COSMOPOLITAN
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold font-serif leading-tight">
                  UNIVERSITY
                </span>
              </div>
            </Link>

            {/* MealPass Logo with Cutlery */}
            <div className="flex items-center gap-2.5 pt-1 border-t border-slate-800/60">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <span className="text-xl font-black tracking-tight text-white">
                Meal<span className="text-amber-400">Pass</span>
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 pt-2" aria-label="Sidebar Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.label === 'Home'
                  ? pathname === '/' || pathname === '/student'
                  : item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href) && item.href !== '#support';

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={item.onClick}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Campus Promo Card (Matches Mockup) */}
        <div className="mt-6 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 p-3.5 text-center text-white relative overflow-hidden shadow-sm">
          <div className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 mx-auto flex items-center justify-center mb-1.5">
            <GraduationCap className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold leading-tight">Smart Dining.</p>
          <p className="text-[11px] text-slate-300 leading-tight">Better Campus Life.</p>
          <div className="mt-3 rounded-xl overflow-hidden h-20 relative w-full border border-white/10">
            <img
              src="/images/campus-building.jpg"
              alt="Cosmopolitan University Campus"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
          </div>
        </div>
      </aside>

      {/* =========================================================================
          MOBILE DRAWER / OVERLAY
      ========================================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-[#091527] text-white h-full p-5 flex flex-col justify-between z-10 shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CosmopolitanCrest className="w-9 h-9" />
                  <span className="text-lg font-black text-white">
                    Meal<span className="text-amber-400">Pass</span>
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.label === 'Home'
                      ? pathname === '/' || pathname === '/student'
                      : item.exact
                      ? pathname === item.href
                      : pathname.startsWith(item.href) && item.href !== '#support';

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={(e) => {
                        if (item.onClick) item.onClick(e);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium ${
                        isActive
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-800 text-center">
              <p className="text-xs text-slate-400">Cosmopolitan University</p>
              <p className="text-[10px] text-slate-500 mt-0.5">MealPass Digital Dining Portal</p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN APPLICATION AREA (TOP BAR + CONTENT)
      ========================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar (Matches Mockup) */}
        <header className="sticky top-0 z-30 bg-[#f4f6fb]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between border-b border-slate-200/60 gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-200/60"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Pill Search Bar */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search food, cafeteria or services..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full bg-white text-slate-800 placeholder-slate-400 text-xs sm:text-sm pl-11 pr-4 py-2.5 rounded-full border border-slate-200/80 shadow-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>

          {/* Two-Campus Switcher (Main Campus / Alma House vs Kado Campus) */}
          <div className="hidden md:flex items-center gap-1 bg-white p-1 rounded-full border border-slate-200/80 shadow-2xs text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleCampusChange('c0000000-0000-0000-0000-000000000001')}
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                currentCampusId === 'c0000000-0000-0000-0000-000000000001'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Main Campus (Alma House)</span>
            </button>
            <button
              type="button"
              onClick={() => handleCampusChange('c0000000-0000-0000-0000-000000000002')}
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                currentCampusId === 'c0000000-0000-0000-0000-000000000002'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Kado Campus</span>
            </button>
          </div>

          {/* Right Header Icons & Profile */}
          <div className="flex items-center gap-3.5 shrink-0">
            {/* Notification Bell with Badge */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="w-10 h-10 rounded-full bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50 flex items-center justify-center relative shadow-xs transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                  2
                </span>
              </button>

              {/* Notification Dropdown Preview */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-1">
                    <span className="font-bold text-xs text-slate-900">Notifications</span>
                    <span className="text-[10px] text-blue-600 font-semibold cursor-pointer">Mark all read</span>
                  </div>
                  <div className="py-2 space-y-2 text-xs">
                    <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100 text-slate-800">
                      <p className="font-semibold text-blue-950">Feeding Bursary Allocated</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">Your bursary has been credited for the semester.</p>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-100 text-slate-800">
                      <p className="font-semibold text-amber-950">Daily Meal Limit Reminder</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">You have meals remaining for today at Main Cafeteria.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Student Profile Chip (Matches Mockup) */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 sm:pr-3 rounded-full bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                  {initials}
                </div>
                <div className="hidden sm:flex flex-col leading-none">
                  <span className="text-xs font-bold text-slate-900">{currentStudentName}</span>
                  <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {currentMatricNumber ? currentMatricNumber : 'Student'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
                  <div className="p-2 border-b border-slate-100">
                    <p className="font-bold text-slate-900">{currentStudentName}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{currentMatricNumber || 'Student Dining'}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/student/account"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Account Settings</span>
                    </Link>
                    <Link
                      href="/student/transactions"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50"
                    >
                      <Wallet className="w-4 h-4 text-slate-400" />
                      <span>Feeding Balance</span>
                    </Link>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-left font-semibold"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setSupportModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      <span>Help & Support</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto pb-24 lg:pb-12">
          {children}
        </main>
      </div>

      {/* =========================================================================
          HELP & SUPPORT MODAL
      ========================================================================== */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">MealPass Help & Support</h3>
              </div>
              <button
                onClick={() => setSupportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>For assistance with your MealPass account, feeding bursary, or transaction disputes, contact the campus dining center:</p>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 font-mono text-[11px]">
                <p>📍 Location: Student Activities Center, Main Campus</p>
                <p>📧 Email: dining@cosmopolitan.edu.ng</p>
                <p>📞 Phone: +234 (0) 901 000 MEAL</p>
                <p>⏰ Hours: 7:30 AM – 7:00 PM (Daily)</p>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-medium bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>All MealPass transactions are cryptographically verified and immutable.</span>
              </div>
            </div>

            <button
              onClick={() => setSupportModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MOBILE BOTTOM NAVIGATION (Thumb-friendly 1-tap navigation for mobile)
      ========================================================================== */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1 shadow-lg"
        aria-label="Mobile Bottom Nav"
      >
        <div className="grid grid-cols-5 text-center">
          {[
            { label: 'Home', href: '/student', icon: Home, exact: true },
            { label: 'Menu', href: '/student/menu', icon: Utensils },
            { label: 'Orders', href: '/student/orders', icon: Receipt },
            { label: 'History', href: '/student/transactions', icon: ArrowLeftRight },
            { label: 'Wallet', href: '/student/account', icon: Wallet },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 transition-colors ${
                  isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                <span className="text-[10px] mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

