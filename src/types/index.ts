export type RoleName = 
  | 'STUDENT'
  | 'CAFETERIA_STAFF'
  | 'CAFETERIA_HEAD'
  | 'FINANCE_ADMIN'
  | 'SUPER_ADMIN';

export type TransactionType =
  | 'ALLOCATION'
  | 'MEAL_DEDUCTION'
  | 'REFUND'
  | 'REVERSAL'
  | 'ADJUSTMENT'
  | 'OPENING_BALANCE';

export type OrderStatus =
  | 'PLACED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'RECEIVED'
  | 'CANCELLED';

export type CafeteriaRole = 'STAFF' | 'HEAD';

// Universal API Response Pattern
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Student MealPass Balance (Derived from authoritative ledger)
export interface BalanceInfo {
  currentBalance: number;
  feedingAccountId: string;
  isFeedingActive: boolean;
  matricNumber: string;
  studentName: string;
  currency: string;
  lastTransaction?: {
    type: TransactionType;
    amount: number;
    runningBalance: number;
    description: string;
    createdAt: string;
  };
}

// Order & Item View Projections
export interface OrderItemView {
  id: string;
  menuItemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface OrderDetailView {
  id: string;
  orderNumber: string;
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
  cancelledAt?: string | null;
  cafeteria: {
    id: string;
    name: string;
    location?: string | null;
  };
  student: {
    name: string;
    matricNumber: string;
    department?: string | null;
    phone?: string | null;
  };
  items: OrderItemView[];
  statusHistory: {
    id: string;
    previousStatus?: OrderStatus | null;
    newStatus: OrderStatus;
    changedAt: string;
    reason?: string | null;
    isManual: boolean;
    changedBy: string;
  }[];
}

// Digital Receipt Model (Exact specification from Section 7)
export interface DigitalReceipt {
  institution: 'Cosmopolitan University';
  platform: 'MealPass';
  technologyAttribution: 'Powered by NextGen Technologies';
  transactionId: string;
  orderId: string;
  orderNumber: string;
  studentName: string;
  matricNumber: string;
  date: string;
  time: string;
  cafeteriaName: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  totalAmount: number;
  previousMealBalance: number;
  amountDeducted: number;
  newMealBalance: number;
  paymentMethod: 'MealPass Balance';
  transactionStatus: 'Successful';
}

// Menu Types (Text-first, optional photography)
export interface MenuItemView {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  currentPrice: number;
  isAvailable: boolean;
  categoryName: string;
  categoryId: string;
}

export interface MenuCategoryView {
  id: string;
  name: string;
  displayOrder: number;
  items: MenuItemView[];
}

// Cart Item for Pre-Ordering
export interface CartItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

// Authenticated Session User
export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  universityId: string;
  universityName: string;
  roles: RoleName[];
  studentProfileId?: string;
  matricNumber?: string;
}

// -------------------------------------------------------------
// Prompt 10 Operator Onboarding & Legacy Migration Types
// -------------------------------------------------------------
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface OperatorInvitation {
  id: string;
  universityId: string;
  cafeteriaId?: string | null;
  cafeteriaName?: string | null;
  email: string;
  role: RoleName;
  invitationToken: string;
  status: InvitationStatus;
  invitedBy?: string | null;
  invitedByName?: string | null;
  expiresAt: string;
  acceptedAt?: string | null;
  acceptedByUserId?: string | null;
  createdAt: string;
}

export type MigrationSourceType = 'FILE_UPLOAD' | 'MANUAL_ENTRY';
export type MigrationBatchStatus = 'PREVIEWED' | 'CONFIRMED' | 'REJECTED';
export type MigrationRecordStatus = 'VALID' | 'CORRECTED' | 'INVALID' | 'SKIPPED';

export interface MigrationBatch {
  id: string;
  batchNumber: string;
  sourceType: MigrationSourceType;
  fileName?: string | null;
  fileFormat?: string | null;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  totalImportedAmount: number;
  status: MigrationBatchStatus;
  confirmedBy?: string | null;
  confirmedByName?: string | null;
  idempotencyKey?: string | null;
  createdAt: string;
  confirmedAt?: string | null;
  records?: MigrationRecord[];
}

export interface MigrationRecord {
  id: string;
  batchId: string;
  studentProfileId?: string | null;
  matricNumber: string;
  studentName: string;
  department?: string | null;
  rawExtractedValue?: string | null;
  correctedValue?: string | null;
  importedBalance: number;
  ledgerEntryId?: string | null;
  validationStatus: MigrationRecordStatus;
  errorMessage?: string | null;
  createdAt: string;
}

export interface CampusInfo {
  id: string;
  name: string;
  location: string;
  description?: string;
  isActive: boolean;
  operatingHours?: Record<string, string>;
}

