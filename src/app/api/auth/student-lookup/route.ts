import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';

export async function POST(req: NextRequest) {
  try {
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

