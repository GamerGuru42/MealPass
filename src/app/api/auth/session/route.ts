import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('mealpass_session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ success: true, authenticated: false, user: null });
  }

  try {
    const parsed = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8'));
    return NextResponse.json({
      success: true,
      authenticated: true,
      user: parsed,
    });
  } catch {
    return NextResponse.json({ success: true, authenticated: false, user: null });
  }
}

