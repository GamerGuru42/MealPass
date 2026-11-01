import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { MigrationEngine, RawExtractedStudent } from '@/lib/services/migration.service';
import { requireAuth } from '@/lib/auth/server-auth';

export async function POST(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth(req, ['CAFETERIA_HEAD', 'FINANCE_ADMIN', 'SUPER_ADMIN']);
    if (errorResponse) return errorResponse;

    const contentType = req.headers.get('content-type') || '';
    let rawRecords: RawExtractedStudent[] = [];
    let fileName = 'uploaded-document';
    let fileFormat = 'CSV';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file uploaded.' }, { status: 400 });
      }

      fileName = file.name;
      const extension = fileName.split('.').pop()?.toLowerCase() || '';
      fileFormat = extension.toUpperCase();

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (extension === 'csv' || extension === 'txt') {
        const text = buffer.toString('utf-8');
        rawRecords = MigrationEngine.parseCsv(text);
      } else if (extension === 'xlsx' || extension === 'xls') {
        rawRecords = await MigrationEngine.parseXlsx(buffer);
      } else if (extension === 'docx') {
        rawRecords = await MigrationEngine.parseDocx(buffer);
      } else if (extension === 'pdf') {
        rawRecords = await MigrationEngine.parsePdf(buffer);
      } else {
        return NextResponse.json(
          { success: false, error: `Unsupported file format (.${extension}). Supported formats: CSV, XLSX, DOCX, PDF.` },
          { status: 400 }
        );
      }
    } else {
      // JSON body fallback
      const body = await req.json();
      if (!Array.isArray(body.rawRecords) || body.rawRecords.length === 0) {
        return NextResponse.json({ success: false, error: 'No records provided in request.' }, { status: 400 });
      }
      rawRecords = body.rawRecords;
      fileName = body.fileName || 'manual-json-upload';
      fileFormat = 'JSON';
    }

    if (rawRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File parsed successfully, but no valid student entitlement records were detected.' },
        { status: 422 }
      );
    }

    // Run authoritative validation and preview
    const preview = await MealPassService.previewMigration(rawRecords, fileName, fileFormat);

    return NextResponse.json({
      success: true,
      message: `File processed successfully. Extracted ${preview.summary.totalExtracted} student records.`,
      data: preview,
    }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Migration upload failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
