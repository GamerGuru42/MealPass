import { NextRequest, NextResponse } from 'next/server';
import { revokeSessionToken } from '@/lib/auth/security';

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('mealpass_session')?.value;
    if (sessionCookie) {
      await revokeSessionToken(sessionCookie);
    }
  } catch (err) {
    console.warn('Logout session revocation note:', err);
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
  response.cookies.set({
    name: 'mealpass_session',
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return response;
}
