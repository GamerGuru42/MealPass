import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { requireAuth } from '@/lib/auth/server-auth';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await requireAuth(request, ['FINANCE_ADMIN', 'SUPER_ADMIN']);
    if (errorResponse) return errorResponse;

    const { id } = await context.params;
    const body = await request.json();

    if (body.isFeedingActive === undefined) {
      return NextResponse.json(
        { success: false, error: 'Field "isFeedingActive" (boolean) is required.' },
        { status: 400 }
      );
    }

    if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'A detailed audit reason (at least 5 characters) is required for clearance changes.' },
        { status: 400 }
      );
    }

    const result = MealPassService.updateStudentClearance({
      studentProfileId: id,
      isFeedingActive: Boolean(body.isFeedingActive),
      reason: body.reason,
      updatedBy: user.fullName || 'Cosmopolitan Finance Admin',
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update student clearance' },
      { status: 400 }
    );
  }
}
