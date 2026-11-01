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
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is allowed
    }

    const result = MealPassService.setActiveFeedingPeriod(
      id,
      body.updatedBy || user.fullName || 'Cosmopolitan Finance Admin'
    );

    return NextResponse.json({ success: true, data: result.period });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to activate feeding period' },
      { status: 400 }
    );
  }
}
