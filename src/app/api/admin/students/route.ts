import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { requireAuth } from '@/lib/auth/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { errorResponse } = await requireAuth(request, ['FINANCE_ADMIN', 'SUPER_ADMIN']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const status = (searchParams.get('status') as any) || undefined;
    const department = searchParams.get('department') || undefined;

    const students = MealPassService.getStudents({ search, status, department });
    return NextResponse.json({ success: true, count: students.length, data: students });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch students directory' },
      { status: 500 }
    );
  }
}
