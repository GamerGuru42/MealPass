import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { MigrationEngine, RawExtractedStudent } from '@/lib/services/migration.service';

export async function POST(req: NextRequest) {
  try {
    const callerRole = req.headers.get('x-user-role');
    if (!callerRole || !['CAFETERIA_HEAD', 'FINANCE_ADMIN', 'SUPER_ADMIN'].includes(callerRole)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Access restricted to authorized operators and administrators.' },
        { status: 403 }
      );
    }

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
      // JSON payload containing raw text or base64 file
      const body = await req.json();
      fileName = body.fileName || 'data-import.csv';
      fileFormat = (body.fileFormat || 'CSV').toUpperCase();

      if (body.csvText) {
        rawRecords = MigrationEngine.parseCsv(body.csvText);
      } else if (body.rawText) {
        rawRecords = MigrationEngine.parseDelimitedText(body.rawText);
      } else if (body.base64Content) {
        const buffer = Buffer.from(body.base64Content, 'base64');
        if (fileFormat === 'XLSX' || fileFormat === 'XLS') {
          rawRecords = await MigrationEngine.parseXlsx(buffer);
        } else if (fileFormat === 'DOCX') {
          rawRecords = await MigrationEngine.parseDocx(buffer);
        } else if (fileFormat === 'PDF') {
          rawRecords = await MigrationEngine.parsePdf(buffer);
        } else {
          rawRecords = MigrationEngine.parseCsv(buffer.toString('utf-8'));
        }
      } else if (Array.isArray(body.records)) {
        rawRecords = body.records;
      } else {
        return NextResponse.json({ success: false, error: 'No document content or records provided.' }, { status: 400 });
      }
    }

    if (rawRecords.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid student records could be extracted from the uploaded document. Please check the file formatting.',
      }, { status: 400 });
    }

    const preview = await MealPassService.previewMigration(rawRecords, fileName, fileFormat);

    return NextResponse.json({
      success: true,
      data: {
        fileName,
        fileFormat,
        summary: preview.summary,
        records: preview.records,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process document import';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

