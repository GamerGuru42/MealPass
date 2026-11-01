import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const callerRole = req.headers.get('x-user-role');
    if (callerRole && !['FINANCE_ADMIN', 'SUPER_ADMIN'].includes(callerRole)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Access restricted to Finance and System Administrators.' },
        { status: 403 }
      );
    }

    const report = MealPassService.getReconciliationReport();
    return NextResponse.json({ success: true, data: report });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate reconciliation report' },
      { status: 500 }
    );
  }
}

