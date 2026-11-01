import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { manualReceivedSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, cafeteriaId, role, authorizedBy } = body;

    const parsed = manualReceivedSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid manual override reason' },
        { status: 400 }
      );
    }

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 });
    }

    const callerRole = role || req.headers.get('x-user-role');
    if (!callerRole || !['CAFETERIA_HEAD', 'SUPER_ADMIN'].includes(callerRole)) {
      return NextResponse.json(
        { success: false, error: 'Permission Denied: Only Cafeteria Head (Madam) has authority to perform manual collection overrides.' },
        { status: 403 }
      );
    }

    const result = await MealPassService.manualReceivedOverride({
      orderId,
      cafeteriaId: cafeteriaId || 'c0000000-0000-0000-0000-000000000001',
      authorizedBy: authorizedBy || 'Madam Funke Adeyemi (Cafeteria Head)',
      role: callerRole,
      reason: parsed.data.reason,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Manual override failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

