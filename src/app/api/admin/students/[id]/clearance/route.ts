import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const callerRole = request.headers.get('x-user-role') || body.role;
    if (callerRole && !['FINANCE_ADMIN', 'SUPER_ADMIN'].includes(callerRole)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Access restricted to Finance and System Administrators.' },
        { status: 403 }
      );
    }

    if (body.isFeedingActive === undefined) {
      return NextResponse.json(
        { success: false, error: 'Field "isFeedingActive" (boolean) is required.' },
        { status: 400 }
      );
    }

    if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'A detailed audit reason (at least 5 characters) is required for clearance changes.' },
        { status: 400 }
      );
    }

    const result = MealPassService.updateStudentClearance({
      studentProfileId: id,
      isFeedingActive: Boolean(body.isFeedingActive),
      reason: body.reason,
      updatedBy: body.updatedBy || 'Dr. Chinedu Bello (Finance Admin)',
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update student clearance' },
      { status: 400 }
    );
  }
}

