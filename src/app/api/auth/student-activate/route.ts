import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { checkDistributedRateLimit } from '@/lib/auth/security';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matricNumber, activationCode, password, pin, department } = body;

    if (!matricNumber || !activationCode || !password || !pin) {
      return NextResponse.json(
        { success: false, error: 'Matriculation number, activation code, password, and dining PIN are required.' },
        { status: 400 }
      );
    }

    const matricNorm = matricNumber.trim().toUpperCase().replace(/\s+/g, '');
    const rateCheck = await checkDistributedRateLimit(`activate:${matricNorm}`, 5, 900);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed activation attempts. Please try again in ${rateCheck.retryAfter || 900} seconds or visit the cafeteria desk.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfter || 900) },
        }
      );
    }

    const result = await MealPassService.activateStudentAccount({
      matricNumber,
      activationCode,
      department,
      password,
      pin,
    });

    if (!result.success || !result.student) {
      return NextResponse.json(
        { success: false, error: result.error || 'Activation failed.' },
        { status: 400 }
      );
    }

    const sessionPayload = {
      userId: result.student.id,
      studentProfileId: result.student.id,
      matricNumber: result.student.matricNumber,
      name: result.student.name,
      email: result.student.email,
      role: 'STUDENT',
      universityId: 'a0000000-0000-0000-0000-000000000001',
      token: result.token,
    };

    const sessionCookieValue = result.token || Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

    const response = NextResponse.json({
      success: true,
      message: `Welcome, ${result.student.name}! Your MealPass account is now active.`,
      student: result.student,
      token: result.token,
    }, { status: 200 });

    response.cookies.set({
      name: 'mealpass_session',
      value: sessionCookieValue,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Activation error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
