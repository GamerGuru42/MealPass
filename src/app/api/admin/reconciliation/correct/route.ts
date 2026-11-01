import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { requireAuth } from '@/lib/auth/server-auth';

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

    if (!['CREDIT', 'DEBIT'].includes(body.adjustmentType)) {
      return NextResponse.json(
        { success: false, error: 'Field "adjustmentType" must be either "CREDIT" or "DEBIT".' },
        { status: 400 }
      );
    }

    const amount = Number(body.amount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Adjustment amount must be strictly greater than zero.' },
        { status: 400 }
      );
    }

    if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'An authoritative audit reason (at least 5 characters) is required for financial adjustments.' },
        { status: 400 }
      );
    }

    const result = await MealPassService.executeCompensatingAdjustment({
      studentProfileId: body.studentProfileId,
      adjustmentType: body.adjustmentType,
      amount,
      reason: body.reason.trim(),
      authorizedBy: user.fullName || 'Cosmopolitan Finance Admin',
      referenceId: body.idempotencyKey || body.referenceId || undefined,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to execute compensating adjustment' },
      { status: 400 }
    );
  }
}
