import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { requireAuth } from '@/lib/auth/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { errorResponse } = await requireAuth(request, ['FINANCE_ADMIN', 'SUPER_ADMIN', 'CAFETERIA_HEAD', 'CAFETERIA_STAFF', 'STUDENT']);
    if (errorResponse) return errorResponse;

    const periods = MealPassService.getFeedingPeriods();
    return NextResponse.json({ success: true, count: periods.length, data: periods });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch feeding periods' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(request, ['FINANCE_ADMIN', 'SUPER_ADMIN']);
    if (errorResponse) return errorResponse;

    const body = await request.json();

    if (!body.name || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { success: false, error: 'Name, startDate, and endDate are required fields.' },
        { status: 400 }
      );
    }

    const result = MealPassService.saveFeedingPeriod({
      name: body.name,
      startDate: body.startDate,
      endDate: body.endDate,
      isActive: body.isActive ?? true,
      updatedBy: user.fullName || 'Cosmopolitan Finance Administrator',
    });

    return NextResponse.json({ success: true, data: result.period });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save feeding period' },
      { status: 400 }
    );
  }
}
