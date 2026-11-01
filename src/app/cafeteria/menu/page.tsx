'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { formatNaira } from '@/lib/utils';
import {
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  History,
  Tag,
  ArrowLeft,
  Search,
  Loader2,
  AlertTriangle,
  UtensilsCrossed,
  Sparkles,
} from 'lucide-react';

interface MenuItem {
  id: string;
  cafeteriaId: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  displayOrder?: number;
  isAffordableFeatured?: boolean;
}

interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  display_order?: number;
}

export default function CafeteriaMenuManagementPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedCafeteriaId, setSelectedCafeteriaId] = useState<string>('c0000000-0000-0000-0000-000000000001');
  const campusName = selectedCafeteriaId === 'c0000000-0000-0000-0000-000000000001' ? 'Main Campus (Alma House)' : 'Kado Campus';

  // Modals state
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [newPriceInput, setNewPriceInput] = useState<string>('');
  const [priceReason, setPriceReason] = useState<string>('');
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  // Add Dish state
  const [isAddingDish, setIsAddingDish] = useState(false);
  const [newDishName, setNewDishName] = useState('');
  const [newDishCategoryId, setNewDishCategoryId] = useState('');
  const [newDishPrice, setNewDishPrice] = useState('');
  const [newDishDesc, setNewDishDesc] = useState('');
  const [newDishImageUrl, setNewDishImageUrl] = useState('');
  const [newDishAvailable, setNewDishAvailable] = useState(true);
  const [isCreatingDish, setIsCreatingDish] = useState(false);

  // Notifications
  const [statusNotice, setStatusNotice] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fetchMenuData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/menu?cafeteriaId=${selectedCafeteriaId}`);
      if (!res.ok) throw new Error('Failed to load menu');
      const json = await res.json();
      if (json.success) {
        setMenu(json.data || []);
        if (json.categories && json.categories.length > 0) {
          setCategories(json.categories);
          if (!newDishCategoryId) {
            setNewDishCategoryId(json.categories[0].id);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading cafeteria menu';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedCafeteriaId, newDishCategoryId]);

  useEffect(() => {
    fetchMenuData();
  }, [fetchMenuData]);

  // Toggle availability with optimistic update
  const handleToggleAvailability = async (item: MenuItem) => {
    const updatedAvailability = !item.isAvailable;

    // Optimistic UI update
    setMenu((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, isAvailable: updatedAvailability } : m))
    );

    try {
      const res = await fetch('/api/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          isAvailable: updatedAvailability,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update availability in database');
      }

      setStatusNotice(
        `"${item.name}" is now marked as ${updatedAvailability ? 'AVAILABLE' : 'SOLD OUT'}.`
      );
      setTimeout(() => setStatusNotice(''), 3000);
    } catch (err: unknown) {
      // Revert optimistic update
      setMenu((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, isAvailable: !updatedAvailability } : m))
      );
      const msg = err instanceof Error ? err.message : 'Failed to update availability';
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(''), 4000);
    }
  };

  // Toggle affordable meal designation (Cafeteria Head authority)
  const handleToggleAffordable = async (item: MenuItem) => {
    const updatedAffordable = !item.isAffordableFeatured;

    // Optimistic UI update
    setMenu((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, isAffordableFeatured: updatedAffordable } : m))
    );

    try {
      const res = await fetch('/api/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          isAffordableFeatured: updatedAffordable,
          role: 'CAFETERIA_HEAD',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update affordable meal designation');
      }

      setStatusNotice(
        `"${item.name}" ${updatedAffordable ? 'is now designated as an Affordable Choice' : 'is no longer designated as an Affordable Choice'}.`
      );
      setTimeout(() => setStatusNotice(''), 3000);
    } catch (err: unknown) {
      // Revert optimistic update
      setMenu((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, isAffordableFeatured: !updatedAffordable } : m))
      );
      const msg = err instanceof Error ? err.message : 'Failed to update affordable status';
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(''), 4000);
    }
  };

  // Open Edit Price modal
  const handleStartPriceEdit = (item: MenuItem) => {
    setEditingItem(item);
    setNewPriceInput(String(item.price));
    setPriceReason('');
    setErrorMessage('');
  };

  // Save new price with mandatory audit reason
  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const parsedPrice = parseFloat(newPriceInput);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setErrorMessage('Please enter a valid price greater than zero.');
      return;
    }

    if (!priceReason.trim() || priceReason.trim().length < 3) {
      setErrorMessage('Mandatory audit reason required (minimum 3 characters).');
      return;
    }

    try {
      setIsSavingPrice(true);
      const res = await fetch('/api/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          newPrice: parsedPrice,
          reason: priceReason.trim(),
          role: 'CAFETERIA_HEAD',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update price in database');
      }

      // Update local state
      setMenu((prev) =>
        prev.map((m) => (m.id === editingItem.id ? { ...m, price: parsedPrice } : m))
      );

      setStatusNotice(
        `Price for "${editingItem.name}" updated to ₦${parsedPrice.toLocaleString()} (Recorded in Price History). Existing student orders retain historical price.`
      );
      setEditingItem(null);
      setTimeout(() => setStatusNotice(''), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update price';
      setErrorMessage(msg);
    } finally {
      setIsSavingPrice(false);
    }
  };

  // Add new dish flow (Text-First in 20 seconds)
  const handleCreateDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDishName.trim()) {
      setErrorMessage('Dish name is required');
      return;
    }
    const parsedPrice = parseFloat(newDishPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setErrorMessage('Price must be greater than zero');
      return;
    }
    const catId = newDishCategoryId || categories[0]?.id || 'd0000000-0000-0000-0000-000000000001';

    try {
      setIsCreatingDish(true);
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cafeteriaId: selectedCafeteriaId,
          categoryId: catId,
          name: newDishName.trim(),
          description: newDishDesc.trim() || undefined,
          imageUrl: newDishImageUrl.trim() || undefined,
          currentPrice: parsedPrice,
          isAvailable: newDishAvailable,
          displayOrder: menu.length + 1,
          role: 'CAFETERIA_HEAD',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to add dish to live menu');
      }

      setStatusNotice(`"${newDishName.trim()}" published successfully to today's live menu!`);
      setIsAddingDish(false);
      setNewDishName('');
      setNewDishPrice('');
      setNewDishDesc('');
      setNewDishImageUrl('');
      setNewDishAvailable(true);

      // Refresh live menu from database
      await fetchMenuData();
      setTimeout(() => setStatusNotice(''), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create dish';
      setErrorMessage(msg);
    } finally {
      setIsCreatingDish(false);
    }
  };

  // Filtered menu items
  const filteredMenu = menu.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'ALL' || item.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16">
      <Header
        roleName="Cafeteria Head (Madam)"
        userName="Madam Margaret Okonkwo"
        matricNumber="HEAD-01"
      />

      {/* Sub Header & Quick Nav */}
      <div className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-8 sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/cafeteria"
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
              title="Return to Live Kitchen Queue"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-slate-900">
                  Menu & Pricing Management
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase tracking-wider">
                  Madam Level Authority
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {campusName} • Live Supabase PostgreSQL database
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Campus Selector Pill */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setSelectedCafeteriaId('c0000000-0000-0000-0000-000000000001')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  selectedCafeteriaId === 'c0000000-0000-0000-0000-000000000001'
                    ? 'bg-university-navy text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Main Campus
              </button>
              <button
                type="button"
                onClick={() => setSelectedCafeteriaId('c0000000-0000-0000-0000-000000000002')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  selectedCafeteriaId === 'c0000000-0000-0000-0000-000000000002'
                    ? 'bg-university-navy text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kado Campus
              </button>
            </div>

            <Link
              href="/cafeteria"
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
            >
              Live Kitchen Queue
            </Link>
            <button
              onClick={() => {
                setIsAddingDish(true);
                setErrorMessage('');
              }}
              className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Dish</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 pt-6 space-y-6">
        {/* Status Notices */}
        {statusNotice && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{statusNotice}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Historical Price Protection Rule Notice */}
        <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-950 text-xs flex items-start gap-3">
          <History className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-extrabold text-blue-900">Historical Financial Price Decoupling</h3>
            <p className="text-blue-800/90 mt-0.5 leading-relaxed">
              When updating a dish&apos;s current price, the authoritative PostgreSQL database stores an audit record in{' '}
              <code className="font-mono bg-blue-100/80 px-1 py-0.5 rounded font-bold">menu_item_price_history</code>.
              All existing or historical student orders permanently preserve the exact price active at checkout.
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dishes by name or ingredient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                selectedCategory === 'ALL'
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Categories ({menu.length})
            </button>
            {categories.map((cat) => {
              const count = menu.filter((m) => m.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Menu Items Table / Cards */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Active Cafeteria Dishes ({filteredMenu.length})
              </h3>
              <p className="text-xs text-slate-500">
                Text-first configuration • Live updates visible instantly to all student terminals
              </p>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                <span>Syncing with Supabase...</span>
              </div>
            )}
          </div>

          {loading && menu.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
              <p className="text-xs font-medium">Loading live menu from database...</p>
            </div>
          ) : filteredMenu.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <UtensilsCrossed className="w-8 h-8 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">No dishes match your filter</p>
              <p className="text-xs text-slate-400">Try adjusting your search terms or category selection.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-6">Dish Details</th>
                    <th className="py-3.5 px-6">Category</th>
                    <th className="py-3.5 px-6 font-mono">Current Price</th>
                    <th className="py-3.5 px-6">Live Status</th>
                    <th className="py-3.5 px-6">Affordable Tag</th>
                    <th className="py-3.5 px-6 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMenu.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 max-w-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm block">
                            {item.name}
                          </span>
                          {item.isAffordableFeatured && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                              <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                              Affordable
                            </span>
                          )}
                        </div>
                        {item.description ? (
                          <span className="text-slate-500 line-clamp-1 mt-0.5">
                            {item.description}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            No description provided
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {item.categoryName}
                        </span>
                      </td>

                      <td className="py-4 px-6 font-mono font-black text-sm text-brand-900">
                        {formatNaira(item.price)}
                      </td>

                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleToggleAvailability(item)}
                          title={`Click to mark ${item.isAvailable ? 'Sold Out' : 'Available'}`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                            item.isAvailable
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 active:scale-95'
                              : 'bg-rose-100 text-rose-800 hover:bg-rose-200 active:scale-95'
                          }`}
                        >
                          {item.isAvailable ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>In Stock</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Sold Out</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleToggleAffordable(item)}
                          title="Click to toggle Affordable Meal recommendation tag for students"
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                            item.isAffordableFeatured
                              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          <Sparkles className={`w-3 h-3 ${item.isAffordableFeatured ? 'text-amber-600 fill-amber-500' : 'text-slate-400'}`} />
                          <span>{item.isAffordableFeatured ? 'Affordable Choice' : 'Mark Affordable'}</span>
                        </button>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleStartPriceEdit(item)}
                          className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer text-xs"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Update Price</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Edit Price Modal */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Update Dish Price
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Changing price for <strong className="text-slate-800">{editingItem.name}</strong>
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-mono font-bold">
                Old: {formatNaira(editingItem.price)}
              </span>
            </div>

            <form onSubmit={handleSavePrice} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  New Price in Naira (₦):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    ₦
                  </span>
                  <input
                    type="number"
                    step="50"
                    min="50"
                    required
                    value={newPriceInput}
                    onChange={(e) => setNewPriceInput(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 font-mono font-black text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g. 1500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Operational Audit Reason (Mandatory):
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Semester food price review / meat wholesale cost increase"
                  value={priceReason}
                  onChange={(e) => setPriceReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Recorded permanently in <code className="font-mono">menu_item_price_history</code> for university audit.
                </p>
              </div>

              {errorMessage && (
                <p className="text-xs text-rose-600 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{errorMessage}</span>
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSavingPrice}
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPrice}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isSavingPrice ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <span>Save New Price</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Dish Modal (Text-First in 20 seconds) */}
      {isAddingDish && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Publish New Dish (Text-First)
                </h3>
                <p className="text-xs text-slate-500">
                  Add dish to Main Campus Cafeteria menu in 20 seconds
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateDish} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Dish Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Asun Fried Rice Special"
                  value={newDishName}
                  onChange={(e) => setNewDishName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Category *
                  </label>
                  <select
                    value={newDishCategoryId}
                    onChange={(e) => setNewDishCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Price in Naira (₦) *
                  </label>
                  <input
                    type="number"
                    step="50"
                    min="50"
                    required
                    placeholder="e.g. 1500"
                    value={newDishPrice}
                    onChange={(e) => setNewDishPrice(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description of dish portions or ingredients..."
                  value={newDishDesc}
                  onChange={(e) => setNewDishDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Image URL <span className="text-slate-400 font-normal">(Optional - Text-First configuration)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://... (Optional - photos are not required to publish)"
                  value={newDishImageUrl}
                  onChange={(e) => setNewDishImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="dishAvailableCheckbox"
                  checked={newDishAvailable}
                  onChange={(e) => setNewDishAvailable(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                />
                <label
                  htmlFor="dishAvailableCheckbox"
                  className="text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Make immediately available for ordering upon publishing
                </label>
              </div>

              {errorMessage && (
                <p className="text-xs text-rose-600 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{errorMessage}</span>
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isCreatingDish}
                  onClick={() => setIsAddingDish(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingDish}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isCreatingDish ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Publishing Dish...</span>
                    </>
                  ) : (
                    <span>Publish Dish Live</span>
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
