import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';

export async function GET(req: NextRequest) {
  try {
    const callerRole = req.headers.get('x-user-role');
    if (callerRole === 'STUDENT') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Students cannot access the kitchen fulfillment queue.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const cafeteriaId = searchParams.get('cafeteriaId') || 'c0000000-0000-0000-0000-000000000001';

    const result = await MealPassService.getCafeteriaQueue(cafeteriaId);
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
