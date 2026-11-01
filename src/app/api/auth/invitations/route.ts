import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { RoleName } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const callerRole = req.headers.get('x-user-role');
    if (callerRole && !['CAFETERIA_HEAD', 'FINANCE_ADMIN', 'SUPER_ADMIN'].includes(callerRole)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Access restricted to authorized administrators.' },
        { status: 403 }
      );
    }

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
    const callerRole = req.headers.get('x-user-role');
    const callerId = req.headers.get('x-user-id') || '00000000-0000-0000-0000-000000000001';

    // Authorization check
    if (!callerRole || !['SUPER_ADMIN', 'FINANCE_ADMIN', 'CAFETERIA_HEAD'].includes(callerRole)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You lack permissions to issue operator invitations.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, role, cafeteriaId, invitedByName, expiresInHours } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'A valid email address is required.' }, { status: 400 });
    }

    if (!role || !['CAFETERIA_HEAD', 'CAFETERIA_STAFF', 'FINANCE_ADMIN'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid operator role specified.' }, { status: 400 });
    }

    // Role Escalation Guard: Cafeteria Head can only invite Cafeteria Staff, NOT another Head or Admin
    if (callerRole === 'CAFETERIA_HEAD' && role !== 'CAFETERIA_STAFF') {
      return NextResponse.json(
        { success: false, error: 'Permission Denied: Cafeteria Head may only invite Cafeteria Kitchen & Counter Staff.' },
        { status: 403 }
      );
    }

    const invitation = await MealPassService.createOperatorInvitation({
      email,
      role: role as RoleName,
      cafeteriaId,
      invitedBy: callerId,
      invitedByName: invitedByName || (callerRole === 'CAFETERIA_HEAD' ? 'Madam Okonkwo (Cafeteria Head)' : 'System Administrator'),
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

