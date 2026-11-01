import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { requireAuth } from '@/lib/auth/server-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(request, ['FINANCE_ADMIN', 'SUPER_ADMIN']);
    if (errorResponse) return errorResponse;

    const body = await request.json();
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
      const preview = await MealPassService.previewBulkAllocation({
        studentProfileIds: body.studentProfileIds,
        amountPerStudent,
        description: body.description.trim(),
        bankReferencePrefix: body.bankReference?.trim() || undefined,
      });
      return NextResponse.json({ success: true, data: preview });
    }

    const result = await MealPassService.executeBulkAllocation({
      studentProfileIds: body.studentProfileIds,
      amountPerStudent,
      description: body.description.trim(),
      bankReferencePrefix: body.bankReference?.trim() || undefined,
      allocatedBy: user.fullName || 'Cosmopolitan University Bursary',
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process bulk allocation' },
      { status: 400 }
    );
  }
}
