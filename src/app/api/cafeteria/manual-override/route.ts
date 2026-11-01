import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { manualReceivedSchema } from '@/lib/validations';
import { requireAuth } from '@/lib/auth/server-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, cafeteriaId } = body;

    const { user, errorResponse } = await requireAuth(
      req,
      ['CAFETERIA_HEAD', 'SUPER_ADMIN'],
      { targetCafeteriaId: cafeteriaId }
    );
    if (errorResponse) return errorResponse;

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

    const result = await MealPassService.manualReceivedOverride({
      orderId,
      cafeteriaId: cafeteriaId || user.cafeteriaId || 'c0000000-0000-0000-0000-000000000001',
      authorizedBy: user.fullName || 'Madam Okonkwo (Cafeteria Head)',
      role: user.role,
      reason: parsed.data.reason,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Manual override failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
