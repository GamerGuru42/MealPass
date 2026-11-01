import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { requireAuth } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetStudentProfileId = searchParams.get('studentProfileId') || undefined;

    const { user, errorResponse } = await requireAuth(
      req,
      ['STUDENT', 'FINANCE_ADMIN', 'SUPER_ADMIN'],
      { targetStudentProfileId }
    );
    if (errorResponse) return errorResponse;

    const effectiveStudentId = user.role === 'STUDENT'
      ? (user.studentProfileId || 'f0000000-0000-0000-0000-000000000001')
      : (targetStudentProfileId || user.studentProfileId || 'f0000000-0000-0000-0000-000000000001');

    const data = await MealPassService.getStudentDashboard(effectiveStudentId);
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve student dashboard';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
