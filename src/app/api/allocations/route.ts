import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { allocateFundsSchema } from '@/lib/validations';
import { requireAuth } from '@/lib/auth/server-auth';

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req, ['FINANCE_ADMIN', 'SUPER_ADMIN']);
    if (errorResponse) return errorResponse;

    const body = await req.json();

    const parsed = allocateFundsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid allocation details' },
        { status: 400 }
      );
    }

    const { studentProfileId, amount, description, bankReference } = parsed.data;

    const entry = await MealPassService.allocateFunds({
      studentProfileId,
      amount,
      description,
      bankReference: bankReference || undefined,
      allocatedBy: user.fullName || 'Cosmopolitan Bursary Administrator',
    });

    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to allocate feeding funds';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
