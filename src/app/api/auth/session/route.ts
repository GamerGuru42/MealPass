import { NextRequest, NextResponse } from 'next/server';
import { verifySignedSessionToken } from '@/lib/auth/security';

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('mealpass_session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ success: true, authenticated: false, user: null });
  }

  try {
    // 1. Try cryptographic HMAC verification
    const verified = verifySignedSessionToken(sessionCookie);
    if (verified) {
      return NextResponse.json({
        success: true,
        authenticated: true,
        user: verified,
      });
    }

    // 2. Fallback to base64 parse if legacy token
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

