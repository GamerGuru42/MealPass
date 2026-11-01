import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { RawExtractedStudent } from '@/lib/services/migration.service';
import { requireAuth } from '@/lib/auth/server-auth';

export async function POST(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth(req, ['CAFETERIA_HEAD', 'FINANCE_ADMIN', 'SUPER_ADMIN']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const students: RawExtractedStudent[] = body.students || (body.student ? [body.student] : []);

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one student record is required for manual entry.' }, { status: 400 });
    }

    const preview = await MealPassService.previewMigration(students, 'Manual Student Entry', 'MANUAL');

    return NextResponse.json({
      success: true,
      data: {
        summary: preview.summary,
        records: preview.records,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to validate manual records';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
