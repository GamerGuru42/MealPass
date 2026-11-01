import { NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';

export async function GET() {
  try {
    const campuses = await MealPassService.getCampuses();
    return NextResponse.json({ success: true, data: campuses });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch campuses';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

