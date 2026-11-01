import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { RoleName } from '@/types';
import { requireAuth } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth(req, ['CAFETERIA_HEAD', 'FINANCE_ADMIN', 'SUPER_ADMIN']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const cafeteriaId = searchParams.get('cafeteriaId') || undefined;

    const invitations = await MealPassService.getOperatorInvitations(cafeteriaId);
    return NextResponse.json({ success: true, data: invitations });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve invitations';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req, ['SUPER_ADMIN', 'FINANCE_ADMIN', 'CAFETERIA_HEAD']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { email, role, cafeteriaId, invitedByName, expiresInHours } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'A valid email address is required.' }, { status: 400 });
    }

    if (!role || !['CAFETERIA_HEAD', 'CAFETERIA_STAFF', 'FINANCE_ADMIN'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid operator role specified.' }, { status: 400 });
    }

    // Role Escalation Guard: Cafeteria Head can only invite Cafeteria Staff, NOT another Head or Admin
    if (user.role === 'CAFETERIA_HEAD' && role !== 'CAFETERIA_STAFF') {
      return NextResponse.json(
        { success: false, error: 'Permission Denied: Cafeteria Head may only invite Cafeteria Kitchen & Counter Staff.' },
        { status: 403 }
      );
    }

    const invitation = await MealPassService.createOperatorInvitation({
      email,
      role: role as RoleName,
      cafeteriaId,
      invitedBy: user.userId,
      invitedByName: invitedByName || user.fullName,
      expiresInHours: Number(expiresInHours) || 48,
    });

    return NextResponse.json({
      success: true,
      message: `Invitation successfully issued to ${email} for role ${role}.`,
      data: invitation,
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create operator invitation';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
