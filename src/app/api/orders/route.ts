import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { createOrderSchema } from '@/lib/validations';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentProfileId = searchParams.get('studentProfileId') || 'f0000000-0000-0000-0000-000000000001';
    const cafeteriaId = searchParams.get('cafeteriaId') || undefined;

    // IDOR & Cross-Student Isolation Guard
    const authenticatedStudentId = req.headers.get('x-student-id');
    const callerRole = req.headers.get('x-user-role');
    if (authenticatedStudentId && studentProfileId && authenticatedStudentId !== studentProfileId) {
      if (!['CAFETERIA_STAFF', 'CAFETERIA_HEAD', 'FINANCE_ADMIN', 'SUPER_ADMIN'].includes(callerRole || '')) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Cross-student orders access is prohibited (IDOR Guard).' },
          { status: 403 }
        );
      }
    }

    const ordersResult: any = await MealPassService.getOrders({ studentProfileId, cafeteriaId });
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

    // Cross-student impersonation guard
    const authenticatedStudentId = req.headers.get('x-student-id');
    if (authenticatedStudentId && studentProfileId && authenticatedStudentId !== studentProfileId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You cannot place orders on behalf of another student.' },
        { status: 403 }
      );
    }

    // 2. Atomic Order & Financial Deduction via MealPassService (Supabase RPC)
    const result = await MealPassService.placeOrder({
      studentProfileId: studentProfileId || 'f0000000-0000-0000-0000-000000000001',
      studentName: studentName || 'Amina Ibrahim',
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
    const message = error instanceof Error ? error.message : 'Failed to process order';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
