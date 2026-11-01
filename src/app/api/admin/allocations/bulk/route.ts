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

    const action = body.action || 'execute';

    if (!Array.isArray(body.studentProfileIds) || body.studentProfileIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one student must be selected for bulk allocation.' },
        { status: 400 }
      );
    }

    const amountPerStudent = Number(body.amountPerStudent);
    if (isNaN(amountPerStudent) || amountPerStudent <= 0) {
      return NextResponse.json(
        { success: false, error: 'Per-student amount must be strictly greater than zero.' },
        { status: 400 }
      );
    }

    if (!body.description || body.description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Description / allocation memo is required.' },
        { status: 400 }
      );
    }

    if (action === 'preview') {
      const preview = MealPassService.previewBulkAllocation({
        studentProfileIds: body.studentProfileIds,
        amountPerStudent,
        description: body.description.trim(),
        bankReferencePrefix: body.bankReferencePrefix?.trim() || undefined,
      });
      return NextResponse.json({ success: true, data: preview });
    }

    const result = await MealPassService.executeBulkAllocation({
      studentProfileIds: body.studentProfileIds,
      amountPerStudent,
      description: body.description.trim(),
      bankReferencePrefix: body.bankReferencePrefix?.trim() || undefined,
      idempotencyKey: body.idempotencyKey || undefined,
      allocatedBy: body.allocatedBy || 'Dr. Chinedu Bello (Finance Admin)',
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process bulk allocation' },
      { status: 400 }
    );
  }
}

