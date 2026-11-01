import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { updateOrderStatusSchema } from '@/lib/validations';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const parsed = updateOrderStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid status transition' },
        { status: 400 }
      );
    }

    const { status, newStatus, reason, isManual } = parsed.data;
    const targetStatus = (status || newStatus)!;

    const callerRole = req.headers.get('x-user-role');
    if (callerRole === 'STUDENT') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Students cannot modify order fulfillment status.' },
        { status: 403 }
      );
    }

    const updated = await MealPassService.updateOrderStatus({
      orderId: id,
      newStatus: targetStatus,
      changedBy: 'e0000000-0000-0000-0000-000000000002',
      reason: reason || undefined,
      isManual,
    });

    const orderPayload = updated.data || updated;
    return NextResponse.json({
      success: true,
      data: orderPayload,
      status: orderPayload.status || targetStatus,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update order status';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
