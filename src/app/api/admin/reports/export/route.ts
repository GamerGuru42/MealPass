import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { requireAuth } from '@/lib/auth/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { errorResponse } = await requireAuth(request, ['FINANCE_ADMIN', 'SUPER_ADMIN', 'CAFETERIA_HEAD']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'reconciliation') as any;

    if (!['reconciliation', 'allocations', 'ledger', 'students'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid export type. Must be reconciliation, allocations, ledger, or students.' },
        { status: 400 }
      );
    }

    const csvContent = MealPassService.exportReportCsv(type);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `mealpass-${type}-${dateStr}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to export report' },
      { status: 500 }
    );
  }
}
