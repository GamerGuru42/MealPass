import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { menuItemSchema, updatePriceSchema } from '@/lib/validations';
import { requireAuth } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cafeteriaId = searchParams.get('cafeteriaId') || 'c0000000-0000-0000-0000-000000000001';

    const [menu, categories] = await Promise.all([
      MealPassService.getMenu(cafeteriaId),
      MealPassService.getCategories(),
    ]);

    const combos = MealPassService.getAffordableCombos(menu);

    return NextResponse.json({ success: true, data: menu, categories, combos });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch menu';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req, ['CAFETERIA_HEAD', 'SUPER_ADMIN']);
    if (errorResponse) return errorResponse;

    const body = await req.json();

    const parsed = menuItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid menu item data' },
        { status: 400 }
      );
    }

    const { cafeteriaId, categoryId, name, description, currentPrice, isAvailable, displayOrder } = parsed.data;

    const newItem = await MealPassService.createMenuItem({
      cafeteriaId,
      categoryId,
      name,
      description: description || undefined,
      currentPrice,
      isAvailable,
      displayOrder,
      role: user.role,
    });

    return NextResponse.json({ success: true, data: newItem }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create menu item';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req, ['CAFETERIA_HEAD', 'CAFETERIA_STAFF', 'SUPER_ADMIN']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { id, menuItemId, isAvailable, newPrice, isAffordableFeatured, reason } = body;
    const targetId = id || menuItemId;

    if (!targetId) {
      return NextResponse.json({ success: false, error: 'Menu item ID is required' }, { status: 400 });
    }

    // Toggle availability (Staff or Head)
    if (typeof isAvailable === 'boolean') {
      const res = await MealPassService.updateMenuItemAvailability({
        itemId: targetId,
        isAvailable,
        changedBy: user.userId,
      });
      return NextResponse.json(res);
    }

    // Toggle affordable meal designation (Cafeteria Head or Super Admin authority ONLY)
    if (typeof isAffordableFeatured === 'boolean') {
      if (!['CAFETERIA_HEAD', 'SUPER_ADMIN'].includes(user.role)) {
        return NextResponse.json(
          { success: false, error: 'Permission Denied: Only Cafeteria Head has authority to toggle affordable meal designation.' },
          { status: 403 }
        );
      }

      const res = await MealPassService.updateMenuItemAffordableTag({
        itemId: targetId,
        isAffordableFeatured,
        role: user.role,
      });
      return NextResponse.json(res);
    }

    // Update price with mandatory audit reason (Cafeteria Head or Super Admin authority ONLY)
    if (typeof newPrice === 'number') {
      if (!['CAFETERIA_HEAD', 'SUPER_ADMIN'].includes(user.role)) {
        return NextResponse.json(
          { success: false, error: 'Permission Denied: Only Cafeteria Head has authority to alter menu item prices.' },
          { status: 403 }
        );
      }

      const parsed = updatePriceSchema.safeParse({ newPrice, reason });
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.errors[0]?.message || 'Valid price and audit reason required' },
          { status: 400 }
        );
      }

      const res = await MealPassService.updateMenuItemPrice({
        itemId: targetId,
        newPrice: parsed.data.newPrice,
        reason: parsed.data.reason,
        changedBy: user.userId,
        role: user.role,
      });
      return NextResponse.json(res);
    }

    return NextResponse.json({ success: false, error: 'No valid action provided' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update menu item';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
