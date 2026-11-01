import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format amounts into standard Nigerian Naira (₦) representation.
 * Server calculations always use exact numbers; this is for rendering.
 */
export function formatNaira(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₦0.00';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format timestamps according to Nigerian Lagos timezone.
 */
export function formatLagosDate(date: Date | string | number): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  }).format(d);
}

export function formatLagosDateOnly(date: Date | string | number): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeZone: 'Africa/Lagos',
  }).format(d);
}

export function formatLagosTimeOnly(date: Date | string | number): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-NG', {
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  }).format(d);
}

/**
 * Generate human-readable sequential order number.
 * Example: MP-2026-00042
 */
export function generateOrderNumber(sequence: number): string {
  const year = new Date().getFullYear();
  return `MP-${year}-${String(sequence).padStart(5, '0')}`;
}

/**
 * Generate high-contrast, easily read 6-character alphanumeric pickup code.
 * Excludes ambiguous characters (0, O, 1, I, L) for readability in noisy cafeterias.
 */
export function generatePickupCode(): string {
  const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

