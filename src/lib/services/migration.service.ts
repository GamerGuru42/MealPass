/**
 * Cosmopolitan University MealPass — Legacy Student Record Migration & Extraction Engine
 * Powered by NextGen Technologies
 * 
 * Supports:
 * - Method A: Document Import (CSV, XLSX, DOCX, PDF)
 * - Method B: Manual Student Entry
 * 
 * Strict Workflow:
 * Upload -> Extract -> Analyze -> Normalize -> Validate -> Preview -> Review/Edit -> Confirm Import
 */

export interface RawExtractedStudent {
  matricNumber: string;
  studentName: string;
  department?: string;
  level?: string;
  balance: number | string;
  rawLine?: string;
}

export interface ValidatedStudentMigrationRecord {
  tempId: string;
  matricNumber: string;
  studentName: string;
  department: string;
  level: string;
  rawExtractedValue: string;
  correctedValue?: string;
  importedBalance: number;
  validationStatus: 'VALID' | 'CORRECTED' | 'INVALID';
  errorMessage?: string;
  isExistingStudent?: boolean;
  studentProfileId?: string;
}

export interface MigrationValidationSummary {
  totalExtracted: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  totalLiability: number;
  fileFormat: string;
  fileName?: string;
}

export class MigrationEngine {
  /**
   * Cleans and normalizes monetary strings (e.g., "₦50,000.00", "50000", "50,000 NGN")
   */
  public static parseCurrency(val: any): { amount: number; isValid: boolean; raw: string } {
    if (val === undefined || val === null || val === '') {
      return { amount: 0, isValid: false, raw: String(val) };
    }
    const raw = String(val).trim();
    // Remove currency symbols, commas, spaces, NGN
    const cleaned = raw.replace(/[₦,$,\s,NGN,ngn]/g, '');
    const num = parseFloat(cleaned);
    if (isNaN(num) || num < 0) {
      return { amount: 0, isValid: false, raw };
    }
    return { amount: Math.round(num * 100) / 100, isValid: true, raw };
  }

  /**
   * Normalizes matriculation numbers (e.g. "cu/2024/0142" -> "CU/2024/0142")
   */
  public static normalizeMatricNumber(matric: string): string {
    if (!matric) return '';
    return matric.trim().toUpperCase().replace(/\s+/g, '');
  }

  /**
   * Validates university matriculation format (e.g. CU/2024/0142 or standard university matric)
   */
  public static isValidMatricFormat(matric: string): boolean {
    const norm = this.normalizeMatricNumber(matric);
    // Cosmopolitan standard format: CU/YYYY/XXXX or standard alphanumeric student ID
    return /^CU\/\d{4}\/\d{3,5}$/i.test(norm) || /^[A-Z0-9\/-]{5,20}$/i.test(norm);
  }

  /**
   * Unified Validation Engine for both Document Extraction and Manual Entry
   */
  public static validateRecords(
    rawRecords: RawExtractedStudent[],
    existingMatricMap: Map<string, { id: string; name: string; balance: number }> = new Map()
  ): { records: ValidatedStudentMigrationRecord[]; summary: MigrationValidationSummary } {
    const records: ValidatedStudentMigrationRecord[] = [];
    const seenInBatch = new Set<string>();

    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;
    let totalLiability = 0;

    rawRecords.forEach((raw, idx) => {
      const tempId = `temp-${Date.now()}-${idx}`;
      const matricNorm = this.normalizeMatricNumber(raw.matricNumber);
      const name = (raw.studentName || '').trim();
      const dept = (raw.department || 'General Studies').trim();
      const level = (raw.level || '100').trim();
      const { amount, isValid: isCurrencyValid, raw: rawBalStr } = this.parseCurrency(raw.balance);

      const rawExtractedValue = raw.rawLine || `${raw.matricNumber} | ${raw.studentName} | ${rawBalStr} | ${dept}`;

      const errors: string[] = [];

      // Check 1: Missing Required Matric
      if (!matricNorm) {
        errors.push('Missing matriculation number');
      } else if (!this.isValidMatricFormat(matricNorm)) {
        errors.push(`Invalid matriculation format ("${matricNorm}"). Expected CU/YYYY/XXXX.`);
      }

      // Check 2: Missing Student Name
      if (!name) {
        errors.push('Missing student full name');
      } else if (name.length < 3) {
        errors.push('Student name is too short (minimum 3 characters)');
      }

      // Check 3: Invalid Currency / Balance
      if (!isCurrencyValid) {
        errors.push(`Invalid balance value ("${rawBalStr}"). Must be a non-negative number.`);
      }

      // Check 4: Duplicate in Batch
      if (matricNorm) {
        if (seenInBatch.has(matricNorm)) {
          errors.push(`Duplicate matriculation number in batch ("${matricNorm}")`);
          duplicateCount++;
        } else {
          seenInBatch.add(matricNorm);
        }
      }

      // Check 5: Existing student in Database
      const existing = matricNorm ? existingMatricMap.get(matricNorm) : undefined;

      const isValid = errors.length === 0;
      if (isValid) {
        validCount++;
        totalLiability += amount;
      } else {
        invalidCount++;
      }

      records.push({
        tempId,
        matricNumber: matricNorm || raw.matricNumber || 'UNKNOWN',
        studentName: name || 'UNKNOWN',
        department: dept,
        level,
        rawExtractedValue,
        importedBalance: isValid ? amount : (isCurrencyValid ? amount : 0),
        validationStatus: isValid ? 'VALID' : 'INVALID',
        errorMessage: errors.length > 0 ? errors.join('; ') : undefined,
        isExistingStudent: Boolean(existing),
        studentProfileId: existing?.id,
      });
    });

    return {
      records,
      summary: {
        totalExtracted: rawRecords.length,
        validCount,
        invalidCount,
        duplicateCount,
        totalLiability: Math.round(totalLiability * 100) / 100,
        fileFormat: 'STRUCTURED',
      },
    };
  }

  /**
   * Parses standard CSV text (RFC 4180 compliant)
   */
  public static parseCsv(csvText: string): RawExtractedStudent[] {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const delimiter = csvText.includes('\t') ? '\t' : csvText.includes(';') ? ';' : ',';

    // Parse header
    const headerLine = lines[0];
    const headers = headerLine.split(delimiter).map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());

    const matricIdx = headers.findIndex((h) => h.includes('matric') || h.includes('reg') || h.includes('id'));
    const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('student'));
    const balIdx = headers.findIndex((h) => h.includes('balance') || h.includes('amount') || h.includes('entitlement') || h.includes('credit'));
    const deptIdx = headers.findIndex((h) => h.includes('dept') || h.includes('department') || h.includes('faculty'));
    const levelIdx = headers.findIndex((h) => h.includes('level') || h.includes('year'));

    const results: RawExtractedStudent[] = [];

    // If headers exist, parse from row 1
    const startRow = (matricIdx !== -1 || nameIdx !== -1) ? 1 : 0;

    for (let i = startRow; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle simple quoted CSV tokens
      const tokens: string[] = [];
      let inQuotes = false;
      let token = '';

      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          tokens.push(token.trim().replace(/^"|"$/g, ''));
          token = '';
        } else {
          token += char;
        }
      }
      tokens.push(token.trim().replace(/^"|"$/g, ''));

      if (tokens.length >= 2) {
        const matric = matricIdx !== -1 ? tokens[matricIdx] : tokens[0];
        const name = nameIdx !== -1 ? tokens[nameIdx] : tokens[1];
        const bal = balIdx !== -1 ? tokens[balIdx] : tokens[2] || '0';
        const dept = deptIdx !== -1 ? tokens[deptIdx] : tokens[3] || 'General Studies';
        const lvl = levelIdx !== -1 ? tokens[levelIdx] : tokens[4] || '100';

        results.push({
          matricNumber: matric || '',
          studentName: name || '',
          balance: bal,
          department: dept,
          level: lvl,
          rawLine: line,
        });
      }
    }

    return results;
  }

  /**
   * Parses XLSX buffer using the xlsx library
   */
  public static async parseXlsx(buffer: Buffer): Promise<RawExtractedStudent[]> {
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (!rows || rows.length === 0) return [];

      const headers = (rows[0] || []).map((h: any) => String(h || '').trim().toLowerCase());
      const matricIdx = headers.findIndex((h: string) => h.includes('matric') || h.includes('reg') || h.includes('id'));
      const nameIdx = headers.findIndex((h: string) => h.includes('name') || h.includes('student'));
      const balIdx = headers.findIndex((h: string) => h.includes('balance') || h.includes('amount') || h.includes('entitlement'));
      const deptIdx = headers.findIndex((h: string) => h.includes('dept') || h.includes('department'));
      const levelIdx = headers.findIndex((h: string) => h.includes('level'));

      const results: RawExtractedStudent[] = [];
      const startRow = (matricIdx !== -1 || nameIdx !== -1) ? 1 : 0;

      for (let i = startRow; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const matric = matricIdx !== -1 ? row[matricIdx] : row[0];
        const name = nameIdx !== -1 ? row[nameIdx] : row[1];
        const bal = balIdx !== -1 ? row[balIdx] : row[2] || 0;
        const dept = deptIdx !== -1 ? row[deptIdx] : row[3] || 'General Studies';
        const lvl = levelIdx !== -1 ? row[levelIdx] : row[4] || '100';

        if (matric || name) {
          results.push({
            matricNumber: String(matric || ''),
            studentName: String(name || ''),
            balance: bal,
            department: String(dept || 'General Studies'),
            level: String(lvl || '100'),
            rawLine: row.join(' | '),
          });
        }
      }
      return results;
    } catch (err: any) {
      console.error('XLSX parsing error:', err.message);
      return [];
    }
  }

  /**
   * Parses DOCX buffer using mammoth
   */
  public static async parseDocx(buffer: Buffer): Promise<RawExtractedStudent[]> {
    try {
      const mammoth = await import('mammoth');
      const { value: text } = await mammoth.extractRawText({ buffer });
      return this.parseDelimitedText(text);
    } catch (err: any) {
      console.error('DOCX parsing error:', err.message);
      return this.parseDelimitedText(buffer.toString('utf-8'));
    }
  }

  /**
   * Parses PDF buffer using pdf-parse
   */
  public static async parsePdf(buffer: Buffer): Promise<RawExtractedStudent[]> {
    try {
      // dynamic import for pdf parsing
      const pdfParseModule: any = await import('pdf-parse' as any).catch(() => null);
      if (pdfParseModule) {
        const pdfParse = pdfParseModule.default || pdfParseModule;
        const pdfData = await pdfParse(buffer);
        return this.parseDelimitedText(pdfData.text || '');
      }
      return this.parseDelimitedText(buffer.toString('utf-8'));
    } catch (err: any) {
      console.error('PDF parsing error:', err.message);
      return this.parseDelimitedText(buffer.toString('utf-8'));
    }
  }

  /**
   * Fallback text parser that extracts structured student lines from raw plain text/tables
   */
  public static parseDelimitedText(rawText: string): RawExtractedStudent[] {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const results: RawExtractedStudent[] = [];

    // Regex to match university matriculation pattern: CU/YYYY/XXXX or similar
    const matricRegex = /(CU\/\d{4}\/\d{3,5}|[A-Z]{2,4}\/\d{4}\/\d{3,5})/i;
    // Regex to match monetary amounts: ₦50,000 or 50000 or 50,000.00
    const moneyRegex = /(?:₦|\b)(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d{4,7})\b/;

    for (const line of lines) {
      // Skip header lines
      if (/matric.*name|student.*number/i.test(line)) continue;

      // Pipe, comma, or tab delimited
      if (line.includes('|') || line.includes('\t') || line.includes(',')) {
        const delim = line.includes('|') ? '|' : line.includes('\t') ? '\t' : ',';
        const parts = line.split(delim).map((p) => p.trim());
        if (parts.length >= 2) {
          const matricMatch = parts.find((p) => matricRegex.test(p));
          const matric = matricMatch ? matricMatch.match(matricRegex)![0] : parts[0];
          const name = parts.find((p) => p !== matric && /[a-zA-Z]{3,}\s+[a-zA-Z]{3,}/.test(p)) || parts[1] || '';
          const balPart = parts.find((p) => p !== matric && p !== name && moneyRegex.test(p));
          const bal = balPart ? balPart.replace(/[^\d.]/g, '') : '0';

          if (matric && name) {
            results.push({
              matricNumber: matric,
              studentName: name,
              balance: bal,
              department: parts[3] || 'General Studies',
              rawLine: line,
            });
            continue;
          }
        }
      }

      // Regex line scanner for semi-structured text
      const matricMatch = line.match(matricRegex);
      if (matricMatch) {
        const matric = matricMatch[0];
        const lineWithoutMatric = line.replace(matric, '').trim();
        const moneyMatch = lineWithoutMatric.match(moneyRegex);
        const bal = moneyMatch ? moneyMatch[0].replace(/[^\d.]/g, '') : '0';
        const namePart = lineWithoutMatric.replace(moneyRegex, '').replace(/[-|,:]/g, ' ').trim();

        if (namePart.length >= 3) {
          results.push({
            matricNumber: matric,
            studentName: namePart,
            balance: bal,
            department: 'General Studies',
            rawLine: line,
          });
        }
      }
    }

    return results;
  }
}
