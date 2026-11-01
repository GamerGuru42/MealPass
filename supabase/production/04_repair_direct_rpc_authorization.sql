-- ====================================================================
-- MEALPASS — DIRECT RPC AUTHORIZATION REPAIR (PRODUCTION-SCHEMA-ALIGNED)
-- Target Project: ipdqfejoctltasrzbdaj (North EU / eu-north-1)
-- Production Schema: 01_mealpass_production_schema.sql
-- Scope:
--   1. Fix all column-name mismatches between function bodies and live schema.
--   2. Fix NULL-role authorization bypass in allocate_mealpass_funds and update_order_status_rpc.
--   3. Add cafeteria scope enforcement in update_order_status_rpc.
--   4. Enforce authoritative identity attribution (prevent p_changed_by / p_allocated_by spoofing).
--   5. Fix get_auth_cafeteria_id: remove non-existent cs.is_active, enforce up.is_active, c.is_active, up.role.
--   6. Enforce strict single active feeding period in allocate_mealpass_funds (fail closed if 0 or >1).
-- Preserved:
--   - All function signatures, argument names, default values, return types.
--   - SECURITY DEFINER and SET search_path.
--   - Existing EXECUTE grants (no re-grant needed — CREATE OR REPLACE preserves them).
--   - All financial invariants, ledger locking, balance calculations.
--   - All order-state transition rules and refund logic.
--   - Idempotency key lookup and caching.
--   - PIN verification and lockout logic.
-- Safety:
--   - No DROP FUNCTION. No CASCADE. No signature changes.
--   - No table DDL. No data modification.
--   - Idempotent: safe to execute repeatedly.
-- ====================================================================

BEGIN;

-- ====================================================================
-- 1. HELPER: get_auth_cafeteria_id()
-- FIX:
--   - Removes reference to non-existent cafeteria_staff.is_active column.
--   - Validates user_profiles.is_active = true (operator account not suspended).
--   - Validates cafeterias.is_active = true (assigned cafeteria is active).
--   - Validates user_profiles.role IN ('CAFETERIA_STAFF', 'CAFETERIA_HEAD') (role not revoked).
--   - If assignment row deleted from cafeteria_staff, returns NULL.
-- ====================================================================
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
    JOIN public.cafeterias c ON c.id = cs.cafeteria_id
    WHERE up.auth_user_id = auth.uid()
      AND up.is_active = true
      AND c.is_active = true
      AND up.role IN ('CAFETERIA_STAFF', 'CAFETERIA_HEAD')
    LIMIT 1;
    RETURN v_id;
END;
$$;

-- ====================================================================
-- 2. HELPER: get_auth_user_role()
-- No changes needed. Included for completeness and to ensure consistency.
-- ====================================================================
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS public.user_role_type
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_role public.user_role_type;
BEGIN
    SELECT role INTO v_role
    FROM public.user_profiles
    WHERE auth_user_id = auth.uid();
    RETURN v_role;
END;
$$;

-- ====================================================================
-- 3. HELPER: get_auth_student_profile_id()
-- No changes needed. Included for completeness.
-- ====================================================================
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

-- ====================================================================
-- 4. place_mealpass_order()
-- FIXES:
--   - sp.pin_hash -> sp.transaction_pin_hash (production column name)
--   - sp.pin_failed_attempts -> sp.pin_attempts (production column name)
--   - UPDATE pin_failed_attempts -> pin_attempts
--   - order_items: item_name_snapshot -> item_name, unit_price_snapshot -> unit_price
--   - order_status_history: from_status -> previous_status, to_status -> new_status, is_manual_override -> is_manual
--   - idempotency_records: removed request_hash (column does not exist on production)
--   - audit_logs: user_id -> user_profile_id, entity_name -> entity_name, old_values -> old_data, new_values -> new_data
--   - orders INSERT: removed special_instructions, uses notes directly
-- PRESERVED:
--   - Defense-in-depth auth check (already NULL-safe)
--   - All financial calculations, balance locks, PIN logic
--   - Function signature and return type
-- ====================================================================
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
    IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
        IF auth.uid() IS NULL OR public.get_auth_student_profile_id() IS NULL OR public.get_auth_student_profile_id() <> p_student_profile_id THEN
            RAISE EXCEPTION 'Unauthorized: Cannot place order for another student account.';
        END IF;
    END IF;

    -- Validate Items
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order must contain at least one menu item.';
    END IF;

    -- Lock student profile and verify status
    -- FIXED: transaction_pin_hash (not pin_hash), pin_attempts (not pin_failed_attempts)
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
    IF v_pin_hash IS NOT NULL AND v_pin_hash <> '' THEN
        IF NOT (
            (p_pin = '1234' AND (v_pin_hash = '1234' OR v_pin_hash = '$2a$10$demoHashForCosmopolitanStudentPin1234'))
            OR (v_pin_hash = p_pin)
            OR (v_pin_hash = extensions.crypt(p_pin::text, v_pin_hash::text))
        ) THEN
            v_pin_attempts := v_pin_attempts + 1;
            IF v_pin_attempts >= 3 THEN
                -- FIXED: pin_attempts (not pin_failed_attempts)
                UPDATE public.student_profiles
                SET pin_attempts = v_pin_attempts,
                    pin_locked_until = NOW() + INTERVAL '15 minutes',
                    updated_at = NOW()
                WHERE id = p_student_profile_id;
                RAISE EXCEPTION 'Invalid transaction PIN. Maximum attempts exceeded. Account locked for 15 minutes.';
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

    -- Verify Cafeteria
    PERFORM 1 FROM public.cafeterias WHERE id = p_cafeteria_id AND is_active = true;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Selected cafeteria is not active or does not exist.';
    END IF;

    -- Lock feeding account
    SELECT id INTO v_feeding_account_id
    FROM public.feeding_accounts
    WHERE student_profile_id = p_student_profile_id
      AND is_active = true
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
    -- FIXED: Production orders table columns (no idempotency_key, no special_instructions column)
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
        notes,
        placed_at,
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
        NOW(),
        NOW()
    );

    -- Insert Order Items
    -- FIXED: item_name (not item_name_snapshot), unit_price (not unit_price_snapshot)
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_order_items_json) AS x(menu_item_id UUID, name TEXT, unit_price NUMERIC, quantity INT, subtotal NUMERIC)
    LOOP
        INSERT INTO public.order_items (
            order_id,
            menu_item_id,
            item_name,
            unit_price,
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
    -- FIXED: previous_status (not from_status), new_status (not to_status), is_manual (not is_manual_override)
    INSERT INTO public.order_status_history (
        order_id,
        previous_status,
        new_status,
        changed_by,
        reason,
        is_manual,
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
    -- FIXED: removed request_hash column (does not exist on production idempotency_records table)
    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
        INSERT INTO public.idempotency_records (
            idempotency_key,
            response_payload,
            expires_at
        ) VALUES (
            p_idempotency_key,
            v_response_payload,
            NOW() + INTERVAL '24 hours'
        )
        ON CONFLICT (idempotency_key) DO UPDATE
        SET response_payload = EXCLUDED.response_payload;
    END IF;

    RETURN v_response_payload;
END;
$$;

-- ====================================================================
-- 5. allocate_mealpass_funds()
-- FIXES:
--   - NULL-safe role check: COALESCE(get_auth_user_role()::text, '') to prevent NULL bypass
--   - Identity attribution: derive v_effective_allocated_by from auth.uid() for authenticated callers
--   - Strict feeding period enforcement: fails closed if 0 or >1 active feeding periods exist
--   - Acquired FOR SHARE lock on feeding period to prevent concurrent state changes
--   - bursary_allocations INSERT: uses allocated_by (not created_by), satisfies all constraints
--   - audit_logs INSERT: user_profile_id, entity_name, old_data, new_data
-- PRESERVED:
--   - Function signature and return type
--   - Amount validation, feeding-account lock, balance calculation, ledger insert
-- ====================================================================
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
    v_feeding_period_id UUID;
    v_active_period_count INT;
    v_current_balance NUMERIC(12, 2) := 0.00;
    v_new_balance NUMERIC(12, 2);
    v_ledger_id UUID := gen_random_uuid();
    v_effective_allocated_by UUID := p_allocated_by_user_id;
    v_caller_user_profile_id UUID;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Allocation amount must be strictly greater than zero.';
    END IF;

    -- Authoritative Role Check (Unless service_role)
    IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: Authentication required.';
        END IF;

        -- FIXED: NULL-safe role check. COALESCE prevents NULL NOT IN (...) -> NULL -> bypass.
        IF COALESCE(public.get_auth_user_role()::text, '') NOT IN ('SUPER_ADMIN', 'FINANCE_ADMIN') THEN
            RAISE EXCEPTION 'Unauthorized: Only Finance Administrator or Super Admin can allocate meal funds.';
        END IF;

        -- FIXED: Prevent identity spoofing. Resolve authoritative user profile ID from auth.uid().
        SELECT id INTO v_caller_user_profile_id
        FROM public.user_profiles
        WHERE auth_user_id = auth.uid();

        IF v_caller_user_profile_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: No user profile found for authenticated identity.';
        END IF;

        -- Override caller-supplied p_allocated_by_user_id with authoritative identity
        v_effective_allocated_by := v_caller_user_profile_id;
    END IF;

    -- Lock feeding account
    SELECT id, university_id INTO v_feeding_account_id, v_university_id
    FROM public.feeding_accounts
    WHERE student_profile_id = p_student_profile_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Feeding account not found for student.';
    END IF;

    -- Strict Feeding Period Validation (Fails closed if 0 or >1 active feeding periods)
    SELECT COUNT(*), MAX(id) INTO v_active_period_count, v_feeding_period_id
    FROM public.feeding_periods
    WHERE university_id = v_university_id AND is_active = true;

    IF v_active_period_count = 0 THEN
        RAISE EXCEPTION 'Allocation rejected: No active feeding period found for this university.';
    END IF;

    IF v_active_period_count > 1 THEN
        RAISE EXCEPTION 'Allocation rejected: Multiple active feeding periods found (ambiguous academic session). Exactly one active feeding period required.';
    END IF;

    -- Shared lock on feeding period to prevent concurrent deactivation during transaction
    PERFORM 1 FROM public.feeding_periods WHERE id = v_feeding_period_id FOR SHARE;

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
        feeding_period_id,
        feeding_account_id,
        university_id,
        amount,
        allocated_by,
        notes,
        created_at
    ) VALUES (
        v_feeding_period_id,
        v_feeding_account_id,
        v_university_id,
        p_amount,
        v_effective_allocated_by,
        p_description,
        NOW()
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
        COALESCE(p_description, 'Feeding allowance allocation'),
        v_effective_allocated_by,
        NOW(),
        jsonb_build_object(
            'allocated_by', v_effective_allocated_by,
            'bank_reference', p_bank_reference,
            'previous_balance', v_current_balance,
            'new_balance', v_new_balance
        )
    );

    -- Audit log
    -- FIXED: user_profile_id (not user_id), entity_name (not entity_type), old_data (not old_values), new_data (not new_values)
    INSERT INTO public.audit_logs (
        university_id,
        user_profile_id,
        action,
        entity_name,
        entity_id,
        old_data,
        new_data,
        created_at
    ) VALUES (
        v_university_id,
        v_effective_allocated_by,
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
        'ledger_id', v_ledger_id,
        'previous_balance', v_current_balance,
        'allocated_amount', p_amount,
        'new_balance', v_new_balance
    );
END;
$$;

-- ====================================================================
-- 6. update_order_status_rpc()
-- FIXES:
--   - NULL-safe role check: COALESCE prevents NULL bypass
--   - Cafeteria scope enforcement: CAFETERIA_STAFF and CAFETERIA_HEAD restricted to their assigned cafeteria
--   - Identity attribution: derive v_effective_changed_by from auth.uid() for authenticated callers
--   - order_status_history: previous_status (not from_status), new_status (not to_status), is_manual (not is_manual_override)
--   - audit_logs: user_profile_id, entity_name, old_data, new_data
--   - Orders UPDATE: preserves original timestamp-setting logic from migration 20261030000002
-- PRESERVED:
--   - Function signature and return type
--   - Order state transition rules (RECEIVED and CANCELLED are terminal)
--   - Cancellation refund calculation and ledger locking
--   - All existing status-specific timestamp updates
-- ====================================================================
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
    v_caller_role public.user_role_type;
    v_caller_user_profile_id UUID;
    v_caller_cafeteria_id UUID;
    v_effective_changed_by UUID := p_changed_by;
BEGIN
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found.';
    END IF;

    -- Authoritative Role, Campus Scope, and Identity Check for Direct RPC Callers
    IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: Authentication required.';
        END IF;

        -- Resolve caller's authoritative user profile
        SELECT id INTO v_caller_user_profile_id
        FROM public.user_profiles
        WHERE auth_user_id = auth.uid();

        IF v_caller_user_profile_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: No user profile found for authenticated identity.';
        END IF;

        -- FIXED: Prevent identity spoofing — use authoritative identity for all audit trails
        v_effective_changed_by := v_caller_user_profile_id;

        -- FIXED: NULL-safe role check. COALESCE prevents NULL NOT IN (...) -> NULL -> bypass.
        v_caller_role := public.get_auth_user_role();
        IF COALESCE(v_caller_role::text, '') NOT IN ('SUPER_ADMIN', 'FINANCE_ADMIN', 'CAFETERIA_HEAD', 'CAFETERIA_STAFF') THEN
            RAISE EXCEPTION 'Unauthorized: Only authorized Cafeteria Staff or Administrators can transition order status.';
        END IF;

        -- FIXED: Enforce Cafeteria Scope for campus-bound operators
        IF v_caller_role IN ('CAFETERIA_HEAD', 'CAFETERIA_STAFF') THEN
            v_caller_cafeteria_id := public.get_auth_cafeteria_id();
            IF v_caller_cafeteria_id IS NULL THEN
                RAISE EXCEPTION 'Unauthorized: No active cafeteria assignment found for this operator account.';
            END IF;
            IF v_caller_cafeteria_id <> v_order.cafeteria_id THEN
                RAISE EXCEPTION 'Unauthorized: Operational authority restricted to assigned cafeteria campus.';
            END IF;
        END IF;
    END IF;

    IF v_order.status = 'RECEIVED' THEN
        RAISE EXCEPTION 'Cannot change status of an order that has already been received/completed.';
    END IF;

    IF v_order.status = 'CANCELLED' THEN
        RAISE EXCEPTION 'Cannot change status of an order that has already been cancelled.';
    END IF;

    -- Update order with status-specific timestamps (restored from original migration 20261030000002)
    UPDATE public.orders
    SET
        status = p_new_status,
        accepted_at = CASE WHEN p_new_status = 'ACCEPTED' AND accepted_at IS NULL THEN NOW() ELSE accepted_at END,
        preparing_at = CASE WHEN p_new_status = 'PREPARING' AND preparing_at IS NULL THEN NOW() ELSE preparing_at END,
        ready_at = CASE WHEN p_new_status = 'READY' AND ready_at IS NULL THEN NOW() ELSE ready_at END,
        received_at = CASE WHEN p_new_status = 'RECEIVED' AND received_at IS NULL THEN NOW() ELSE received_at END,
        received_by = CASE WHEN p_new_status = 'RECEIVED' THEN v_effective_changed_by ELSE received_by END,
        cancelled_at = CASE WHEN p_new_status = 'CANCELLED' AND cancelled_at IS NULL THEN NOW() ELSE cancelled_at END,
        cancellation_reason = CASE WHEN p_new_status = 'CANCELLED' THEN p_reason ELSE cancellation_reason END,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Insert status history
    -- FIXED: previous_status (not from_status), new_status (not to_status), is_manual (not is_manual_override)
    INSERT INTO public.order_status_history (
        order_id,
        previous_status,
        new_status,
        changed_by,
        reason,
        is_manual,
        created_at
    ) VALUES (
        p_order_id,
        v_order.status,
        p_new_status,
        v_effective_changed_by,
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
            v_effective_changed_by,
            NOW(),
            jsonb_build_object(
                'order_id', v_order.id,
                'order_number', v_order.order_number,
                'cancellation_reason', p_reason
            )
        );
    END IF;

    -- Audit log
    -- FIXED: user_profile_id (not user_id), entity_name (not entity_type), old_data (not old_values), new_data (not new_values)
    INSERT INTO public.audit_logs (
        university_id,
        user_profile_id,
        action,
        entity_name,
        entity_id,
        old_data,
        new_data,
        created_at
    ) VALUES (
        v_order.university_id,
        v_effective_changed_by,
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

-- No REVOKE/GRANT needed: CREATE OR REPLACE preserves existing function ACLs.
-- Existing grants (authenticated, service_role) and revocations (PUBLIC, anon) remain intact.

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
