import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentProfileId = searchParams.get('studentProfileId') || 'f0000000-0000-0000-0000-000000000001';

    // IDOR & Cross-Student Isolation Guard
    const authenticatedStudentId = req.headers.get('x-student-id');
    const callerRole = req.headers.get('x-user-role');
    if (authenticatedStudentId && authenticatedStudentId !== studentProfileId) {
      if (!['FINANCE_ADMIN', 'SUPER_ADMIN'].includes(callerRole || '')) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Cross-student ledger access is prohibited (IDOR Guard).' },
          { status: 403 }
        );
      }
    }

    const result = await MealPassService.getLedgerEntries(studentProfileId);
    return NextResponse.json({ success: true, data: result.transactions, summary: result.summary });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve ledger entries';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
