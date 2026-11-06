import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { requireAuth } from '@/lib/auth/server-auth';
import { sanitizeTransactionIdempotencyKey } from '@/lib/auth/security';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(request, ['FINANCE_ADMIN', 'SUPER_ADMIN']);
    if (errorResponse) return errorResponse;

    const body = await request.json();

    if (!body.studentProfileId) {
      return NextResponse.json(
        { success: false, error: 'Student profile ID is required.' },
        { status: 400 }
      );
    }

    const amount = Number(body.amount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Allocation amount must be strictly greater than zero.' },
        { status: 400 }
      );
    }

    if (!body.description || body.description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Description / allocation memo is required.' },
        { status: 400 }
      );
    }

    const rawKey = body.idempotencyKey || request.headers.get('x-idempotency-key') || undefined;
    const safeAllocKey = sanitizeTransactionIdempotencyKey(rawKey, 'ALLOC_TX') || undefined;

    const result = await MealPassService.allocateFunds({
      studentProfileId: body.studentProfileId,
      amount,
      description: body.description.trim(),
      bankReference: body.bankReference?.trim() || undefined,
      allocatedBy: user.fullName || 'Cosmopolitan University Bursary',
      idempotencyKey: safeAllocKey,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to execute feeding allocation' },
      { status: 400 }
    );
  }
}
