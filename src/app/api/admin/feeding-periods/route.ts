import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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
    const body = await request.json();

    const callerRole = request.headers.get('x-user-role') || body.role;
    if (callerRole && !['FINANCE_ADMIN', 'SUPER_ADMIN'].includes(callerRole)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Access restricted to Finance and System Administrators.' },
        { status: 403 }
      );
    }

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
      updatedBy: body.updatedBy || 'Dr. Chinedu Bello (Finance Admin)',
    });

    return NextResponse.json({ success: true, data: result.period });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save feeding period' },
      { status: 400 }
    );
  }
}

