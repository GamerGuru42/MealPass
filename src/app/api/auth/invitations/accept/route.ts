import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Invitation token is required.' }, { status: 400 });
    }

    const invitation = await MealPassService.verifyInvitationToken(token);
    return NextResponse.json({
      success: true,
      data: {
        email: invitation.email,
        role: invitation.role,
        cafeteriaId: invitation.cafeteriaId,
        cafeteriaName: invitation.cafeteriaName,
        invitedByName: invitation.invitedByName,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid or expired invitation';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, userId, userEmail, userFullName } = body;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Invitation token is required.' }, { status: 400 });
    }

    if (!userFullName || userFullName.trim().length < 3) {
      return NextResponse.json({ success: false, error: 'Full legal name is required for university operator onboarding.' }, { status: 400 });
    }

    const result = await MealPassService.acceptOperatorInvitation({
      token,
      userId: userId || `user-op-${Date.now()}`,
      userEmail: userEmail || 'operator@cosmopolitan.edu.ng',
      userFullName: userFullName.trim(),
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      data: {
        role: result.role,
        cafeteriaId: result.cafeteriaId,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to accept invitation';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

