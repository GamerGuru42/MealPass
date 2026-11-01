import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { ValidatedStudentMigrationRecord } from '@/lib/services/migration.service';
import { MigrationSourceType } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const callerRole = req.headers.get('x-user-role');
    const callerId = req.headers.get('x-user-id') || '00000000-0000-0000-0000-000000000001';

    // Role check: Only Cafeteria Head or Finance Admin can confirm and execute migration
    if (!callerRole || !['CAFETERIA_HEAD', 'FINANCE_ADMIN', 'SUPER_ADMIN'].includes(callerRole)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only Cafeteria Head (Madam) or Finance Admin can execute opening balance migrations.' },
        { status: 403 }
      );
    }

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

    // Check header for idempotency key if not in body
    const finalIdempotencyKey = idempotencyKey || req.headers.get('x-idempotency-key') || null;

    const result = await MealPassService.executeMigrationBatch({
      sourceType: (sourceType || 'FILE_UPLOAD') as MigrationSourceType,
      fileName,
      fileFormat,
      records: records as ValidatedStudentMigrationRecord[],
      confirmedBy: callerId,
      confirmedByName: confirmedByName || (callerRole === 'CAFETERIA_HEAD' ? 'Madam Okonkwo (Cafeteria Head)' : 'Finance Administrator'),
      idempotencyKey: finalIdempotencyKey,
    });

    return NextResponse.json({
      success: true,
      message: `Migration confirmed! ${result.migratedCount} student opening balances migrated successfully.`,
      data: result,
    }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to execute migration batch';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const callerRole = req.headers.get('x-user-role');
    if (!callerRole || !['CAFETERIA_HEAD', 'FINANCE_ADMIN', 'SUPER_ADMIN'].includes(callerRole)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Access restricted to authorized personnel.' },
        { status: 403 }
      );
    }

    const batches = await MealPassService.getMigrationBatches();
    return NextResponse.json({ success: true, data: batches });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve migration batches';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

