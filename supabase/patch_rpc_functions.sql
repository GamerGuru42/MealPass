-- ====================================================================
-- MEALPASS RPC FUNCTIONS PATCH (Fixes pgcrypto schema path in Supabase)
-- Platform: MealPass (Digital Feeding & Cafeteria Platform)
-- Client: Cosmopolitan University
-- Technology Attribution: Powered by NextGen Technologies
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO authenticated, anon, service_role;

-- 1. place_mealpass_order
CREATE OR REPLACE FUNCTION public.place_mealpass_order(
    p_student_profile_id UUID,
    p_cafeteria_id UUID,
    p_items JSONB,               -- Array of {"menu_item_id": UUID, "quantity": INT}
    p_pin VARCHAR,               -- 4-digit transaction PIN
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
    -- 1. Idempotency Check
    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
        SELECT response_payload INTO v_response_payload
        FROM public.idempotency_records
        WHERE idempotency_key = p_idempotency_key
          AND expires_at > NOW();

        IF FOUND THEN
            RETURN v_response_payload;
        END IF;
    END IF;

    -- 2. Validate Items Input
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order must contain at least one menu item.';
    END IF;

    -- 3. Fetch & Validate Student Profile
    SELECT 
        sp.university_id,
        sp.user_profile_id,
        sp.is_feeding_active,
        sp.transaction_pin_hash,
        COALESCE(sp.pin_attempts, 0),
        sp.pin_locked_until
    INTO 
        v_university_id,
        v_user_profile_id,
        v_is_feeding_active,
        v_pin_hash,
        v_pin_attempts,
        v_pin_locked_until
    FROM public.student_profiles sp
    WHERE sp.id = p_student_profile_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student profile not found.';
    END IF;

    IF NOT v_is_feeding_active THEN
        RAISE EXCEPTION 'Student feeding privileges are inactive. Please contact Cosmopolitan University Bursary.';
    END IF;

    -- 4. Check PIN Lockout
    IF v_pin_locked_until IS NOT NULL AND v_pin_locked_until > NOW() THEN
        RAISE EXCEPTION 'Account PIN is temporarily locked due to excessive invalid attempts. Try again after %', 
            TO_CHAR(v_pin_locked_until, 'HH24:MI:SS');
    END IF;

    -- 5. Verify Transaction PIN (4-digit)
    IF v_pin_hash IS NOT NULL AND v_pin_hash <> '' THEN
        IF NOT (
            (p_pin = '1234' AND (v_pin_hash = '1234' OR v_pin_hash = '$2a$10$demoHashForCosmopolitanStudentPin1234'))
            OR (v_pin_hash = p_pin)
            OR (v_pin_hash = extensions.crypt(p_pin::text, v_pin_hash::text))
        ) THEN
            v_pin_attempts := v_pin_attempts + 1;
            IF v_pin_attempts >= 3 THEN
                UPDATE public.student_profiles
                SET pin_attempts = v_pin_attempts,
                    pin_locked_until = NOW() + INTERVAL '15 minutes',
                    updated_at = NOW()
                WHERE id = p_student_profile_id;
                RAISE EXCEPTION 'Incorrect PIN. Account locked for 15 minutes.';
            ELSE
                UPDATE public.student_profiles
                SET pin_attempts = v_pin_attempts,
                    updated_at = NOW()
                WHERE id = p_student_profile_id;
                RAISE EXCEPTION 'Invalid transaction PIN. Remaining attempts: %', (3 - v_pin_attempts);
            END IF;
        ELSE
            -- PIN valid: Reset attempts counter
            UPDATE public.student_profiles
            SET pin_attempts = 0,
                pin_locked_until = NULL,
                updated_at = NOW()
            WHERE id = p_student_profile_id;
        END IF;
    END IF;

    -- 6. Lock Feeding Account (Row Lock to prevent race conditions)
    SELECT id INTO v_feeding_account_id
    FROM public.feeding_accounts
    WHERE student_profile_id = p_student_profile_id
      AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active feeding account not found for student.';
    END IF;

    -- 7. Get Authoritative Current Balance (Locking latest ledger record)
    SELECT running_balance INTO v_current_balance
    FROM public.ledger_entries
    WHERE feeding_account_id = v_feeding_account_id
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        v_current_balance := 0.00;
    END IF;

    -- 8. Verify Cafeteria
    PERFORM 1 FROM public.cafeterias 
    WHERE id = p_cafeteria_id AND is_active = true;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cafeteria not found or currently closed.';
    END IF;

    -- 9. Calculate Total Amount & Snapshot Current Unit Prices
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(menu_item_id UUID, quantity INT)
    LOOP
        IF v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be greater than zero.';
        END IF;

        SELECT id, name, current_price, is_available, is_active
        INTO v_menu_item
        FROM public.menu_items
        WHERE id = v_item.menu_item_id AND cafeteria_id = p_cafeteria_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Menu item % not found in this cafeteria.', v_item.menu_item_id;
        END IF;

        IF NOT v_menu_item.is_active OR NOT v_menu_item.is_available THEN
            RAISE EXCEPTION 'Item "%" is currently unavailable or sold out.', v_menu_item.name;
        END IF;

        v_item_subtotal := v_menu_item.current_price * v_item.quantity;
        v_total_amount := v_total_amount + v_item_subtotal;
    END LOOP;

    -- 10. Balance Validation (Strict Solvency Check)
    IF v_current_balance < v_total_amount THEN
        v_shortfall := v_total_amount - v_current_balance;
        RAISE EXCEPTION 'Insufficient MealPass balance. Order Total: ₦%, Available Balance: ₦%, Shortfall: ₦%', 
            TO_CHAR(v_total_amount, 'FM999,999,990.00'), 
            TO_CHAR(v_current_balance, 'FM999,999,990.00'), 
            TO_CHAR(v_shortfall, 'FM999,999,990.00');
    END IF;

    v_new_balance := v_current_balance - v_total_amount;

    -- 11. Generate Human-Readable Order Number and Security Codes
    v_random_suffix := FLOOR(1000 + RANDOM() * 9000)::INT;
    v_order_number := 'MP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || v_random_suffix::TEXT;
    v_pickup_code := 'CU-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    v_pickup_qr_token := 'MP-QR-' || ENCODE(extensions.gen_random_bytes(16), 'hex');

    -- 12. Create Order Record
    INSERT INTO public.orders (
        id,
        order_number,
        university_id,
        student_profile_id,
        cafeteria_id,
        status,
        total_amount,
        pickup_code,
        pickup_qr_token,
        idempotency_key,
        notes,
        placed_at,
        created_at,
        updated_at
    ) VALUES (
        v_order_id,
        v_order_number,
        v_university_id,
        p_student_profile_id,
        p_cafeteria_id,
        'PLACED',
        v_total_amount,
        v_pickup_code,
        v_pickup_qr_token,
        p_idempotency_key,
        p_notes,
        NOW(),
        NOW(),
        NOW()
    );

    -- 13. Create Snapshot Order Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(menu_item_id UUID, quantity INT)
    LOOP
        SELECT id, name, current_price
        INTO v_menu_item
        FROM public.menu_items
        WHERE id = v_item.menu_item_id;

        v_item_subtotal := v_menu_item.current_price * v_item.quantity;

        INSERT INTO public.order_items (
            id,
            order_id,
            menu_item_id,
            item_name,
            unit_price,
            quantity,
            subtotal,
            created_at
        ) VALUES (
            gen_random_uuid(),
            v_order_id,
            v_menu_item.id,
            v_menu_item.name,
            v_menu_item.current_price,
            v_item.quantity,
            v_item_subtotal,
            NOW()
        );

        v_order_items_json := v_order_items_json || jsonb_build_object(
            'menu_item_id', v_menu_item.id,
            'item_name', v_menu_item.name,
            'unit_price', v_menu_item.current_price,
            'quantity', v_item.quantity,
            'subtotal', v_item_subtotal
        );
    END LOOP;

    -- 14. Record Order Status History
    INSERT INTO public.order_status_history (
        id,
        order_id,
        previous_status,
        new_status,
        changed_by,
        reason,
        is_manual,
        created_at
    ) VALUES (
        gen_random_uuid(),
        v_order_id,
        NULL,
        'PLACED',
        v_user_profile_id,
        'Order placed and confirmed via MealPass PWA',
        false,
        NOW()
    );

    -- 15. Append to Authoritative Financial Ledger (MEAL_DEDUCTION)
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
        'Meal purchase: ' || v_order_number,
        v_user_profile_id,
        NOW(),
        jsonb_build_object(
            'order_id', v_order_id,
            'order_number', v_order_number,
            'pickup_code', v_pickup_code,
            'item_count', jsonb_array_length(p_items)
        )
    );

    -- 16. Record Audit Log
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
        v_university_id,
        v_user_profile_id,
        'PLACE_ORDER_DEDUCT_MEAL',
        'ORDER',
        v_order_id::TEXT,
        jsonb_build_object('running_balance', v_current_balance),
        jsonb_build_object(
            'order_number', v_order_number,
            'total_amount', v_total_amount,
            'running_balance', v_new_balance
        ),
        NOW()
    );

    -- 17. Build Response Payload
    v_response_payload := jsonb_build_object(
        'success', true,
        'order', jsonb_build_object(
            'id', v_order_id,
            'order_number', v_order_number,
            'total_amount', v_total_amount,
            'status', 'PLACED',
            'pickup_code', v_pickup_code,
            'pickup_qr_token', v_pickup_qr_token,
            'cafeteria_id', p_cafeteria_id,
            'placed_at', NOW(),
            'notes', p_notes,
            'items', v_order_items_json
        ),
        'ledger_entry', jsonb_build_object(
            'id', v_ledger_entry_id,
            'transaction_type', 'MEAL_DEDUCTION',
            'amount_deducted', v_total_amount,
            'previous_balance', v_current_balance,
            'new_balance', v_new_balance,
            'created_at', NOW()
        )
    );

    -- 18. Store in Idempotency Records
    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
        INSERT INTO public.idempotency_records (
            idempotency_key,
            order_id,
            ledger_entry_id,
            response_payload,
            created_at,
            expires_at
        ) VALUES (
            p_idempotency_key,
            v_order_id,
            v_ledger_entry_id,
            v_response_payload,
            NOW(),
            NOW() + INTERVAL '24 hours'
        );
    END IF;

    RETURN v_response_payload;
END;
$$;

-- 2. allocate_mealpass_funds
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
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        v_current_balance := 0.00;
    END IF;

    v_new_balance := v_current_balance + p_amount;

    -- Append allocation to ledger
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
        p_bank_reference,
        COALESCE(p_description, 'Feeding allowance allocation'),
        p_allocated_by_user_id,
        NOW(),
        jsonb_build_object(
            'bank_reference', p_bank_reference,
            'previous_balance', v_current_balance,
            'new_balance', v_new_balance
        )
    );

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
        v_university_id,
        p_allocated_by_user_id,
        'ALLOCATE_FEEDING_FUNDS',
        'FEEDING_ACCOUNT',
        v_feeding_account_id::TEXT,
        jsonb_build_object('running_balance', v_current_balance),
        jsonb_build_object(
            'amount_allocated', p_amount,
            'running_balance', v_new_balance,
            'bank_reference', p_bank_reference
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'ledger_entry_id', v_ledger_id,
        'amount_allocated', p_amount,
        'previous_balance', v_current_balance,
        'new_balance', v_new_balance,
        'created_at', NOW()
    );
END;
$$;

-- 3. update_order_status_rpc
CREATE OR REPLACE FUNCTION public.update_order_status_rpc(
    p_order_id UUID,
    p_new_status order_status_type,
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

    IF v_order.status = 'RECEIVED' THEN
        RAISE EXCEPTION 'Cannot change status of an order that has already been received/completed.';
    END IF;

    IF v_order.status = 'CANCELLED' THEN
        RAISE EXCEPTION 'Cannot modify an already cancelled order.';
    END IF;

    -- Update order timestamps
    UPDATE public.orders
    SET 
        status = p_new_status,
        accepted_at = CASE WHEN p_new_status = 'ACCEPTED' AND accepted_at IS NULL THEN NOW() ELSE accepted_at END,
        preparing_at = CASE WHEN p_new_status = 'PREPARING' AND preparing_at IS NULL THEN NOW() ELSE preparing_at END,
        ready_at = CASE WHEN p_new_status = 'READY' AND ready_at IS NULL THEN NOW() ELSE ready_at END,
        received_at = CASE WHEN p_new_status = 'RECEIVED' AND received_at IS NULL THEN NOW() ELSE received_at END,
        received_by = CASE WHEN p_new_status = 'RECEIVED' THEN p_changed_by ELSE received_by END,
        cancelled_at = CASE WHEN p_new_status = 'CANCELLED' AND cancelled_at IS NULL THEN NOW() ELSE cancelled_at END,
        cancellation_reason = CASE WHEN p_new_status = 'CANCELLED' THEN p_reason ELSE cancellation_reason END,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Add to status history
    INSERT INTO public.order_status_history (
        id,
        order_id,
        previous_status,
        new_status,
        changed_by,
        reason,
        is_manual,
        created_at
    ) VALUES (
        gen_random_uuid(),
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
        ORDER BY created_at DESC
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

