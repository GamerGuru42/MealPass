import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { emailOrUsername, password, cafeteriaId } = body;

    const result = await MealPassService.loginStaff({
      emailOrUsername,
      password,
      cafeteriaId,
    });

    if (!result.success || !result.user) {
      return NextResponse.json(
        { success: false, error: result.error || 'Authentication failed.' },
        { status: 401 }
      );
    }

    const sessionPayload = {
      userId: result.user.userId,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
      cafeteriaId: result.user.cafeteriaId,
      universityId: 'a0000000-0000-0000-0000-000000000001',
      token: result.token,
    };

    const sessionCookieValue = result.token || Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

    const response = NextResponse.json({
      success: true,
      message: `Welcome, ${result.user.name}!`,
      user: result.user,
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
    const msg = error instanceof Error ? error.message : 'Staff login failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

