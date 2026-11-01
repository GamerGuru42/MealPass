/**
 * Authoritative Data Store & Business Logic Layer for Cosmopolitan University MealPass
 * Built by NextGen Technologies
 * 
 * Implements:
 * - Append-Only Financial Ledger (Zero updates/deletes)
 * - Atomic Pre-Order creation with automatic balance debit
 * - Strict Separation of Order Status and Financial Status
 * - Dynamic Projection of Balance, Receipts, Order Queues, and History
 */

import { OrderStatus, TransactionType, RoleName } from '@/types';
import { generateOrderNumber, generatePickupCode } from '@/lib/utils';

export interface MockUser {
  id: string;
  universityId: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: RoleName[];
  studentProfile?: MockStudentProfile;
  cafeteriaStaff?: {
    cafeteriaId: string;
    role: 'STAFF' | 'HEAD';
  };
}

export interface MockStudentProfile {
  id: string;
  userId: string;
  matricNumber: string;
  department: string;
  level: string;
  pin: string; // "1234" in demo
  isFeedingActive: boolean;
  feedingAccountId: string;
}

export interface MockLedgerEntry {
  id: string;
  feedingAccountId: string;
  transactionType: TransactionType;
  amount: number; // positive = credit, negative = debit
  runningBalance: number;
  referenceId?: string; // Order ID or bank reference
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface MockMenuItem {
  id: string;
  cafeteriaId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  categoryName: string;
}

export interface MockOrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  itemName: string;
  unitPrice: number; // Captured at order time!
  quantity: number;
  subtotal: number;
}

export interface MockOrder {
  id: string;
  orderNumber: string;
  idempotencyKey?: string | null;
  studentProfileId: string;
  studentName: string;
  matricNumber: string;
  cafeteriaId: string;
  cafeteriaName: string;
  status: OrderStatus;
  totalAmount: number;
  pickupCode: string;
  pickupQrToken: string;
  notes?: string | null;
  placedAt: string;
  acceptedAt?: string | null;
  preparingAt?: string | null;
  readyAt?: string | null;
  receivedAt?: string | null;
  receivedBy?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  items: MockOrderItem[];
  statusHistory: {
    previousStatus: OrderStatus | null;
    newStatus: OrderStatus;
    changedBy: string;
    reason?: string | null;
    isManual: boolean;
    timestamp: string;
  }[];
}

// -------------------------------------------------------------
// SEED DATA FOR COSMOPOLITAN UNIVERSITY
// -------------------------------------------------------------

export const COSMOPOLITAN_UNIVERSITY = {
  id: 'uni-cosmopolitan-01',
  name: 'Cosmopolitan University',
  slug: 'cosmopolitan',
  primaryColor: '#1e3a5f',
  secondaryColor: '#f59e0b',
  currency: 'NGN',
  timezone: 'Africa/Lagos',
  address: 'Cosmopolitan University Campus, Abuja, Nigeria',
};

export const MOCK_CAFETERIA = {
  id: 'caf-main-01',
  universityId: COSMOPOLITAN_UNIVERSITY.id,
  name: 'Main Campus Cafeteria',
  location: 'Student Centre, Ground Floor',
  headName: 'Madam Margaret (Cafeteria Head)',
};

export const MOCK_CATEGORIES = [
  { id: 'cat-01', name: 'Hot Rice & Pasta', displayOrder: 1 },
  { id: 'cat-02', name: 'Proteins & Grills', displayOrder: 2 },
  { id: 'cat-03', name: 'Soups & Swallows', displayOrder: 3 },
  { id: 'cat-04', name: 'Drinks & Refreshments', displayOrder: 4 },
];

export const INITIAL_MENU_ITEMS: MockMenuItem[] = [
  {
    id: 'item-01',
    cafeteriaId: MOCK_CAFETERIA.id,
    categoryId: 'cat-01',
    categoryName: 'Hot Rice & Pasta',
    name: 'Cosmopolitan Party Jollof Rice',
    description: 'Smokey firewood jollof rice prepared with bell peppers and traditional seasonings',
    price: 1200,
    isAvailable: true,
  },
  {
    id: 'item-02',
    cafeteriaId: MOCK_CAFETERIA.id,
    categoryId: 'cat-01',
    categoryName: 'Hot Rice & Pasta',
    name: 'Fried Rice with Fresh Veggies',
    description: 'Basmati stir-fried with sweet corn, carrots, peas, and liver bites',
    price: 1400,
    isAvailable: true,
  },
  {
    id: 'item-03',
    cafeteriaId: MOCK_CAFETERIA.id,
    categoryId: 'cat-01',
    categoryName: 'Hot Rice & Pasta',
    name: 'White Rice & Rich Tomato Stew',
    description: 'Steamed rice paired with rich Nigerian tomato and pepper stew',
    price: 1000,
    isAvailable: true,
  },
  {
    id: 'item-04',
    cafeteriaId: MOCK_CAFETERIA.id,
    categoryId: 'cat-02',
    categoryName: 'Proteins & Grills',
    name: 'Spiced Peppered Chicken',
    description: 'Crispy fried chicken thigh glazed with spicy pepper sauce',
    price: 1500,
    isAvailable: true,
  },
  {
    id: 'item-05',
    cafeteriaId: MOCK_CAFETERIA.id,
    categoryId: 'cat-02',
    categoryName: 'Proteins & Grills',
    name: 'Fried Catfish Steak',
    description: 'Fresh Nigerian catfish seasoned and pan-fried to golden perfection',
    price: 1800,
    isAvailable: true,
  },
  {
    id: 'item-06',
    cafeteriaId: MOCK_CAFETERIA.id,
    categoryId: 'cat-02',
    categoryName: 'Proteins & Grills',
    name: 'Boiled Egg',
    description: 'Farm-fresh boiled egg',
    price: 250,
    isAvailable: true,
  },
  {
    id: 'item-07',
    cafeteriaId: MOCK_CAFETERIA.id,
    categoryId: 'cat-02',
    categoryName: 'Proteins & Grills',
    name: 'Fried Plantain (Dodo)',
    description: 'Sweet golden fried ripe plantain slices (portion)',
    price: 400,
    isAvailable: true,
  },
  {
    id: 'item-08',
    cafeteriaId: MOCK_CAFETERIA.id,
    categoryId: 'cat-03',
    categoryName: 'Soups & Swallows',
    name: 'Egusi Soup with Assorted Beef',
    description: 'Melon seed soup with bitterleaf, dried fish, and tender beef chunks',
    price: 1600,
    isAvailable: true,
  },
  {
    id: 'item-09',
    cafeteriaId: MOCK_CAFETERIA.id,
    categoryId: 'cat-03',
    categoryName: 'Soups & Swallows',
    name: 'Pounded Yam (Wrap)',
    description: 'Smooth hot pounded yam swallow wrap',
    price: 500,
    isAvailable: true,
  },
  {
    id: 'item-10',
    cafeteriaId: MOCK_CAFETERIA.id,
    categoryId: 'cat-04',
    categoryName: 'Drinks & Refreshments',
    name: 'Bottled Spring Water (75cl)',
    description: 'Chilled pure table water',
    price: 300,
    isAvailable: true,
  },
  {
    id: 'item-11',
    cafeteriaId: MOCK_CAFETERIA.id,
    categoryId: 'cat-04',
    categoryName: 'Drinks & Refreshments',
    name: 'Chilled Zobo Drink (50cl)',
    description: 'Infused hibiscus drink sweetened with natural pineapple & ginger',
    price: 500,
    isAvailable: true,
  },
];

// DEMO USERS
export const MOCK_USERS: MockUser[] = [
  {
    id: 'usr-student-01',
    universityId: COSMOPOLITAN_UNIVERSITY.id,
    email: 'student@cosmopolitan.edu.ng',
    firstName: 'Amina',
    lastName: 'Ibrahim',
    roles: ['STUDENT'],
    studentProfile: {
      id: 'sp-01',
      userId: 'usr-student-01',
      matricNumber: 'CU/2024/0142',
      department: 'Software Engineering',
      level: '300L',
      pin: '1234',
      isFeedingActive: true,
      feedingAccountId: 'fa-01',
    },
  },
  {
    id: 'usr-head-01',
    universityId: COSMOPOLITAN_UNIVERSITY.id,
    email: 'madam@cosmopolitan.edu.ng',
    firstName: 'Margaret',
    lastName: 'Okonkwo',
    roles: ['CAFETERIA_HEAD'],
    cafeteriaStaff: {
      cafeteriaId: MOCK_CAFETERIA.id,
      role: 'HEAD',
    },
  },
  {
    id: 'usr-staff-01',
    universityId: COSMOPOLITAN_UNIVERSITY.id,
    email: 'staff@cosmopolitan.edu.ng',
    firstName: 'Tunde',
    lastName: 'Adeyemi',
    roles: ['CAFETERIA_STAFF'],
    cafeteriaStaff: {
      cafeteriaId: MOCK_CAFETERIA.id,
      role: 'STAFF',
    },
  },
  {
    id: 'usr-finance-01',
    universityId: COSMOPOLITAN_UNIVERSITY.id,
    email: 'finance@cosmopolitan.edu.ng',
    firstName: 'Dr. Chinedu',
    lastName: 'Bello',
    roles: ['FINANCE_ADMIN'],
  },
];

// IN-MEMORY LEDGER (Demonstrating exact principle from Section 3 of prompt)
// Initial Feeding Allocation: + ₦50,000
// Meal Transaction: - ₦2,000 (Running: 48,000)
// Meal Transaction: - ₦1,500 (Running: 46,500)
// Meal Transaction: - ₦2,800 (Running: 43,700)
// Current Balance = ₦43,700

export const INITIAL_LEDGER_ENTRIES: MockLedgerEntry[] = [
  {
    id: 'tx-001',
    feedingAccountId: 'fa-01',
    transactionType: 'ALLOCATION',
    amount: 50000,
    runningBalance: 50000,
    referenceId: 'NIBSS-REV-892019',
    description: 'Initial Feeding Allocation — 2026/2027 1st Semester Clearance',
    createdBy: 'Dr. Chinedu Bello (Finance)',
    createdAt: '2026-10-15T09:30:00Z',
  },
  {
    id: 'tx-002',
    feedingAccountId: 'fa-01',
    transactionType: 'MEAL_DEDUCTION',
    amount: -2000,
    runningBalance: 48000,
    referenceId: 'MP-2026-00008',
    description: 'Meal Transaction: Party Jollof Rice, Boiled Egg, Bottled Water',
    createdBy: 'Student Amina Ibrahim',
    createdAt: '2026-10-18T13:15:00Z',
  },
  {
    id: 'tx-003',
    feedingAccountId: 'fa-01',
    transactionType: 'MEAL_DEDUCTION',
    amount: -1500,
    runningBalance: 46500,
    referenceId: 'MP-2026-00014',
    description: 'Meal Transaction: Egusi Soup with Assorted Beef',
    createdBy: 'Student Amina Ibrahim',
    createdAt: '2026-10-22T12:40:00Z',
  },
  {
    id: 'tx-004',
    feedingAccountId: 'fa-01',
    transactionType: 'MEAL_DEDUCTION',
    amount: -2800,
    runningBalance: 43700,
    referenceId: 'MP-2026-00021',
    description: 'Meal Transaction: Fried Rice with Veggies, Peppered Chicken',
    createdBy: 'Student Amina Ibrahim',
    createdAt: '2026-10-26T14:10:00Z',
  },
];

export const INITIAL_ORDERS: MockOrder[] = [
  {
    id: 'ord-01',
    orderNumber: 'MP-2026-00008',
    studentProfileId: 'sp-01',
    studentName: 'Amina Ibrahim',
    matricNumber: 'CU/2024/0142',
    cafeteriaId: MOCK_CAFETERIA.id,
    cafeteriaName: 'Main Campus Cafeteria',
    status: 'RECEIVED',
    totalAmount: 2000,
    pickupCode: '8K2M9N',
    pickupQrToken: 'token-abc-001',
    notes: 'No spicy pepper please',
    placedAt: '2026-10-18T13:10:00Z',
    acceptedAt: '2026-10-18T13:12:00Z',
    preparingAt: '2026-10-18T13:15:00Z',
    readyAt: '2026-10-18T13:25:00Z',
    receivedAt: '2026-10-18T13:30:00Z',
    receivedBy: 'Tunde Adeyemi (Staff)',
    items: [
      { id: 'oi-1', orderId: 'ord-01', menuItemId: 'item-01', itemName: 'Cosmopolitan Party Jollof Rice', unitPrice: 1200, quantity: 1, subtotal: 1200 },
      { id: 'oi-2', orderId: 'ord-01', menuItemId: 'item-06', itemName: 'Boiled Egg', unitPrice: 250, quantity: 2, subtotal: 500 },
      { id: 'oi-3', orderId: 'ord-01', menuItemId: 'item-10', itemName: 'Bottled Spring Water (75cl)', unitPrice: 300, quantity: 1, subtotal: 300 },
    ],
    statusHistory: [
      { previousStatus: null, newStatus: 'PLACED', changedBy: 'Amina Ibrahim', timestamp: '2026-10-18T13:10:00Z', isManual: false },
      { previousStatus: 'PLACED', newStatus: 'ACCEPTED', changedBy: 'Tunde Adeyemi', timestamp: '2026-10-18T13:12:00Z', isManual: false },
      { previousStatus: 'ACCEPTED', newStatus: 'PREPARING', changedBy: 'Tunde Adeyemi', timestamp: '2026-10-18T13:15:00Z', isManual: false },
      { previousStatus: 'PREPARING', newStatus: 'READY', changedBy: 'Tunde Adeyemi', timestamp: '2026-10-18T13:25:00Z', isManual: false },
      { previousStatus: 'READY', newStatus: 'RECEIVED', changedBy: 'Tunde Adeyemi', timestamp: '2026-10-18T13:30:00Z', isManual: false },
    ],
  },
  {
    id: 'ord-02',
    orderNumber: 'MP-2026-00014',
    studentProfileId: 'sp-01',
    studentName: 'Amina Ibrahim',
    matricNumber: 'CU/2024/0142',
    cafeteriaId: MOCK_CAFETERIA.id,
    cafeteriaName: 'Main Campus Cafeteria',
    status: 'RECEIVED',
    totalAmount: 1500,
    pickupCode: '4J7P2Q',
    pickupQrToken: 'token-abc-002',
    placedAt: '2026-10-22T12:35:00Z',
    acceptedAt: '2026-10-22T12:37:00Z',
    preparingAt: '2026-10-22T12:40:00Z',
    readyAt: '2026-10-22T12:48:00Z',
    receivedAt: '2026-10-22T12:55:00Z',
    receivedBy: 'Madam Margaret (Head)',
    items: [
      { id: 'oi-4', orderId: 'ord-02', menuItemId: 'item-08', itemName: 'Egusi Soup with Assorted Beef', unitPrice: 1500, quantity: 1, subtotal: 1500 },
    ],
    statusHistory: [
      { previousStatus: null, newStatus: 'PLACED', changedBy: 'Amina Ibrahim', timestamp: '2026-10-22T12:35:00Z', isManual: false },
      { previousStatus: 'PLACED', newStatus: 'READY', changedBy: 'Margaret Okonkwo', timestamp: '2026-10-22T12:48:00Z', isManual: false },
      { previousStatus: 'READY', newStatus: 'RECEIVED', changedBy: 'Margaret Okonkwo', timestamp: '2026-10-22T12:55:00Z', isManual: false },
    ],
  },
  {
    id: 'ord-03',
    orderNumber: 'MP-2026-00021',
    studentProfileId: 'sp-01',
    studentName: 'Amina Ibrahim',
    matricNumber: 'CU/2024/0142',
    cafeteriaId: MOCK_CAFETERIA.id,
    cafeteriaName: 'Main Campus Cafeteria',
    status: 'RECEIVED',
    totalAmount: 2800,
    pickupCode: '9W3X5Y',
    pickupQrToken: 'token-abc-003',
    placedAt: '2026-10-26T14:05:00Z',
    acceptedAt: '2026-10-26T14:08:00Z',
    preparingAt: '2026-10-26T14:10:00Z',
    readyAt: '2026-10-26T14:18:00Z',
    receivedAt: '2026-10-26T14:24:00Z',
    receivedBy: 'Tunde Adeyemi (Staff)',
    items: [
      { id: 'oi-5', orderId: 'ord-03', menuItemId: 'item-02', itemName: 'Fried Rice with Fresh Veggies', unitPrice: 1400, quantity: 1, subtotal: 1400 },
      { id: 'oi-6', orderId: 'ord-03', menuItemId: 'item-04', itemName: 'Spiced Peppered Chicken', unitPrice: 1400, quantity: 1, subtotal: 1400 },
    ],
    statusHistory: [
      { previousStatus: null, newStatus: 'PLACED', changedBy: 'Amina Ibrahim', timestamp: '2026-10-26T14:05:00Z', isManual: false },
      { previousStatus: 'READY', newStatus: 'RECEIVED', changedBy: 'Tunde Adeyemi', timestamp: '2026-10-26T14:24:00Z', isManual: false },
    ],
  },
  {
    id: 'ord-live-01',
    orderNumber: 'MP-2026-00042',
    studentProfileId: 'sp-01',
    studentName: 'Amina Ibrahim',
    matricNumber: 'CU/2024/0142',
    cafeteriaId: MOCK_CAFETERIA.id,
    cafeteriaName: 'Main Campus Cafeteria',
    status: 'READY',
    totalAmount: 2700,
    pickupCode: '7H4K9B',
    pickupQrToken: 'token-active-7h4k9b',
    notes: 'Please pack in takeaway container',
    placedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    acceptedAt: new Date(Date.now() - 13 * 60 * 1000).toISOString(),
    preparingAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    readyAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    items: [
      { id: 'oi-7', orderId: 'ord-live-01', menuItemId: 'item-01', itemName: 'Cosmopolitan Party Jollof Rice', unitPrice: 1200, quantity: 1, subtotal: 1200 },
      { id: 'oi-8', orderId: 'ord-live-01', menuItemId: 'item-04', itemName: 'Spiced Peppered Chicken', unitPrice: 1500, quantity: 1, subtotal: 1500 },
    ],
    statusHistory: [
      { previousStatus: null, newStatus: 'PLACED', changedBy: 'Amina Ibrahim', timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), isManual: false },
      { previousStatus: 'PLACED', newStatus: 'ACCEPTED', changedBy: 'Tunde Adeyemi', timestamp: new Date(Date.now() - 13 * 60 * 1000).toISOString(), isManual: false },
      { previousStatus: 'ACCEPTED', newStatus: 'PREPARING', changedBy: 'Tunde Adeyemi', timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), isManual: false },
      { previousStatus: 'PREPARING', newStatus: 'READY', changedBy: 'Tunde Adeyemi', timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), isManual: false },
    ],
  },
];

// -------------------------------------------------------------
// IN-MEMORY SINGLETON STORE WITH STRICT LEDGER CONSTRAINTS
// -------------------------------------------------------------

class MealPassStore {
  private ledger: MockLedgerEntry[] = [...INITIAL_LEDGER_ENTRIES];
  private orders: MockOrder[] = [...INITIAL_ORDERS];
  private menu: MockMenuItem[] = [...INITIAL_MENU_ITEMS];
  private users: MockUser[] = [...MOCK_USERS];
  private orderSequence = 43;
  private idempotencyMap: Map<string, { order: MockOrder; ledgerEntry: MockLedgerEntry }> = new Map();

  /**
   * Authoritative Balance Computation
   * Sum of all ledger entries for a feeding account.
   */
  public getBalance(feedingAccountId: string): number {
    const entries = this.ledger.filter((e) => e.feedingAccountId === feedingAccountId);
    if (entries.length === 0) return 0;
    // Latest entry runningBalance or sum
    return entries[entries.length - 1].runningBalance;
  }

  public getLedgerEntries(feedingAccountId?: string): MockLedgerEntry[] {
    if (!feedingAccountId) return [...this.ledger].reverse();
    return this.ledger.filter((e) => e.feedingAccountId === feedingAccountId).reverse();
  }

  public getOrders(): MockOrder[] {
    return [...this.orders].reverse();
  }

  public getOrderById(orderId: string): MockOrder | undefined {
    return this.orders.find((o) => o.id === orderId || o.orderNumber === orderId);
  }

  /**
   * Lookup authoritative historical ledger entry correlating to an order number
   */
  public getLedgerEntryForOrder(orderNumber: string): MockLedgerEntry | undefined {
    return this.ledger.find(
      (e) => e.referenceId === orderNumber || (e.referenceId && e.referenceId.includes(orderNumber))
    );
  }

  public getMenu(): MockMenuItem[] {
    return [...this.menu];
  }

  public updateMenuItemAvailability(id: string, isAvailable: boolean): void {
    const item = this.menu.find((m) => m.id === id);
    if (item) {
      item.isAvailable = isAvailable;
    }
  }

  public updateMenuItemPrice(id: string, newPrice: number): void {
    const item = this.menu.find((m) => m.id === id);
    if (item) {
      item.price = newPrice;
    }
  }

  /**
   * ATOMIC ORDER CREATION & LEDGER DEBIT
   * Follows: ONE TRANSACTION -> MANY AUTOMATIC VIEWS
   */
  public createOrder(params: {
    studentProfileId: string;
    studentName: string;
    matricNumber: string;
    cafeteriaId: string;
    items: { menuItemId: string; quantity: number }[];
    notes?: string | null;
    pin: string;
    feedingAccountId: string;
    idempotencyKey?: string | null;
  }): { order: MockOrder; ledgerEntry: MockLedgerEntry } {
    // 0. Idempotency Check: prevent duplicate double-spend submissions
    if (params.idempotencyKey && this.idempotencyMap.has(params.idempotencyKey)) {
      return this.idempotencyMap.get(params.idempotencyKey)!;
    }

    // 1. PIN verification
    const student = this.users.find((u) => u.studentProfile?.id === params.studentProfileId)?.studentProfile;
    if (!student || student.pin !== params.pin) {
      throw new Error('Incorrect 4-digit transaction PIN. Please try again.');
    }

    if (!student.isFeedingActive) {
      throw new Error('Student feeding clearance is inactive. Contact the University Bursary.');
    }

    // 2. Validate input and calculate authoritative total using server prices (NEVER client prices)
    if (!params.items || params.items.length === 0) {
      throw new Error('Order must contain at least one item.');
    }

    const orderItems: MockOrderItem[] = [];
    let calculatedTotal = 0;

    for (const reqItem of params.items) {
      if (!reqItem.quantity || reqItem.quantity <= 0 || !Number.isInteger(reqItem.quantity)) {
        throw new Error('Quantity must be a positive whole integer.');
      }

      const menuItem = this.menu.find((m) => m.id === reqItem.menuItemId);
      if (!menuItem) throw new Error(`Item ${reqItem.menuItemId} does not exist.`);
      if (!menuItem.isAvailable) throw new Error(`${menuItem.name} is currently sold out.`);

      const subtotal = menuItem.price * reqItem.quantity;
      calculatedTotal += subtotal;

      orderItems.push({
        id: `oi-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        orderId: '', // populated below
        menuItemId: menuItem.id,
        itemName: menuItem.name, // captured at order time
        unitPrice: menuItem.price, // captured at order time
        quantity: reqItem.quantity,
        subtotal,
      });
    }

    // 3. Balance verification with explicit shortfall reporting (Phase 6 requirement)
    const currentBalance = this.getBalance(params.feedingAccountId);
    if (currentBalance < calculatedTotal) {
      const shortfall = calculatedTotal - currentBalance;
      throw new Error(
        `Insufficient MealPass balance. Available balance: ₦${currentBalance.toLocaleString()}, Order total: ₦${calculatedTotal.toLocaleString()}, Shortfall: ₦${shortfall.toLocaleString()}.`
      );
    }

    // 4. Generate order and pickup tokens
    const orderNumber = generateOrderNumber(this.orderSequence++);
    const orderId = `ord-${Date.now()}`;
    const pickupCode = generatePickupCode();
    const pickupQrToken = `qr-${Math.random().toString(36).substr(2, 9)}-${orderNumber}`;
    const newRunningBalance = currentBalance - calculatedTotal;

    // Link items to order
    orderItems.forEach((item) => (item.orderId = orderId));

    const newOrder: MockOrder = {
      id: orderId,
      orderNumber,
      idempotencyKey: params.idempotencyKey || null,
      studentProfileId: params.studentProfileId,
      studentName: params.studentName,
      matricNumber: params.matricNumber,
      cafeteriaId: params.cafeteriaId,
      cafeteriaName: MOCK_CAFETERIA.name,
      status: 'PLACED',
      totalAmount: calculatedTotal,
      pickupCode,
      pickupQrToken,
      notes: params.notes || null,
      placedAt: new Date().toISOString(),
      items: orderItems,
      statusHistory: [
        {
          previousStatus: null,
          newStatus: 'PLACED',
          changedBy: params.studentName,
          reason: 'Order submitted by student via mobile PWA',
          isManual: false,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    // 5. Append to Ledger (Immutable)
    const newLedgerEntry: MockLedgerEntry = {
      id: `tx-${Date.now()}`,
      feedingAccountId: params.feedingAccountId,
      transactionType: 'MEAL_DEDUCTION',
      amount: -calculatedTotal,
      runningBalance: newRunningBalance,
      referenceId: orderNumber,
      description: `Meal Order: ${orderItems.map((i) => `${i.itemName} (x${i.quantity})`).join(', ')}`,
      createdBy: params.studentName,
      createdAt: new Date().toISOString(),
    };

    this.orders.push(newOrder);
    this.ledger.push(newLedgerEntry);

    const result = { order: newOrder, ledgerEntry: newLedgerEntry };
    if (params.idempotencyKey) {
      this.idempotencyMap.set(params.idempotencyKey, result);
    }

    return result;
  }

  /**
   * Update Order Fulfillment Status with Strict State Machine Verification
   */
  public updateOrderStatus(params: {
    orderId: string;
    newStatus: OrderStatus;
    changedBy: string;
    reason?: string;
    isManual?: boolean;
  }): MockOrder {
    const order = this.orders.find((o) => o.id === params.orderId);
    if (!order) throw new Error('Order not found');

    const previousStatus = order.status;

    // Strict State Machine Verification
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PLACED: ['ACCEPTED', 'CANCELLED'],
      ACCEPTED: ['PREPARING', 'CANCELLED'],
      PREPARING: ['READY', 'CANCELLED'],
      READY: ['RECEIVED'],
      RECEIVED: [], // Terminal state
      CANCELLED: [], // Terminal state
    };

    if (previousStatus === 'RECEIVED') {
      throw new Error(`Order ${order.orderNumber} has already been marked as RECEIVED and completed.`);
    }
    if (previousStatus === 'CANCELLED') {
      throw new Error(`Order ${order.orderNumber} was CANCELLED and cannot be modified.`);
    }
    if (!validTransitions[previousStatus].includes(params.newStatus)) {
      throw new Error(
        `Cannot transition order from ${previousStatus} to ${params.newStatus}. Allowed transitions: ${
          validTransitions[previousStatus].join(', ') || 'none (terminal state)'
        }`
      );
    }

    order.status = params.newStatus;
    const now = new Date().toISOString();

    if (params.newStatus === 'ACCEPTED') order.acceptedAt = now;
    if (params.newStatus === 'PREPARING') order.preparingAt = now;
    if (params.newStatus === 'READY') order.readyAt = now;
    if (params.newStatus === 'RECEIVED') {
      order.receivedAt = now;
      order.receivedBy = params.changedBy;
    }
    if (params.newStatus === 'CANCELLED') {
      order.cancelledAt = now;
      order.cancellationReason = params.reason || 'Cancelled by cafeteria';

      // Automatic Refund on Cancellation
      const student = this.users.find((u) => u.studentProfile?.id === order.studentProfileId)?.studentProfile;
      if (student) {
        const curBal = this.getBalance(student.feedingAccountId);
        const refundEntry: MockLedgerEntry = {
          id: `tx-ref-${Date.now()}`,
          feedingAccountId: student.feedingAccountId,
          transactionType: 'REFUND',
          amount: order.totalAmount, // positive refund
          runningBalance: curBal + order.totalAmount,
          referenceId: order.orderNumber,
          description: `Automatic Refund for Cancelled Order ${order.orderNumber}: ${params.reason || 'Kitchen cancellation'}`,
          createdBy: params.changedBy,
          createdAt: now,
        };
        this.ledger.push(refundEntry);
      }
    }

    order.statusHistory.push({
      previousStatus,
      newStatus: params.newStatus,
      changedBy: params.changedBy,
      reason: params.reason || null,
      isManual: params.isManual || false,
      timestamp: now,
    });

    return order;
  }

  /**
   * Feeding Allocation (Finance / Bursary)
   */
  public allocateFunds(params: {
    studentProfileId: string;
    amount: number;
    description: string;
    bankReference?: string;
    allocatedBy: string;
  }): MockLedgerEntry {
    const student = this.users.find((u) => u.studentProfile?.id === params.studentProfileId)?.studentProfile;
    if (!student) throw new Error('Student profile not found');

    const currentBalance = this.getBalance(student.feedingAccountId);
    const newRunningBalance = currentBalance + params.amount;

    const entry: MockLedgerEntry = {
      id: `tx-alloc-${Date.now()}`,
      feedingAccountId: student.feedingAccountId,
      transactionType: 'ALLOCATION',
      amount: params.amount,
      runningBalance: newRunningBalance,
      referenceId: params.bankReference || `ALLOC-${Date.now()}`,
      description: params.description,
      createdBy: params.allocatedBy,
      createdAt: new Date().toISOString(),
    };

    this.ledger.push(entry);
    return entry;
  }
}

// Global Singleton
const globalForStore = globalThis as unknown as { mealPassStore?: MealPassStore };
export const store = globalForStore.mealPassStore || new MealPassStore();
if (process.env.NODE_ENV !== 'production') globalForStore.mealPassStore = store;

