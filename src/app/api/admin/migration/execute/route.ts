import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { ValidatedStudentMigrationRecord } from '@/lib/services/migration.service';
import { MigrationSourceType } from '@/types';
import { requireAuth } from '@/lib/auth/server-auth';

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req, ['CAFETERIA_HEAD', 'FINANCE_ADMIN', 'SUPER_ADMIN']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const {
      records,
      sourceType,
      fileName,
      fileFormat,
      confirmedByName,
      idempotencyKey,
    } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ success: false, error: 'No validated records provided for execution.' }, { status: 400 });
    }

    const finalIdempotencyKey = idempotencyKey || req.headers.get('x-idempotency-key') || null;

    const result = await MealPassService.executeMigrationBatch({
      sourceType: (sourceType || 'FILE_UPLOAD') as MigrationSourceType,
      fileName,
      fileFormat,
      records: records as ValidatedStudentMigrationRecord[],
      confirmedBy: user.userId,
      confirmedByName: confirmedByName || user.fullName,
      idempotencyKey: finalIdempotencyKey,
    });

    return NextResponse.json({
      success: true,
      message: `Migration confirmed! ${result.migratedCount} student opening balances migrated successfully.`,
      data: result,
    }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Execution failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
