-- ====================================================================
-- MEALPASS PRODUCTION AUTHORIZATION HARDENING & PERMISSION MIGRATION
-- Migration: 02_production_authorization_hardening.sql
-- Target Project: ipdqfejoctltasrzbdaj (North EU / eu-north-1)
-- Scope: Fixes PostgreSQL EXECUTE grants and enforces defense-in-depth JWT checks
-- Idempotency: Safe to execute repeatedly without data loss or schema conflicts
-- ====================================================================

-- 1. Helper Functions (Fixed search_path & Definitive Schema Resolution)
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS VARCHAR
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_role VARCHAR;
BEGIN
    SELECT role INTO v_role
    FROM public.user_profiles
    WHERE auth_user_id = auth.uid();
    RETURN v_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_student_profile_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_id UUID;
BEGIN
    SELECT sp.id INTO v_id
    FROM public.student_profiles sp
    JOIN public.user_profiles up ON up.id = sp.user_profile_id
    WHERE up.auth_user_id = auth.uid();
    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_cafeteria_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_id UUID;
BEGIN
    SELECT cs.cafeteria_id INTO v_id
    FROM public.cafeteria_staff cs
    JOIN public.user_profiles up ON up.id = cs.user_profile_id
    WHERE up.auth_user_id = auth.uid() AND cs.is_active = true;
    RETURN v_id;
END;
$$;

-- 2. Hardened place_mealpass_order Function
CREATE OR REPLACE FUNCTION public.place_mealpass_order(
    p_student_profile_id UUID,
    p_cafeteria_id UUID,
    p_items JSONB,
    p_pin VARCHAR,
    p_notes TEXT DEFAULT NULL,
    p_idempotency_key VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_university_id UUID;
    v_user_profile_id UUID;
    v_feeding_account_id UUID;
    v_is_feeding_active BOOLEAN;
    v_pin_hash VARCHAR;
    v_pin_attempts INT;
    v_pin_locked_until TIMESTAMPTZ;
    v_current_balance NUMERIC(12, 2) := 0.00;
    v_total_amount NUMERIC(12, 2) := 0.00;
    v_new_balance NUMERIC(12, 2);
    v_shortfall NUMERIC(12, 2);
    v_order_id UUID := gen_random_uuid();
    v_order_number VARCHAR(100);
    v_pickup_code VARCHAR(20);
    v_pickup_qr_token VARCHAR(255);
    v_ledger_entry_id UUID := gen_random_uuid();
    v_item RECORD;
    v_menu_item RECORD;
    v_item_subtotal NUMERIC(12, 2);
    v_order_items_json JSONB := '[]'::jsonb;
    v_response_payload JSONB;
    v_random_suffix INT;
BEGIN
    -- Idempotency Check
    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
        SELECT response_payload INTO v_response_payload
        FROM public.idempotency_records
        WHERE idempotency_key = p_idempotency_key
          AND expires_at > NOW();

        IF FOUND THEN
            RETURN v_response_payload;
        END IF;
    END IF;

    -- Defense-in-depth: Verify authenticated student is placing order for their own account
    IF auth.jwt() ->> 'role' <> 'service_role' AND auth.uid() IS NOT NULL THEN
        IF public.get_auth_student_profile_id() IS NOT NULL AND public.get_auth_student_profile_id() <> p_student_profile_id THEN
            RAISE EXCEPTION 'Unauthorized: Cannot place order for another student account.';
        END IF;
    END IF;

    -- Validate Items
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order must contain at least one menu item.';
    END IF;

    -- Lock student profile and verify status
    SELECT 
        sp.university_id,
        sp.user_profile_id,
        sp.is_feeding_active,
        sp.pin_hash,
        sp.pin_failed_attempts,
        sp.pin_locked_until
    INTO 
        v_university_id,
        v_user_profile_id,
        v_is_feeding_active,
        v_pin_hash,
        v_pin_attempts,
        v_pin_locked_until
    FROM public.student_profiles sp
    WHERE sp.id = p_student_profile_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student profile not found.';
    END IF;

    IF NOT v_is_feeding_active THEN
        RAISE EXCEPTION 'Student feeding account is inactive. Please contact University Bursary.';
    END IF;

    -- Check PIN Lockout
    IF v_pin_locked_until IS NOT NULL AND v_pin_locked_until > NOW() THEN
        RAISE EXCEPTION 'Transaction PIN is locked due to repeated failed attempts. Try again later.';
    END IF;

    -- Verify Transaction PIN
    IF v_pin_hash IS NULL OR v_pin_hash <> crypt(p_pin, v_pin_hash) THEN
        v_pin_attempts := COALESCE(v_pin_attempts, 0) + 1;
        IF v_pin_attempts >= 3 THEN
            UPDATE public.student_profiles
            SET pin_failed_attempts = v_pin_attempts,
                pin_locked_until = NOW() + INTERVAL '15 minutes'
            WHERE id = p_student_profile_id;
            RAISE EXCEPTION 'Invalid transaction PIN. Maximum attempts exceeded. Account locked for 15 minutes.';
        ELSE
            UPDATE public.student_profiles
            SET pin_failed_attempts = v_pin_attempts
            WHERE id = p_student_profile_id;
            RAISE EXCEPTION 'Invalid transaction PIN. Remaining attempts: %', (3 - v_pin_attempts);
        END IF;
    ELSE
        IF v_pin_attempts > 0 OR v_pin_locked_until IS NOT NULL THEN
            UPDATE public.student_profiles
            SET pin_failed_attempts = 0,
                pin_locked_until = NULL
            WHERE id = p_student_profile_id;
        END IF;
    END IF;

    -- Verify Cafeteria
    PERFORM 1 FROM public.cafeterias WHERE id = p_cafeteria_id AND is_active = true;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Selected cafeteria is not active or does not exist.';
    END IF;

    -- Lock feeding account
    SELECT id INTO v_feeding_account_id
    FROM public.feeding_accounts
    WHERE student_profile_id = p_student_profile_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active feeding account not found for student.';
    END IF;

    -- Fetch current running balance
    SELECT running_balance INTO v_current_balance
    FROM public.ledger_entries
    WHERE feeding_account_id = v_feeding_account_id
    ORDER BY created_at DESC, id DESC
    LIMIT 1
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        v_current_balance := 0.00;
    END IF;

    -- Calculate total price using snapshot pricing
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(menu_item_id UUID, quantity INT)
    LOOP
        IF v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be strictly greater than zero.';
        END IF;

        SELECT id, name, current_price, is_available, is_active
        INTO v_menu_item
        FROM public.menu_items
        WHERE id = v_item.menu_item_id AND cafeteria_id = p_cafeteria_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Menu item not found in this cafeteria.';
        END IF;

        IF NOT v_menu_item.is_available OR NOT v_menu_item.is_active THEN
            RAISE EXCEPTION 'Menu item "%" is currently unavailable.', v_menu_item.name;
        END IF;

        v_item_subtotal := v_menu_item.current_price * v_item.quantity;
        v_total_amount := v_total_amount + v_item_subtotal;

        v_order_items_json := v_order_items_json || jsonb_build_object(
            'menu_item_id', v_menu_item.id,
            'name', v_menu_item.name,
            'unit_price', v_menu_item.current_price,
            'quantity', v_item.quantity,
            'subtotal', v_item_subtotal
        );
    END LOOP;

    -- Balance check
    IF v_current_balance < v_total_amount THEN
        v_shortfall := v_total_amount - v_current_balance;
        RAISE EXCEPTION 'Insufficient MealPass balance. Order Total: ₦%, Available Balance: ₦%, Shortfall: ₦%', 
            to_char(v_total_amount, 'FM999,999,990.00'), 
            to_char(v_current_balance, 'FM999,999,990.00'), 
            to_char(v_shortfall, 'FM999,999,990.00');
    END IF;

    v_new_balance := v_current_balance - v_total_amount;

    -- Generate Codes
    v_random_suffix := FLOOR(1000 + random() * 9000)::INT;
    v_order_number := 'MP-' || to_char(NOW(), 'YYYYMMDD') || '-' || v_random_suffix;
    v_pickup_code := 'CU-' || UPPER(SUBSTRING(encode(gen_random_bytes(3), 'hex') FROM 1 FOR 4));
    v_pickup_qr_token := 'MPQR:' || v_order_id || ':' || v_pickup_code || ':' || EXTRACT(EPOCH FROM NOW())::BIGINT;

    -- Insert Order
    INSERT INTO public.orders (
        id,
        order_number,
        university_id,
        cafeteria_id,
        student_profile_id,
        status,
        total_amount,
        pickup_code,
        pickup_qr_token,
        special_instructions,
        created_at,
        updated_at
    ) VALUES (
        v_order_id,
        v_order_number,
        v_university_id,
        p_cafeteria_id,
        p_student_profile_id,
        'PLACED',
        v_total_amount,
        v_pickup_code,
        v_pickup_qr_token,
        p_notes,
        NOW(),
        NOW()
    );

    -- Insert Order Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_order_items_json) AS x(menu_item_id UUID, name TEXT, unit_price NUMERIC, quantity INT, subtotal NUMERIC)
    LOOP
        INSERT INTO public.order_items (
            order_id,
            menu_item_id,
            item_name_snapshot,
            unit_price_snapshot,
            quantity,
            subtotal
        ) VALUES (
            v_order_id,
            v_item.menu_item_id,
            v_item.name,
            v_item.unit_price,
            v_item.quantity,
            v_item.subtotal
        );
    END LOOP;

    -- Insert Immutable Ledger Entry
    INSERT INTO public.ledger_entries (
        id,
        feeding_account_id,
        university_id,
        transaction_type,
        amount,
        running_balance,
        reference_id,
        description,
        created_by,
        created_at,
        metadata
    ) VALUES (
        v_ledger_entry_id,
        v_feeding_account_id,
        v_university_id,
        'MEAL_DEDUCTION',
        -v_total_amount,
        v_new_balance,
        v_order_id::TEXT,
        'Meal purchase - Order #' || v_order_number,
        v_user_profile_id,
        NOW(),
        jsonb_build_object(
            'order_id', v_order_id,
            'order_number', v_order_number,
            'items_count', jsonb_array_length(p_items)
        )
    );

    -- Order Status History
    INSERT INTO public.order_status_history (
        order_id,
        from_status,
        to_status,
        changed_by,
        reason,
        is_manual_override,
        created_at
    ) VALUES (
        v_order_id,
        NULL,
        'PLACED',
        v_user_profile_id,
        'Order successfully submitted and paid',
        false,
        NOW()
    );

    v_response_payload := jsonb_build_object(
        'success', true,
        'order', jsonb_build_object(
            'id', v_order_id,
            'order_number', v_order_number,
            'total_amount', v_total_amount,
            'pickup_code', v_pickup_code,
            'pickup_qr_token', v_pickup_qr_token,
            'status', 'PLACED',
            'created_at', NOW()
        ),
        'ledgerEntry', jsonb_build_object(
            'id', v_ledger_entry_id,
            'previous_balance', v_current_balance,
            'deduction', v_total_amount,
            'new_balance', v_new_balance
        )
    );

    -- Store idempotency record
    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
        INSERT INTO public.idempotency_records (
            idempotency_key,
            request_hash,
            response_payload,
            expires_at
        ) VALUES (
            p_idempotency_key,
            encode(digest(p_items::text || p_student_profile_id::text, 'sha256'), 'hex'),
            v_response_payload,
            NOW() + INTERVAL '24 hours'
        )
        ON CONFLICT (idempotency_key) DO UPDATE
        SET response_payload = EXCLUDED.response_payload;
    END IF;

    RETURN v_response_payload;
END;
$$;

-- 3. Hardened allocate_mealpass_funds Function
CREATE OR REPLACE FUNCTION public.allocate_mealpass_funds(
    p_student_profile_id UUID,
    p_amount NUMERIC(12, 2),
    p_description TEXT,
    p_bank_reference VARCHAR DEFAULT NULL,
    p_allocated_by_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_university_id UUID;
    v_feeding_account_id UUID;
    v_current_balance NUMERIC(12, 2) := 0.00;
    v_new_balance NUMERIC(12, 2);
    v_ledger_id UUID := gen_random_uuid();
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Allocation amount must be strictly greater than zero.';
    END IF;

    -- Authoritative Role Check (Unless service_role or unauthenticated DB maintenance)
    IF auth.jwt() ->> 'role' <> 'service_role' AND auth.uid() IS NOT NULL THEN
        IF public.get_auth_user_role() NOT IN ('SUPER_ADMIN', 'FINANCE_ADMIN') THEN
            RAISE EXCEPTION 'Unauthorized: Only Finance Administrator or Super Admin can allocate meal funds.';
        END IF;
    END IF;

    -- Lock feeding account
    SELECT id, university_id INTO v_feeding_account_id, v_university_id
    FROM public.feeding_accounts
    WHERE student_profile_id = p_student_profile_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Feeding account not found for student.';
    END IF;

    -- Get current running balance
    SELECT running_balance INTO v_current_balance
    FROM public.ledger_entries
    WHERE feeding_account_id = v_feeding_account_id
    ORDER BY created_at DESC, id DESC
    LIMIT 1
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        v_current_balance := 0.00;
    END IF;

    v_new_balance := v_current_balance + p_amount;

    -- Insert Bursary Allocation Record
    INSERT INTO public.bursary_allocations (
        feeding_account_id,
        university_id,
        amount,
        bank_reference,
        notes,
        created_by
    ) VALUES (
        v_feeding_account_id,
        v_university_id,
        p_amount,
        p_bank_reference,
        p_description,
        p_allocated_by_user_id
    );

    -- Insert Immutable Ledger Entry
    INSERT INTO public.ledger_entries (
        id,
        feeding_account_id,
        university_id,
        transaction_type,
        amount,
        running_balance,
        reference_id,
        description,
        created_by,
        created_at,
        metadata
    ) VALUES (
        v_ledger_id,
        v_feeding_account_id,
        v_university_id,
        'ALLOCATION',
        p_amount,
        v_new_balance,
        COALESCE(p_bank_reference, 'BURSARY-' || to_char(NOW(), 'YYYYMMDD-HH24MISS')),
        p_description,
        p_allocated_by_user_id,
        NOW(),
        jsonb_build_object(
            'allocated_by', p_allocated_by_user_id,
            'bank_reference', p_bank_reference
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'ledger_id', v_ledger_id,
        'previous_balance', v_current_balance,
        'allocated_amount', p_amount,
        'new_balance', v_new_balance
    );
END;
$$;

-- 4. Hardened update_order_status_rpc Function
CREATE OR REPLACE FUNCTION public.update_order_status_rpc(
    p_order_id UUID,
    p_new_status public.order_status_type,
    p_changed_by UUID,
    p_reason TEXT DEFAULT NULL,
    p_is_manual BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_order RECORD;
    v_feeding_account_id UUID;
    v_current_balance NUMERIC(12, 2);
    v_refund_balance NUMERIC(12, 2);
    v_refund_ledger_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found.';
    END IF;

    -- Authoritative Role Check (Unless service_role or unauthenticated DB maintenance)
    IF auth.jwt() ->> 'role' <> 'service_role' AND auth.uid() IS NOT NULL THEN
        IF public.get_auth_user_role() NOT IN ('SUPER_ADMIN', 'FINANCE_ADMIN', 'CAFETERIA_HEAD', 'CAFETERIA_STAFF') THEN
            RAISE EXCEPTION 'Unauthorized: Only authorized Cafeteria Staff or Administrators can transition order status.';
        END IF;
    END IF;

    IF v_order.status = 'RECEIVED' THEN
        RAISE EXCEPTION 'Cannot change status of an order that has already been received/completed.';
    END IF;

    IF v_order.status = 'CANCELLED' THEN
        RAISE EXCEPTION 'Cannot change status of an order that has already been cancelled.';
    END IF;

    -- Update Order
    UPDATE public.orders
    SET status = p_new_status,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Insert status history
    INSERT INTO public.order_status_history (
        order_id,
        from_status,
        to_status,
        changed_by,
        reason,
        is_manual_override,
        created_at
    ) VALUES (
        p_order_id,
        v_order.status,
        p_new_status,
        p_changed_by,
        p_reason,
        p_is_manual,
        NOW()
    );

    -- If order is CANCELLED, execute automatic refund to student ledger
    IF p_new_status = 'CANCELLED' THEN
        SELECT id INTO v_feeding_account_id
        FROM public.feeding_accounts
        WHERE student_profile_id = v_order.student_profile_id
        FOR UPDATE;

        SELECT running_balance INTO v_current_balance
        FROM public.ledger_entries
        WHERE feeding_account_id = v_feeding_account_id
        ORDER BY created_at DESC, id DESC
        LIMIT 1
        FOR UPDATE;

        IF v_current_balance IS NULL THEN
            v_current_balance := 0.00;
        END IF;

        v_refund_balance := v_current_balance + v_order.total_amount;

        INSERT INTO public.ledger_entries (
            id,
            feeding_account_id,
            university_id,
            transaction_type,
            amount,
            running_balance,
            reference_id,
            description,
            created_by,
            created_at,
            metadata
        ) VALUES (
            v_refund_ledger_id,
            v_feeding_account_id,
            v_order.university_id,
            'REFUND',
            v_order.total_amount,
            v_refund_balance,
            v_order.id::TEXT,
            'Refund for cancelled order ' || v_order.order_number || CASE WHEN p_reason IS NOT NULL THEN ': ' || p_reason ELSE '' END,
            p_changed_by,
            NOW(),
            jsonb_build_object(
                'order_id', v_order.id,
                'order_number', v_order.order_number,
                'cancellation_reason', p_reason
            )
        );
    END IF;

    -- Audit log
    INSERT INTO public.audit_logs (
        university_id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values,
        created_at
    ) VALUES (
        v_order.university_id,
        p_changed_by,
        'UPDATE_ORDER_STATUS',
        'ORDER',
        p_order_id::TEXT,
        jsonb_build_object('status', v_order.status),
        jsonb_build_object(
            'status', p_new_status,
            'reason', p_reason,
            'is_manual', p_is_manual
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'previous_status', v_order.status,
        'new_status', p_new_status,
        'updated_at', NOW()
    );
END;
$$;

-- 5. Revoke Execute from PUBLIC and anon; Grant to service_role and authenticated
REVOKE EXECUTE ON FUNCTION public.get_auth_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_user_role() TO service_role, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_auth_student_profile_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_student_profile_id() TO service_role, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_auth_cafeteria_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_cafeteria_id() TO service_role, authenticated;

REVOKE EXECUTE ON FUNCTION public.place_mealpass_order(UUID, UUID, JSONB, VARCHAR, TEXT, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_mealpass_order(UUID, UUID, JSONB, VARCHAR, TEXT, VARCHAR) TO service_role, authenticated;

REVOKE EXECUTE ON FUNCTION public.allocate_mealpass_funds(UUID, NUMERIC, TEXT, VARCHAR, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.allocate_mealpass_funds(UUID, NUMERIC, TEXT, VARCHAR, UUID) TO service_role, authenticated;

REVOKE EXECUTE ON FUNCTION public.update_order_status_rpc(UUID, public.order_status_type, UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_order_status_rpc(UUID, public.order_status_type, UUID, TEXT, BOOLEAN) TO service_role, authenticated;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
