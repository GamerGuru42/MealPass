import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { requireAuth } from '@/lib/auth/server-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { searchKey, cafeteriaId, method } = body;

    const { user, errorResponse } = await requireAuth(
      req,
      ['CAFETERIA_STAFF', 'CAFETERIA_HEAD', 'SUPER_ADMIN'],
      { targetCafeteriaId: cafeteriaId, requireCafeteriaScope: true }
    );
    if (errorResponse) return errorResponse;

    if (!searchKey || !searchKey.trim()) {
      return NextResponse.json({ success: false, error: 'Pickup code, QR token, or order number is required.' }, { status: 400 });
    }

    const result = await MealPassService.verifyPickup({
      searchKey: searchKey.trim(),
      cafeteriaId: cafeteriaId || user.cafeteriaId || 'c0000000-0000-0000-0000-000000000001',
      verifiedBy: user.fullName || 'Tunde Adeyemi (Cafeteria Staff)',
      method,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Pickup verification failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
