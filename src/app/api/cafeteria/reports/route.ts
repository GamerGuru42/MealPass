import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cafeteriaId = searchParams.get('cafeteriaId') || 'c0000000-0000-0000-0000-000000000001';

    // Role-check: Only Cafeteria Head, Staff, and Admins can view reports
    const callerRole = req.headers.get('x-user-role');
    if (callerRole && !['CAFETERIA_HEAD', 'CAFETERIA_STAFF', 'FINANCE_ADMIN', 'SUPER_ADMIN'].includes(callerRole)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Access restricted to Cafeteria and Finance personnel.' },
        { status: 403 }
      );
    }

    const report = await MealPassService.getCafeteriaReports(cafeteriaId);
    return NextResponse.json({ success: true, data: report });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate operational report';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

