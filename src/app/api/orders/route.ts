import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { createOrderSchema } from '@/lib/validations';
import { requireAuth } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentProfileId = searchParams.get('studentProfileId') || undefined;
    const cafeteriaId = searchParams.get('cafeteriaId') || undefined;

    const { user, errorResponse } = await requireAuth(
      req,
      ['STUDENT', 'CAFETERIA_STAFF', 'CAFETERIA_HEAD', 'FINANCE_ADMIN', 'SUPER_ADMIN'],
      { targetStudentProfileId: studentProfileId }
    );
    if (errorResponse) return errorResponse;

    const effectiveStudentId = user.role === 'STUDENT' ? user.studentProfileId : (studentProfileId || user.studentProfileId);

    const ordersResult: any = await MealPassService.getOrders({
      studentProfileId: effectiveStudentId,
      cafeteriaId,
    });
    const ordersList = Array.isArray(ordersResult) ? ordersResult : (ordersResult?.orders || []);
    return NextResponse.json({ success: true, data: ordersList });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch orders';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Zod input validation
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid order data' },
        { status: 400 }
      );
    }

    const { studentProfileId, studentName, matricNumber, cafeteriaId, items, notes, pin, idempotencyKey } = parsed.data;
    const headerKey = req.headers.get('x-idempotency-key');

    // 2. Authoritative Server Auth & IDOR Guard
    const { user, errorResponse } = await requireAuth(
      req,
      ['STUDENT', 'SUPER_ADMIN'],
      { targetStudentProfileId: studentProfileId }
    );
    if (errorResponse) return errorResponse;

    // Authoritative student profile binding
    const effectiveStudentId = user.role === 'STUDENT' && user.studentProfileId
      ? user.studentProfileId
      : (studentProfileId || 'f0000000-0000-0000-0000-000000000001');

    // 3. Atomic Order & Financial Deduction via MealPassService (Supabase RPC)
    const result = await MealPassService.placeOrder({
      studentProfileId: effectiveStudentId,
      studentName: studentName || user.fullName,
      matricNumber: matricNumber || 'CU/2024/0142',
      cafeteriaId: cafeteriaId || 'c0000000-0000-0000-0000-000000000001',
      items,
      notes,
      pin,
      feedingAccountId: '10000000-0000-0000-0000-000000000001',
      idempotencyKey: idempotencyKey || headerKey || null,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          order: result.order,
          ledgerEntry: result.ledgerEntry,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Order processing failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
