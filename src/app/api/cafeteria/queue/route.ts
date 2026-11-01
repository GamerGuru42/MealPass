import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { requireAuth } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cafeteriaId = searchParams.get('cafeteriaId');

    const { user, errorResponse } = await requireAuth(
      req,
      ['CAFETERIA_STAFF', 'CAFETERIA_HEAD', 'FINANCE_ADMIN', 'SUPER_ADMIN'],
      { targetCafeteriaId: cafeteriaId, requireCafeteriaScope: true }
    );
    if (errorResponse) return errorResponse;

    const targetCafeteria = cafeteriaId || user.cafeteriaId || 'c0000000-0000-0000-0000-000000000001';
    const result = await MealPassService.getCafeteriaQueue(targetCafeteria);
    return NextResponse.json({
      success: true,
      data: {
        orders: result.orders,
        metrics: result.metrics,
      },
      orders: result.orders,
      metrics: result.metrics,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve cafeteria queue';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
