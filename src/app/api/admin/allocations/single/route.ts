import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';

export const dynamic = 'force-dynamic';

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

    if (!body.studentProfileId) {
      return NextResponse.json(
        { success: false, error: 'Student profile ID is required.' },
        { status: 400 }
      );
    }

    const amount = Number(body.amount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Allocation amount must be strictly greater than zero.' },
        { status: 400 }
      );
    }

    if (!body.description || body.description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Description / allocation memo is required.' },
        { status: 400 }
      );
    }

    const result = await MealPassService.allocateFunds({
      studentProfileId: body.studentProfileId,
      amount,
      description: body.description.trim(),
      bankReference: body.bankReference?.trim() || undefined,
      allocatedBy: body.allocatedBy || 'Dr. Chinedu Bello (Bursary)',
      idempotencyKey: body.idempotencyKey || undefined,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to execute feeding allocation' },
      { status: 400 }
    );
  }
}

