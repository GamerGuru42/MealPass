import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is allowed
    }

    const callerRole = request.headers.get('x-user-role') || body.role;
    if (callerRole && !['FINANCE_ADMIN', 'SUPER_ADMIN'].includes(callerRole)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Access restricted to Finance and System Administrators.' },
        { status: 403 }
      );
    }

    const result = MealPassService.setActiveFeedingPeriod(
      id,
      body.updatedBy || 'Dr. Chinedu Bello (Finance Admin)'
    );

    return NextResponse.json({ success: true, data: result.period });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to activate feeding period' },
      { status: 400 }
    );
  }
}

