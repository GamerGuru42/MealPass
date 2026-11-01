import { NextRequest, NextResponse } from 'next/server';
import { MealPassService } from '@/lib/services/mealpass.service';
import { menuItemSchema, updatePriceSchema } from '@/lib/validations';

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
    const body = await req.json();

    const parsed = menuItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid menu item data' },
        { status: 400 }
      );
    }

    const { cafeteriaId, categoryId, name, description, currentPrice, isAvailable, displayOrder } = parsed.data;

    const callerRole = body.role || req.headers.get('x-user-role');
    if (!callerRole || !['CAFETERIA_HEAD', 'SUPER_ADMIN'].includes(callerRole)) {
      return NextResponse.json(
        { success: false, error: 'Permission Denied: Only Cafeteria Head has authority to create menu items.' },
        { status: 403 }
      );
    }

    const newItem = await MealPassService.createMenuItem({
      cafeteriaId,
      categoryId,
      name,
      description: description || undefined,
      currentPrice,
      isAvailable,
      displayOrder,
      role: callerRole,
    });

    return NextResponse.json({ success: true, data: newItem }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create menu item';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, menuItemId, isAvailable, newPrice, isAffordableFeatured, reason, role } = body;
    const targetId = id || menuItemId;

    if (!targetId) {
      return NextResponse.json({ success: false, error: 'Menu item ID is required' }, { status: 400 });
    }

    // Toggle availability
    if (typeof isAvailable === 'boolean') {
      const res = await MealPassService.updateMenuItemAvailability({
        itemId: targetId,
        isAvailable,
        changedBy: 'e0000000-0000-0000-0000-000000000003', // Cafeteria head
      });
      return NextResponse.json(res);
    }

    // Toggle affordable meal designation (Cafeteria Head authority)
    if (typeof isAffordableFeatured === 'boolean') {
      const callerRole = role || req.headers.get('x-user-role');
      if (!callerRole || !['CAFETERIA_HEAD', 'SUPER_ADMIN'].includes(callerRole)) {
        return NextResponse.json(
          { success: false, error: 'Permission Denied: Only Cafeteria Head has authority to toggle affordable meal designation.' },
          { status: 403 }
        );
      }

      const res = await MealPassService.updateMenuItemAffordableTag({
        itemId: targetId,
        isAffordableFeatured,
        role: callerRole,
      });
      return NextResponse.json(res);
    }

    // Update price with mandatory audit reason
    if (typeof newPrice === 'number') {
      const parsed = updatePriceSchema.safeParse({ newPrice, reason });
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.errors[0]?.message || 'Valid price and audit reason required' },
          { status: 400 }
        );
      }

      const callerRole = role || req.headers.get('x-user-role');
      if (!callerRole || !['CAFETERIA_HEAD', 'SUPER_ADMIN'].includes(callerRole)) {
        return NextResponse.json(
          { success: false, error: 'Permission Denied: Only Cafeteria Head has authority to alter menu item prices.' },
          { status: 403 }
        );
      }

      const res = await MealPassService.updateMenuItemPrice({
        itemId: targetId,
        newPrice: parsed.data.newPrice,
        reason: parsed.data.reason,
        changedBy: 'e0000000-0000-0000-0000-000000000003',
        role: callerRole,
      });
      return NextResponse.json(res);
    }

    return NextResponse.json({ success: false, error: 'No valid action provided' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update menu item';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
