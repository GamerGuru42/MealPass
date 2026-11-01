import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';

export async function POST(req: NextRequest) {
  try {
    const callerRole = req.headers.get('x-user-role');
    if (callerRole === 'STUDENT') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Students cannot verify meal pickups at the counter.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { searchKey, cafeteriaId, method } = body;

    if (!searchKey || !searchKey.trim()) {
      return NextResponse.json({ success: false, error: 'Pickup code, QR token, or order number is required.' }, { status: 400 });
    }

    const result = await MealPassService.verifyPickup({
      searchKey: searchKey.trim(),
      cafeteriaId: cafeteriaId || 'c0000000-0000-0000-0000-000000000001',
      verifiedBy: 'Tunde Adeyemi (Cafeteria Staff)',
      method,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Pickup verification failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

