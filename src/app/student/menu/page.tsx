'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StudentShell } from '@/components/layout/student-shell';
import { PinModal } from '@/components/student/pin-modal';
import { ReceiptModal, ReceiptOrder } from '@/components/student/receipt-modal';
import { formatNaira } from '@/lib/utils';
import {
  Plus,
  Minus,
  ShoppingBag,
  Trash2,
  AlertCircle,
  Search,
  CheckCircle2,
  UtensilsCrossed,
  RefreshCw,
  Sparkles,
  Calculator,
  ChevronRight,
  SlidersHorizontal,
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

interface AffordableMealCombo {
  id: string;
  name: string;
  description: string;
  budgetTier: string;
  maxBudget: number;
  items: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  totalPrice: number;
  isAvailable: boolean;
  unavailableItemNames: string[];
}

export default function StudentMenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [combos, setCombos] = useState<AffordableMealCombo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [balance, setBalance] = useState<number>(50000);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<string>('');

  // Prompt 8: Affordability Layer Filters
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | null>(null);
  const [budgetSelector, setBudgetSelector] = useState<number | null>(null);
  const [showCombosSection, setShowCombosSection] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Modals & submission state
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<ReceiptOrder | null>(null);
  const [createdLedgerEntry, setCreatedLedgerEntry] = useState<any | null>(null);
  const [previousBalSnapshot, setPreviousBalSnapshot] = useState<number>(50000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCheckoutKey, setActiveCheckoutKey] = useState<string>('');

  // Fetch live menu, combos, and student balance
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [menuRes, dashRes] = await Promise.all([
        fetch('/api/menu'),
        fetch('/api/student/dashboard?studentProfileId=f0000000-0000-0000-0000-000000000001'),
      ]);

      if (menuRes.ok) {
        const menuJson = await menuRes.json();
        if (menuJson.success && Array.isArray(menuJson.data)) {
          setMenuItems(menuJson.data);
          if (Array.isArray(menuJson.combos)) {
            setCombos(menuJson.combos);
          }
        }
      }

      if (dashRes.ok) {
        const dashJson = await dashRes.json();
        if (dashJson.success && dashJson.data?.financial?.balance !== undefined) {
          setBalance(Number(dashJson.data.financial.balance));
        }
      }
    } catch (err) {
      console.error('Failed to load menu or balance:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddToCart = (itemId: string) => {
    const item = menuItems.find((m) => m.id === itemId);
    if (!item || !item.isAvailable) return;

    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[itemId] > 1) {
        updated[itemId] -= 1;
      } else {
        delete updated[itemId];
      }
      return updated;
    });
  };

  const handleClearCart = () => setCart({});

  // 1-Click Add Entire Affordable Combo to Cart
  const handleAddComboToCart = (combo: AffordableMealCombo) => {
    if (!combo.isAvailable) return;

    setCart((prev) => {
      const updated = { ...prev };
      for (const item of combo.items) {
        updated[item.menuItemId] = (updated[item.menuItemId] || 0) + item.quantity;
      }
      return updated;
    });

    setToastMessage(`Added "${combo.name}" (${formatNaira(combo.totalPrice)}) to your tray!`);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Categories list
  const categories = [
    { id: 'all', name: 'All Dishes' },
    { id: 'd0000000-0000-0000-0000-000000000001', name: 'Mains' },
    { id: 'd0000000-0000-0000-0000-000000000002', name: 'Proteins' },
    { id: 'd0000000-0000-0000-0000-000000000003', name: 'Sides & Swallows' },
    { id: 'd0000000-0000-0000-0000-000000000004', name: 'Drinks & Refreshments' },
  ];

  // Price Filters presets
  const priceFilterOptions = [
    { label: 'All Prices', value: null },
    { label: 'Under ₦500', value: 500 },
    { label: 'Under ₦1,000', value: 1000 },
    { label: 'Under ₦1,500', value: 1500 },
    { label: 'Under ₦2,000', value: 2000 },
    { label: 'Under ₦3,000', value: 3000 },
  ];

  // Budget Selector options
  const budgetSelectorOptions = [
    { label: '₦500', value: 500 },
    { label: '₦1,000', value: 1000 },
    { label: '₦1,500', value: 1500 },
    { label: '₦2,000', value: 2000 },
    { label: '₦3,000', value: 3000 },
    { label: 'My Balance', value: balance },
  ];

  // Filter items based on Category, Search, Price Filter, and Budget Selector
  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' ||
      item.categoryId === selectedCategory ||
      item.categoryName.toLowerCase() === selectedCategory.toLowerCase();

    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriceFilter = maxPriceFilter !== null ? item.price <= maxPriceFilter : true;
    const matchesBudget = budgetSelector !== null ? item.price <= budgetSelector : true;

    return matchesCategory && matchesSearch && matchesPriceFilter && matchesBudget;
  });

  // Filter combos based on price filter and budget selector
  const filteredCombos = combos.filter((c) => {
    const matchesPriceFilter = maxPriceFilter !== null ? c.totalPrice <= maxPriceFilter : true;
    const matchesBudget = budgetSelector !== null ? c.totalPrice <= budgetSelector : true;
    return matchesPriceFilter && matchesBudget;
  });

  // Calculate cart total
  const cartItemKeys = Object.keys(cart);
  const cartItemsDetailed = cartItemKeys
    .map((id) => {
      const item = menuItems.find((m) => m.id === id);
      if (!item) return null;
      return {
        menuItem: item,
        quantity: cart[id],
        subtotal: item.price * cart[id],
      };
    })
    .filter(Boolean) as Array<{
    menuItem: MenuItem;
    quantity: number;
    subtotal: number;
  }>;

  const cartTotal = cartItemsDetailed.reduce((sum, i) => sum + i.subtotal, 0);
  const hasInsufficientBalance = cartTotal > balance;
  const shortfallAmount = cartTotal - balance;
  const remainingCartBalance = balance - cartTotal;

  const handleStartCheckout = () => {
    if (cartTotal <= 0) return;
    if (hasInsufficientBalance) return;
    setPreviousBalSnapshot(balance);
    setActiveCheckoutKey(`checkout-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    setIsPinModalOpen(true);
  };

  const handleAuthorizeOrder = async (pin: string) => {
    if (typeof window !== 'undefined' && !navigator.onLine) {
      throw new Error('You are currently offline. An active internet connection is required to authorize deductions.');
    }

    setIsSubmitting(true);
    try {
      const payload = {
        cafeteriaId: 'c0000000-0000-0000-0000-000000000001',
        items: cartItemsDetailed.map((i) => ({
          menuItemId: i.menuItem.id,
          quantity: i.quantity,
        })),
        notes: notes.trim() || null,
        pin,
        idempotencyKey: activeCheckoutKey,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to place order.');
      }

      const orderData = json.data.order;
      const ledgerData = json.data.ledgerEntry;

      // Update state with newly created order
      const newBal = Number(ledgerData.running_balance);
      setBalance(newBal);
      setCreatedLedgerEntry({
        id: ledgerData.id,
        runningBalance: newBal,
        amount: Number(ledgerData.amount),
      });
      setCreatedOrder({
        id: orderData.id,
        orderNumber: orderData.order_number,
        studentName: 'Amina Ibrahim',
        matricNumber: 'CU/2024/0142',
        cafeteriaName: 'Main Campus Cafeteria',
        status: orderData.status,
        totalAmount: Number(orderData.total_amount),
        pickupCode: orderData.pickup_code,
        placedAt: orderData.placed_at || new Date().toISOString(),
        items: cartItemsDetailed.map((i) => ({
          itemName: i.menuItem.name,
          unitPrice: i.menuItem.price,
          quantity: i.quantity,
          subtotal: i.subtotal,
        })),
      });

      // Clear cart
      setCart({});
      setNotes('');
      setIsPinModalOpen(false);
      setIsReceiptModalOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StudentShell studentName="Benny Iduoku-Ben" matricNumber="CU/2024/0142">
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-4 z-50 bg-brand-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2 border border-brand-700"
        >
          <Sparkles className="w-4 h-4 text-gold-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Page Title & Balance Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Main Campus Dining Hall
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-700">Kitchen Open</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              Digital Cafeteria Menu
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Select dishes, explore affordable combinations, and authorize deductions transparently with your MealPass PIN.
            </p>
          </div>

          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 sm:text-right shrink-0">
            <span className="text-[11px] text-slate-500 font-medium block">
              Available Meal Balance
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-brand-900 font-mono">
              {formatNaira(balance)}
            </span>
            <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
              Authoritative Supabase Ledger
            </span>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* PROMPT 8: "WHAT CAN I AFFORD?" BUDGET SELECTOR                */}
        {/* ------------------------------------------------------------- */}
        <div className="bg-linear-to-r from-amber-50/80 via-white to-amber-50/40 rounded-3xl border border-amber-200/80 p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-brand-950 flex items-center justify-center font-bold">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  What Can I Afford?
                </h2>
                <p className="text-xs text-slate-500">
                  Select a spending target to instantly highlight dishes and combinations within budget.
                </p>
              </div>
            </div>

            {budgetSelector !== null && (
              <button
                onClick={() => setBudgetSelector(null)}
                className="text-xs text-amber-800 font-bold hover:underline shrink-0 self-start sm:self-auto"
              >
                Clear Budget Limit
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {budgetSelectorOptions.map((opt) => {
              const isSelected = budgetSelector === opt.value;
              return (
                <button
                  key={opt.label}
                  onClick={() => setBudgetSelector(isSelected ? null : opt.value)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[40px] flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500 text-brand-950 font-black shadow-xs ring-2 ring-amber-400'
                      : 'bg-white border border-amber-200/80 text-slate-700 hover:bg-amber-50'
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`Filter items under ${opt.label}`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-brand-950" />}
                </button>
              );
            })}
          </div>

          {budgetSelector !== null && (
            <div className="text-xs text-amber-900 bg-amber-100/60 rounded-xl px-3.5 py-2 font-medium flex items-center justify-between">
              <span>
                Showing meals and combinations under <strong>{formatNaira(budgetSelector)}</strong> ({filteredItems.length} items, {filteredCombos.length} combos available).
              </span>
              <span className="font-bold text-amber-800">
                {budgetSelector <= balance ? 'Within your balance' : 'Exceeds balance'}
              </span>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* PROMPT 8: AFFORDABLE MEAL COMBINATIONS ("MEAL IDEAS")         */}
        {/* ------------------------------------------------------------- */}
        {showCombosSection && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-extrabold text-slate-900">
                  Affordable Meal Ideas &amp; Combos
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                  {filteredCombos.length} curated
                </span>
              </div>
              <button
                onClick={() => setShowCombosSection(!showCombosSection)}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium"
              >
                {showCombosSection ? 'Hide Ideas' : 'Show Ideas'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredCombos.map((combo) => {
                const isComboAffordable = balance >= combo.totalPrice;
                const afterComboBalance = balance - combo.totalPrice;
                const comboShortfall = combo.totalPrice - balance;

                return (
                  <div
                    key={combo.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between hover:border-amber-300 transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                          {combo.budgetTier.replace('_', ' ')}
                        </span>
                        <span className="font-extrabold text-sm text-brand-900 font-mono">
                          {formatNaira(combo.totalPrice)}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-slate-900 mt-1.5">
                        {combo.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {combo.description}
                      </p>

                      {/* Included Items */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-0.5">
                        {combo.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center text-slate-500">
                            <span>{it.quantity}x {it.name}</span>
                            <span className="font-mono text-slate-700">{formatNaira(it.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Affordability Context & 1-Click Action */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        {isComboAffordable ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Within balance
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-700">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            Exceeds balance
                          </span>
                        )}

                        <span className="font-mono text-slate-500 text-[10px]">
                          {isComboAffordable
                            ? `After: ${formatNaira(afterComboBalance)}`
                            : `Short by: ${formatNaira(comboShortfall)}`}
                        </span>
                      </div>

                      {combo.isAvailable ? (
                        <button
                          onClick={() => handleAddComboToCart(combo)}
                          className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-brand-950 font-bold text-xs shadow-2xs active:scale-95 transition-transform flex items-center justify-center gap-1.5 min-h-[38px]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Combo to Tray</span>
                        </button>
                      ) : (
                        <div className="w-full py-2 px-3 rounded-xl bg-slate-100 text-slate-400 font-semibold text-center text-xs">
                          Partially Sold Out ({combo.unavailableItemNames.join(', ')})
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PROMPT 8: "MEALS UNDER" QUICK PRICE FILTERS                   */}
        {/* ------------------------------------------------------------- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              Filter by Price Tier
            </span>
            {maxPriceFilter !== null && (
              <button
                onClick={() => setMaxPriceFilter(null)}
                className="text-xs text-brand-700 font-bold hover:underline"
              >
                Reset Price Filter
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {priceFilterOptions.map((opt) => {
              const isSelected = maxPriceFilter === opt.value;
              return (
                <button
                  key={opt.label}
                  onClick={() => setMaxPriceFilter(opt.value)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[44px] flex items-center ${
                    isSelected
                      ? 'bg-brand-900 text-white shadow-xs font-black'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`Price filter: ${opt.label}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Category Pills */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Search menu items by dish or drink name"
              placeholder="Search jollof rice, chicken, soup, drinks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-colors min-h-[44px] flex items-center ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items Grid */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-600" />
            <span className="text-xs font-medium">Loading live university menu...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 bg-white rounded-3xl border border-slate-200 text-center p-6">
            <UtensilsCrossed className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No dishes match your budget or filter</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting the price tier or category selection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredItems.map((item) => {
              const qtyInCart = cart[item.id] || 0;
              const isAffordable = balance >= item.price;
              const afterPurchase = balance - item.price;
              const shortfall = item.price - balance;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                            {item.categoryName}
                          </span>
                          {item.isAffordableFeatured && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                              <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                              Affordable Choice
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-base text-slate-900 mt-1.5">{item.name}</h3>
                      </div>
                      <span className="font-extrabold text-base text-brand-900 font-mono shrink-0">
                        {formatNaira(item.price)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{item.description}</p>

                    {/* PROMPT 8: BALANCE-AWARE AFFORDABILITY INDICATOR */}
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      {isAffordable ? (
                        <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Within balance</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-rose-800 font-semibold">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Exceeds balance</span>
                        </div>
                      )}

                      <span className="font-mono text-[11px] text-slate-500">
                        {isAffordable
                          ? `After purchase: ${formatNaira(afterPurchase)}`
                          : `Short by: ${formatNaira(shortfall)}`}
                      </span>
                    </div>
                  </div>

                  {/* Availability & Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      {item.isAvailable ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Sold Out
                        </span>
                      )}
                    </div>

                    {item.isAvailable && (
                      <div className="flex items-center gap-2">
                        {qtyInCart > 0 ? (
                          <div className="flex items-center bg-brand-50 border border-brand-200 rounded-xl p-1">
                            <button
                              onClick={() => handleRemoveFromCart(item.id)}
                              className="w-9 h-9 rounded-lg bg-white text-slate-700 flex items-center justify-center hover:bg-slate-100 active:scale-95 shadow-xs transition-transform"
                              aria-label={`Reduce quantity of ${item.name}`}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-bold text-xs font-mono text-brand-900">
                              {qtyInCart}
                            </span>
                            <button
                              onClick={() => handleAddToCart(item.id)}
                              className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 active:scale-95 shadow-xs transition-transform"
                              aria-label={`Increase quantity of ${item.name}`}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddToCart(item.id)}
                            className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all min-h-[44px]"
                          >
                            <Plus className="w-4 h-4" />
                            Add to Cart
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PROMPT 8: CART AFFORDABILITY BREAKDOWN IN STICKY DRAWER       */}
      {/* ------------------------------------------------------------- */}
      {cartItemKeys.length > 0 && (
        <aside
          aria-label="Order Cart Summary"
          className="fixed bottom-16 sm:bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur border-t-2 border-brand-200 shadow-2xl p-4 sm:p-5"
        >
          <div className="max-w-4xl mx-auto space-y-3">
            {/* Affordability Status Alert */}
            {hasInsufficientBalance ? (
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-3 text-rose-900 text-xs animate-shake">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-sm">
                    Insufficient MealPass Balance — Short by {formatNaira(shortfallAmount)}
                  </span>
                  <p className="mt-0.5">
                    Your tray total is <strong>{formatNaira(cartTotal)}</strong>, but your available balance is <strong>{formatNaira(balance)}</strong>. Please remove an item or choose an affordable meal combination.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">Within Available Balance</span>
                </div>
                <div className="font-mono text-emerald-800">
                  Remaining after order: <strong>{formatNaira(remainingCartBalance)}</strong>
                </div>
              </div>
            )}

            {/* Cart Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-900 flex items-center justify-center font-bold text-sm shrink-0">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      {cartItemsDetailed.reduce((s, i) => s + i.quantity, 0)} Items Selected
                    </span>
                    <button
                      onClick={handleClearCart}
                      className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 truncate max-w-sm">
                    {cartItemsDetailed.map((i) => `${i.menuItem.name} (${i.quantity})`).join(', ')}
                  </p>
                </div>
              </div>

              {/* Kitchen Notes Input */}
              <div className="hidden md:block flex-1 max-w-xs">
                <input
                  type="text"
                  aria-label="Optional kitchen note"
                  placeholder="Optional kitchen note (e.g. no pepper)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Total & Checkout Button */}
              <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Subtotal</span>
                  <span className="text-xl font-black text-slate-900 font-mono">
                    {formatNaira(cartTotal)}
                  </span>
                </div>

                <button
                  disabled={hasInsufficientBalance}
                  aria-disabled={hasInsufficientBalance}
                  onClick={handleStartCheckout}
                  className={`py-3 px-6 rounded-2xl text-xs sm:text-sm font-black shadow-md transition-all min-h-[48px] flex items-center gap-2 ${
                    hasInsufficientBalance
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-gold-500 hover:bg-gold-400 active:scale-95 text-brand-950'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Proceed to PIN
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* 4-Digit PIN Authorization Modal */}
      <PinModal
        isOpen={isPinModalOpen}
        orderTotal={cartTotal}
        currentBalance={balance}
        onClose={() => setIsPinModalOpen(false)}
        onConfirm={handleAuthorizeOrder}
        isLoading={isSubmitting}
      />

      {/* Official Digital Receipt Modal */}
      <ReceiptModal
        order={createdOrder}
        ledgerEntry={createdLedgerEntry}
        previousBalance={previousBalSnapshot}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
      />
    </StudentShell>
  );
}
