import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { checkDistributedRateLimit } from '@/lib/auth/security';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anonymous';
    const rateCheck = await checkDistributedRateLimit(`lookup:${ip}`, 10, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many lookup requests. Please wait ${rateCheck.retryAfter || 60} seconds before trying again.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfter || 60) },
        }
      );
    }

    const body = await req.json();
    const { matricNumber } = body;

    if (!matricNumber || !matricNumber.trim()) {
      return NextResponse.json(
        { success: false, error: 'Please enter your university matriculation number.' },
        { status: 400 }
      );
    }

    const result = await MealPassService.lookupStudentByMatric(matricNumber);

    if (!result.found || !result.student) {
      return NextResponse.json({
        success: false,
        found: false,
        error: `No feeding record was found for matriculation number "${matricNumber.trim()}". Please visit Madam at the Cafeteria Desk (Main Campus - Alma House or Kado Campus) with your university ID to verify your feeding fee and register your account.`,
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      found: true,
      isActivated: result.isActivated,
      student: {
        id: result.student.id,
        name: result.student.name,
        matricNumber: result.student.matricNumber,
        department: result.student.department,
        faculty: result.student.faculty,
        level: result.student.level,
        email: result.student.email,
        balance: result.student.balance,
      },
    }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lookup failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
