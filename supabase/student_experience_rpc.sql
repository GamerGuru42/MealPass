-- ====================================================================
-- MEALPASS STUDENT EXPERIENCE RPCs & POLICIES
-- Platform: MealPass (Cosmopolitan University Digital Feeding Platform)
-- Technology Attribution: Powered by NextGen Technologies
-- ====================================================================

-- 1. Public Read Policies for Menu & Cafeteria (so students & kiosk can view menu freely)
DROP POLICY IF EXISTS "Public can view active menu items" ON public.menu_items;
CREATE POLICY "Public can view active menu items"
ON public.menu_items FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Public can view active menu categories" ON public.menu_categories;
CREATE POLICY "Public can view active menu categories"
ON public.menu_categories FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Public can view active cafeterias" ON public.cafeterias;
CREATE POLICY "Public can view active cafeterias"
ON public.cafeterias FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Public can view active universities" ON public.universities;
CREATE POLICY "Public can view active universities"
ON public.universities FOR SELECT
USING (is_active = true);


-- 2. get_cafeteria_menu(p_cafeteria_id UUID)
-- Returns all active categories and items for the cafeteria
CREATE OR REPLACE FUNCTION public.get_cafeteria_menu(
    p_cafeteria_id UUID DEFAULT 'c0000000-0000-0000-0000-000000000001'::UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_categories JSONB;
    v_items JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', mc.id,
            'name', mc.name,
            'displayOrder', mc.display_order
        ) ORDER BY mc.display_order
    ), '[]'::jsonb)
    INTO v_categories
    FROM public.menu_categories mc
    WHERE mc.cafeteria_id = p_cafeteria_id AND mc.is_active = true;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', mi.id,
            'cafeteriaId', mi.cafeteria_id,
            'categoryId', mi.category_id,
            'categoryName', mc.name,
            'name', mi.name,
            'description', mi.description,
            'price', mi.current_price,
            'isAvailable', mi.is_available,
            'displayOrder', mi.display_order
        ) ORDER BY mc.display_order, mi.display_order
    ), '[]'::jsonb)
    INTO v_items
    FROM public.menu_items mi
    JOIN public.menu_categories mc ON mc.id = mi.category_id
    WHERE mi.cafeteria_id = p_cafeteria_id AND mi.is_active = true;

    RETURN jsonb_build_object(
        'success', true,
        'cafeteriaId', p_cafeteria_id,
        'categories', v_categories,
        'items', v_items
    );
END;
$$;


-- 3. get_student_dashboard(p_student_profile_id UUID)
-- Atomic, performant single-roundtrip dashboard payload
CREATE OR REPLACE FUNCTION public.get_student_dashboard(
    p_student_profile_id UUID DEFAULT 'f0000000-0000-0000-0000-000000000001'::UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_student RECORD;
    v_feeding_account RECORD;
    v_balance NUMERIC(12,2) := 0.00;
    v_total_allocated NUMERIC(12,2) := 0.00;
    v_total_consumed NUMERIC(12,2) := 0.00;
    v_active_order JSONB := NULL;
    v_recent_orders JSONB := '[]'::jsonb;
    v_recent_transactions JSONB := '[]'::jsonb;
    v_cafeteria RECORD;
BEGIN
    -- 1. Get student profile & user info
    SELECT 
        sp.id,
        sp.matric_number,
        sp.department,
        sp.faculty,
        sp.level,
        sp.is_feeding_active,
        up.first_name,
        up.last_name,
        up.email,
        up.phone,
        u.name AS university_name,
        u.currency
    INTO v_student
    FROM public.student_profiles sp
    JOIN public.user_profiles up ON up.id = sp.user_profile_id
    JOIN public.universities u ON u.id = sp.university_id
    WHERE sp.id = p_student_profile_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student profile not found');
    END IF;

    -- 2. Get feeding account
    SELECT id INTO v_feeding_account
    FROM public.feeding_accounts
    WHERE student_profile_id = p_student_profile_id AND is_active = true
    LIMIT 1;

    IF FOUND THEN
        -- Current Authoritative Running Balance
        SELECT COALESCE(running_balance, 0.00) INTO v_balance
        FROM public.ledger_entries
        WHERE feeding_account_id = v_feeding_account.id
        ORDER BY created_at DESC
        LIMIT 1;

        -- Total Allocated
        SELECT COALESCE(SUM(amount), 0.00) INTO v_total_allocated
        FROM public.ledger_entries
        WHERE feeding_account_id = v_feeding_account.id AND transaction_type = 'ALLOCATION';

        -- Total Consumed
        SELECT COALESCE(SUM(amount), 0.00) INTO v_total_consumed
        FROM public.ledger_entries
        WHERE feeding_account_id = v_feeding_account.id AND transaction_type = 'MEAL_DEDUCTION';

        -- Recent 5 ledger entries
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', le.id,
                'transactionType', le.transaction_type,
                'amount', le.amount,
                'runningBalance', le.running_balance,
                'referenceId', le.reference_id,
                'description', le.description,
                'createdAt', le.created_at
            ) ORDER BY le.created_at DESC
        ), '[]'::jsonb)
        INTO v_recent_transactions
        FROM (
            SELECT * FROM public.ledger_entries
            WHERE feeding_account_id = v_feeding_account.id
            ORDER BY created_at DESC
            LIMIT 5
        ) le;
    END IF;

    -- 3. Active Order (PLACED, ACCEPTED, PREPARING, READY)
    SELECT jsonb_build_object(
        'id', o.id,
        'orderNumber', o.order_number,
        'status', o.status,
        'totalAmount', o.total_amount,
        'pickupCode', o.pickup_code,
        'pickupQrToken', o.pickup_qr_token,
        'placedAt', o.placed_at,
        'acceptedAt', o.accepted_at,
        'preparingAt', o.preparing_at,
        'readyAt', o.ready_at,
        'notes', o.notes,
        'cafeteriaName', c.name,
        'items', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'itemName', oi.item_name,
                    'quantity', oi.quantity,
                    'unitPrice', oi.unit_price,
                    'subtotal', oi.subtotal
                )
            ), '[]'::jsonb)
            FROM public.order_items oi
            WHERE oi.order_id = o.id
        )
    )
    INTO v_active_order
    FROM public.orders o
    JOIN public.cafeterias c ON c.id = o.cafeteria_id
    WHERE o.student_profile_id = p_student_profile_id
      AND o.status IN ('PLACED', 'ACCEPTED', 'PREPARING', 'READY')
    ORDER BY o.placed_at DESC
    LIMIT 1;

    -- 4. Recent 5 Orders
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', o.id,
            'orderNumber', o.order_number,
            'status', o.status,
            'totalAmount', o.total_amount,
            'pickupCode', o.pickup_code,
            'pickupQrToken', o.pickup_qr_token,
            'placedAt', o.placed_at,
            'receivedAt', o.received_at,
            'cancelledAt', o.cancelled_at,
            'cancellationReason', o.cancellation_reason,
            'cafeteriaName', c.name,
            'items', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'itemName', oi.item_name,
                        'quantity', oi.quantity,
                        'unitPrice', oi.unit_price,
                        'subtotal', oi.subtotal
                    )
                ), '[]'::jsonb)
                FROM public.order_items oi
                WHERE oi.order_id = o.id
            )
        ) ORDER BY o.placed_at DESC
    ), '[]'::jsonb)
    INTO v_recent_orders
    FROM (
        SELECT * FROM public.orders
        WHERE student_profile_id = p_student_profile_id
        ORDER BY placed_at DESC
        LIMIT 5
    ) o
    JOIN public.cafeterias c ON c.id = o.cafeteria_id;

    -- 5. Cafeteria Status
    SELECT name, is_active, operating_hours
    INTO v_cafeteria
    FROM public.cafeterias
    WHERE id = 'c0000000-0000-0000-0000-000000000001'::UUID;

    RETURN jsonb_build_object(
        'success', true,
        'student', jsonb_build_object(
            'id', v_student.id,
            'name', v_student.first_name || ' ' || v_student.last_name,
            'firstName', v_student.first_name,
            'lastName', v_student.last_name,
            'matricNumber', v_student.matric_number,
            'department', v_student.department,
            'faculty', v_student.faculty,
            'level', v_student.level,
            'email', v_student.email,
            'phone', v_student.phone,
            'isFeedingActive', v_student.is_feeding_active,
            'universityName', v_student.university_name,
            'currency', v_student.currency
        ),
        'financial', jsonb_build_object(
            'feedingAccountId', v_feeding_account.id,
            'balance', v_balance,
            'totalAllocated', v_total_allocated,
            'totalConsumed', v_total_consumed
        ),
        'activeOrder', v_active_order,
        'recentOrders', v_recent_orders,
        'recentTransactions', v_recent_transactions,
        'cafeteria', jsonb_build_object(
            'name', COALESCE(v_cafeteria.name, 'Main Campus Cafeteria'),
            'isOpen', COALESCE(v_cafeteria.is_active, true),
            'operatingHours', v_cafeteria.operating_hours
        )
    );
END;
$$;


-- 4. get_student_orders(p_student_profile_id UUID)
-- Complete order history with items and status timeline
CREATE OR REPLACE FUNCTION public.get_student_orders(
    p_student_profile_id UUID DEFAULT 'f0000000-0000-0000-0000-000000000001'::UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_orders JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', o.id,
            'orderNumber', o.order_number,
            'idempotencyKey', o.idempotency_key,
            'studentProfileId', o.student_profile_id,
            'studentName', up.first_name || ' ' || up.last_name,
            'matricNumber', sp.matric_number,
            'cafeteriaId', o.cafeteria_id,
            'cafeteriaName', c.name,
            'status', o.status,
            'totalAmount', o.total_amount,
            'pickupCode', o.pickup_code,
            'pickupQrToken', o.pickup_qr_token,
            'notes', o.notes,
            'placedAt', o.placed_at,
            'acceptedAt', o.accepted_at,
            'preparingAt', o.preparing_at,
            'readyAt', o.ready_at,
            'receivedAt', o.received_at,
            'receivedBy', o.received_by,
            'cancelledAt', o.cancelled_at,
            'cancellationReason', o.cancellation_reason,
            'items', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'id', oi.id,
                        'orderId', oi.order_id,
                        'menuItemId', oi.menu_item_id,
                        'itemName', oi.item_name,
                        'unitPrice', oi.unit_price,
                        'quantity', oi.quantity,
                        'subtotal', oi.subtotal
                    )
                ), '[]'::jsonb)
                FROM public.order_items oi
                WHERE oi.order_id = o.id
            ),
            'statusHistory', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'previousStatus', osh.previous_status,
                        'newStatus', osh.new_status,
                        'changedBy', osh.changed_by,
                        'reason', osh.reason,
                        'timestamp', osh.created_at,
                        'isManual', osh.is_manual
                    ) ORDER BY osh.created_at ASC
                ), '[]'::jsonb)
                FROM public.order_status_history osh
                WHERE osh.order_id = o.id
            )
        ) ORDER BY o.placed_at DESC
    ), '[]'::jsonb)
    INTO v_orders
    FROM public.orders o
    JOIN public.cafeterias c ON c.id = o.cafeteria_id
    JOIN public.student_profiles sp ON sp.id = o.student_profile_id
    JOIN public.user_profiles up ON up.id = sp.user_profile_id
    WHERE o.student_profile_id = p_student_profile_id;

    RETURN jsonb_build_object(
        'success', true,
        'orders', v_orders
    );
END;
$$;


-- 5. get_student_transactions(p_student_profile_id UUID)
-- Complete ledger statement with running balance and audit references
CREATE OR REPLACE FUNCTION public.get_student_transactions(
    p_student_profile_id UUID DEFAULT 'f0000000-0000-0000-0000-000000000001'::UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_feeding_account_id UUID;
    v_transactions JSONB;
    v_balance NUMERIC(12,2) := 0.00;
    v_total_allocated NUMERIC(12,2) := 0.00;
    v_total_spent NUMERIC(12,2) := 0.00;
    v_total_refunded NUMERIC(12,2) := 0.00;
BEGIN
    SELECT id INTO v_feeding_account_id
    FROM public.feeding_accounts
    WHERE student_profile_id = p_student_profile_id AND is_active = true
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Feeding account not found');
    END IF;

    -- Current Running Balance
    SELECT COALESCE(running_balance, 0.00) INTO v_balance
    FROM public.ledger_entries
    WHERE feeding_account_id = v_feeding_account_id
    ORDER BY created_at DESC
    LIMIT 1;

    -- Totals
    SELECT COALESCE(SUM(amount), 0.00) INTO v_total_allocated
    FROM public.ledger_entries
    WHERE feeding_account_id = v_feeding_account_id AND transaction_type = 'ALLOCATION';

    SELECT COALESCE(SUM(amount), 0.00) INTO v_total_spent
    FROM public.ledger_entries
    WHERE feeding_account_id = v_feeding_account_id AND transaction_type = 'MEAL_DEDUCTION';

    SELECT COALESCE(SUM(amount), 0.00) INTO v_total_refunded
    FROM public.ledger_entries
    WHERE feeding_account_id = v_feeding_account_id AND transaction_type = 'REFUND';

    -- All transactions
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', le.id,
            'feedingAccountId', le.feeding_account_id,
            'transactionType', le.transaction_type,
            'amount', le.amount,
            'runningBalance', le.running_balance,
            'referenceId', le.reference_id,
            'description', le.description,
            'createdAt', le.created_at,
            'createdBy', COALESCE(le.created_by, 'System')
        ) ORDER BY le.created_at DESC
    ), '[]'::jsonb)
    INTO v_transactions
    FROM public.ledger_entries le
    WHERE le.feeding_account_id = v_feeding_account_id;

    RETURN jsonb_build_object(
        'success', true,
        'summary', jsonb_build_object(
            'currentBalance', v_balance,
            'totalAllocated', v_total_allocated,
            'totalSpent', v_total_spent,
            'totalRefunded', v_total_refunded
        ),
        'transactions', v_transactions
    );
END;
$$;

