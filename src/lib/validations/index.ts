import { z } from 'zod';

// Authentication
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid university email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  universitySlug: z.string().default('cosmopolitan'),
});

// Student PIN Setup & Verification
export const setupPinSchema = z
  .object({
    pin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d{4}$/, 'PIN must contain only numbers'),
    confirmPin: z.string().length(4, 'PIN must be exactly 4 digits'),
  })
  .refine((data) => data.pin === data.confirmPin, {
    message: 'PIN codes do not match',
    path: ['confirmPin'],
  });

export const verifyPinSchema = z.object({
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d{4}$/, 'PIN must contain only numbers'),
});

// Pre-Order Creation
export const createOrderSchema = z.object({
  studentProfileId: z.string().optional(),
  studentName: z.string().optional(),
  matricNumber: z.string().optional(),
  cafeteriaId: z.string().min(1, 'Cafeteria ID is required'),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1, 'Menu item ID is required'),
        quantity: z.number().int().positive('Quantity must be at least 1').max(50, 'Quantity cannot exceed 50 per item'),
      })
    )
    .min(1, 'You must select at least one item to order'),
  notes: z.string().max(250, 'Notes cannot exceed 250 characters').optional().nullable(),
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d{4}$/, 'PIN must contain only numbers'),
  idempotencyKey: z.string().optional().nullable(),
});

// Menu Item Management
export const menuItemSchema = z.object({
  cafeteriaId: z.string().min(1, 'Cafeteria ID is required'),
  categoryId: z.string().min(1, 'Category ID is required'),
  name: z.string().min(2, 'Item name must be at least 2 characters').max(100),
  description: z.string().max(300).optional().nullable(),
  imageUrl: z.string().url('Must be a valid URL').optional().nullable(), // Optional!
  currentPrice: z.number().positive('Price must be greater than zero'),
  isAvailable: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

export const updatePriceSchema = z.object({
  newPrice: z.number().positive('Price must be greater than zero'),
  reason: z.string().min(3, 'A reason for the price update is required for audit history'),
});

// Feeding Balance Allocation (Bursary / Finance)
export const allocateFundsSchema = z.object({
  studentProfileId: z.string().min(1, 'Student ID is required'),
  amount: z.number().positive('Allocation amount must be greater than zero').max(500000, 'Single allocation limit is ₦500,000'),
  feedingPeriodId: z.string().optional().nullable(),
  description: z.string().min(3, 'Description / Clearance memo is required'),
  bankReference: z.string().min(3, 'Bank fee clearance reference is required for audit verification'),
});

// Order Status Transition
export const updateOrderStatusSchema = z
  .object({
    status: z.enum(['ACCEPTED', 'PREPARING', 'READY', 'RECEIVED', 'CANCELLED']).optional(),
    newStatus: z.enum(['ACCEPTED', 'PREPARING', 'READY', 'RECEIVED', 'CANCELLED']).optional(),
    reason: z.string().max(300).optional().nullable(),
    isManual: z.boolean().default(false),
  })
  .refine((data) => Boolean(data.status || data.newStatus), {
    message: 'Either status or newStatus must be provided',
  });

// Manual Received Override (Madam / Manager)
export const manualReceivedSchema = z.object({
  reason: z.string().min(5, 'Mandatory reason required for manual pickup confirmation override (min 5 chars)'),
});

