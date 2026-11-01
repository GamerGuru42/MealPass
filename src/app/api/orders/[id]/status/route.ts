import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { updateOrderStatusSchema } from '@/lib/validations';
import { requireAuth } from '@/lib/auth/server-auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, errorResponse } = await requireAuth(
      req,
      ['CAFETERIA_STAFF', 'CAFETERIA_HEAD', 'FINANCE_ADMIN', 'SUPER_ADMIN'],
      { requireCafeteriaScope: true }
    );
    if (errorResponse) return errorResponse;

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

    const updated = await MealPassService.updateOrderStatus({
      orderId: id,
      newStatus: targetStatus,
      changedBy: user.userId,
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
