import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { requireAuth } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cafeteriaId = searchParams.get('cafeteriaId');

    const { user, errorResponse } = await requireAuth(
      req,
      ['CAFETERIA_HEAD', 'CAFETERIA_STAFF', 'FINANCE_ADMIN', 'SUPER_ADMIN'],
      { targetCafeteriaId: cafeteriaId, requireCafeteriaScope: true }
    );
    if (errorResponse) return errorResponse;

    const targetCafeteria = cafeteriaId || user.cafeteriaId || 'c0000000-0000-0000-0000-000000000001';
    const report = await MealPassService.getCafeteriaReports(targetCafeteria);
    return NextResponse.json({ success: true, data: report });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate operational report';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
