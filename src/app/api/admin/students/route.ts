import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const callerRole = request.headers.get('x-user-role');
    if (callerRole && !['FINANCE_ADMIN', 'SUPER_ADMIN'].includes(callerRole)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Access restricted to Finance and System Administrators.' },
        { status: 403 }
      );
    }

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

