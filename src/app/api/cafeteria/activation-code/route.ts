import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { authenticateRequest } from '@/lib/auth/server-auth';

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication required to issue activation codes.' },
        { status: 401 }
      );
    }

    if (!['CAFETERIA_HEAD', 'CAFETERIA_STAFF'].includes(authResult.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only authorized cafeteria staff can issue activation credentials.' },
        { status: 403 }
      );
    }

    const staffRole = authResult.user.role;
    const staffName = authResult.user.fullName || 'Authorized Staff';

    const body = await req.json();
    const { matricNumber } = body;

    if (!matricNumber || !matricNumber.trim()) {
      return NextResponse.json(
        { success: false, error: 'Matriculation number is required.' },
        { status: 400 }
      );
    }

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || (req as any).ip || undefined;

    const result = await MealPassService.issueStudentActivationCodeByStaff({
      matricNumber,
      staffRole: staffRole as any,
      staffName,
      ipAddress: clientIp,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to issue activation code.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      code: result.code,
      expiresAt: result.expiresAt,
      student: result.student,
      message: `Activation code generated for ${result.student.name} (${result.student.matricNumber}).`,
    }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Activation issuance error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

