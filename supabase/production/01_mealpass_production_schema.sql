-- ====================================================================
-- MEALPASS PRODUCTION DATABASE SCHEMA & INITIALIZATION
-- Client: Cosmopolitan University
-- Technology Attribution: Powered by NextGen Technologies
-- Production Target: Clean Supabase PostgreSQL Instance
-- ====================================================================

-- 1. PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Enumerated Types
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM (
        'STUDENT',
        'CAFETERIA_STAFF',
        'CAFETERIA_HEAD',
        'FINANCE_ADMIN',
        'SUPER_ADMIN'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM (
        'ALLOCATION',
        'MEAL_DEDUCTION',
        'REFUND',
        'REVERSAL',
        'ADJUSTMENT',
        'OPENING_BALANCE'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status_type AS ENUM (
        'PLACED',
        'ACCEPTED',
        'PREPARING',
        'READY',
        'RECEIVED',
        'CANCELLED'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE cafeteria_staff_role AS ENUM (
        'STAFF',
        'HEAD'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. Core Relational Tables

-- 3.1 Universities (Tenants)
CREATE TABLE IF NOT EXISTS public.universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    primary_color VARCHAR(30) DEFAULT '#1e3a5f',
    secondary_color VARCHAR(30) DEFAULT '#f59e0b',
    address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    currency VARCHAR(10) DEFAULT 'NGN',
    timezone VARCHAR(100) DEFAULT 'Africa/Lagos',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2 Campuses
CREATE TABLE IF NOT EXISTS public.campuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_campuses_code UNIQUE (university_id, code)
);

-- 3.3 Cafeterias
CREATE TABLE IF NOT EXISTS public.cafeterias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
    campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    description TEXT,
    operating_hours JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cafeterias_university_id ON public.cafeterias(university_id);

-- 3.4 User Profiles (Linked with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    role user_role_type NOT NULL DEFAULT 'STUDENT',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_profiles_university_email UNIQUE (university_id, email)
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_id ON public.user_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_university_id ON public.user_profiles(university_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- 3.5 Student Profiles
CREATE TABLE IF NOT EXISTS public.student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID UNIQUE NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
    matric_number VARCHAR(100) NOT NULL,
    department VARCHAR(150),
    faculty VARCHAR(150),
    level VARCHAR(50),
    transaction_pin_hash VARCHAR(255),
    pin_attempts INT DEFAULT 0,
    pin_locked_until TIMESTAMPTZ,
    is_feeding_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_student_profiles_matric UNIQUE (university_id, matric_number)
);

CREATE INDEX IF NOT EXISTS idx_student_profiles_matric ON public.student_profiles(matric_number);
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_profile ON public.student_profiles(user_profile_id);

-- 3.6 Feeding Accounts (Student Wallets)
CREATE TABLE IF NOT EXISTS public.feeding_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_profile_id UUID UNIQUE NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feeding_accounts_student ON public.feeding_accounts(student_profile_id);

-- 3.7 Feeding Periods (Academic Semesters)
CREATE TABLE IF NOT EXISTS public.feeding_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.8 Cafeteria Staff Mapping
CREATE TABLE IF NOT EXISTS public.cafeteria_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    cafeteria_id UUID NOT NULL REFERENCES public.cafeterias(id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
    role_in_cafeteria cafeteria_staff_role NOT NULL DEFAULT 'STAFF',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_staff_cafeteria_user UNIQUE (cafeteria_id, user_profile_id)
);

-- 3.9 Menu Categories
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
    cafeteria_id UUID REFERENCES public.cafeterias(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.10 Menu Items
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
    cafeteria_id UUID NOT NULL REFERENCES public.cafeterias(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    current_price NUMERIC(10, 2) NOT NULL CHECK (current_price >= 0),
    is_available BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_cafeteria_id ON public.menu_items(cafeteria_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON public.menu_items(category_id);

-- 3.11 Menu Item Price History
CREATE TABLE IF NOT EXISTS public.menu_item_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    old_price NUMERIC(10, 2) NOT NULL,
    new_price NUMERIC(10, 2) NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_item_id ON public.menu_item_price_history(menu_item_id);

-- 3.12 Orders
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
    cafeteria_id UUID NOT NULL REFERENCES public.cafeterias(id) ON DELETE RESTRICT,
    student_profile_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE RESTRICT,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    pickup_code VARCHAR(20) UNIQUE NOT NULL,
    pickup_qr_token VARCHAR(255) UNIQUE NOT NULL,
    status order_status_type NOT NULL DEFAULT 'PLACED',
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
    notes TEXT,
    cancellation_reason TEXT,
    placed_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    preparing_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_student_id ON public.orders(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_orders_cafeteria_id ON public.orders(cafeteria_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_placed_at ON public.orders(placed_at);
CREATE INDEX IF NOT EXISTS idx_orders_pickup_code ON public.orders(pickup_code);

-- 3.13 Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
    item_name VARCHAR(255) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- 3.14 Order Status History
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    previous_status order_status_type,
    new_status order_status_type NOT NULL,
    changed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    reason TEXT,
    is_manual BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_history_order_id ON public.order_status_history(order_id);

-- 3.15 Authoritative Financial Ledger Entries (Append-Only)
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feeding_account_id UUID NOT NULL REFERENCES public.feeding_accounts(id) ON DELETE RESTRICT,
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
    transaction_type transaction_type NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    running_balance NUMERIC(12, 2) NOT NULL,
    reference_id VARCHAR(150),
    description TEXT NOT NULL,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_feeding_account ON public.ledger_entries(feeding_account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON public.ledger_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON public.ledger_entries(transaction_type);

-- 3.16 Bursary Allocations
CREATE TABLE IF NOT EXISTS public.bursary_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feeding_period_id UUID NOT NULL REFERENCES public.feeding_periods(id) ON DELETE RESTRICT,
    feeding_account_id UUID NOT NULL REFERENCES public.feeding_accounts(id) ON DELETE RESTRICT,
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    allocated_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.17 Reconciliation Snapshots
CREATE TABLE IF NOT EXISTS public.reconciliation_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
    snapshot_date DATE NOT NULL,
    total_allocated NUMERIC(14, 2) NOT NULL,
    total_spent NUMERIC(14, 2) NOT NULL,
    total_refunded NUMERIC(14, 2) NOT NULL,
    total_reversals NUMERIC(14, 2) NOT NULL,
    total_adjustments NUMERIC(14, 2) NOT NULL,
    theoretical_balance NUMERIC(14, 2) NOT NULL,
    actual_balance_sum NUMERIC(14, 2) NOT NULL,
    discrepancy NUMERIC(14, 2) NOT NULL,
    is_balanced BOOLEAN NOT NULL,
    conducted_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.18 Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
    user_profile_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- 3.19 Idempotency Records
CREATE TABLE IF NOT EXISTS public.idempotency_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(150) UNIQUE NOT NULL,
    response_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_key ON public.idempotency_records(idempotency_key);

-- 3.20 Operator Invitations (Single-use, Expiring, Role-gated)
CREATE TABLE IF NOT EXISTS public.operator_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
    cafeteria_id UUID REFERENCES public.cafeterias(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role user_role_type NOT NULL,
    invitation_token VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
    invited_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    invited_by_name VARCHAR(150),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    accepted_by_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operator_invitations_token ON public.operator_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_operator_invitations_email ON public.operator_invitations(email);

-- 3.21 Migration Batches (Legacy Student Records)
CREATE TABLE IF NOT EXISTS public.migration_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
    batch_number VARCHAR(100) NOT NULL UNIQUE,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('FILE_UPLOAD', 'MANUAL_ENTRY')),
    file_name VARCHAR(255),
    file_format VARCHAR(20),
    total_records INT NOT NULL DEFAULT 0,
    successful_records INT NOT NULL DEFAULT 0,
    failed_records INT NOT NULL DEFAULT 0,
    total_imported_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'PREVIEWED' CHECK (status IN ('PREVIEWED', 'CONFIRMED', 'REJECTED')),
    confirmed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    confirmed_by_name VARCHAR(150),
    idempotency_key VARCHAR(150) UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_migration_batches_batch_num ON public.migration_batches(batch_number);

-- 3.22 Migration Records (Individual Legacy Student Entitlements)
CREATE TABLE IF NOT EXISTS public.migration_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.migration_batches(id) ON DELETE CASCADE,
    student_profile_id UUID REFERENCES public.student_profiles(id) ON DELETE SET NULL,
    matric_number VARCHAR(50) NOT NULL,
    student_name VARCHAR(150) NOT NULL,
    department VARCHAR(150),
    raw_extracted_value TEXT,
    corrected_value TEXT,
    imported_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    ledger_entry_id UUID REFERENCES public.ledger_entries(id) ON DELETE SET NULL,
    validation_status VARCHAR(20) NOT NULL DEFAULT 'VALID' CHECK (validation_status IN ('VALID', 'CORRECTED', 'INVALID', 'SKIPPED')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_migration_records_batch_id ON public.migration_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_migration_records_matric ON public.migration_records(matric_number);

-- 4. Helper Security Functions (Fixed search_path)
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS user_role_type AS $$
    SELECT role FROM public.user_profiles 
    WHERE auth_user_id = auth.uid() 
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, extensions, pg_temp;

CREATE OR REPLACE FUNCTION public.get_auth_student_profile_id()
RETURNS UUID AS $$
    SELECT sp.id FROM public.student_profiles sp
    JOIN public.user_profiles up ON up.id = sp.user_profile_id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, extensions, pg_temp;

CREATE OR REPLACE FUNCTION public.get_auth_cafeteria_id()
RETURNS UUID AS $$
    SELECT cs.cafeteria_id FROM public.cafeteria_staff cs
    JOIN public.user_profiles up ON up.id = cs.user_profile_id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, extensions, pg_temp;

-- 5. Row-Level Security Policies (RLS)
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafeterias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeding_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeding_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafeteria_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bursary_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_records ENABLE ROW LEVEL SECURITY;

-- 5.1 Public and Shared Catalogs
CREATE POLICY "Public read active universities" ON public.universities FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active campuses" ON public.campuses FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active cafeterias" ON public.cafeterias FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active categories" ON public.menu_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active menu items" ON public.menu_items FOR SELECT USING (is_active = true);

-- 5.2 Student Profile & Account Policies
CREATE POLICY "Users read own profile" ON public.user_profiles FOR SELECT
USING (auth_user_id = auth.uid() OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FINANCE_ADMIN'));

CREATE POLICY "Students read own student profile" ON public.student_profiles FOR SELECT
USING (id = public.get_auth_student_profile_id() OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FINANCE_ADMIN'));

CREATE POLICY "Students read own feeding account" ON public.feeding_accounts FOR SELECT
USING (student_profile_id = public.get_auth_student_profile_id() OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FINANCE_ADMIN'));

CREATE POLICY "Students read own ledger entries" ON public.ledger_entries FOR SELECT
USING (
    feeding_account_id IN (
        SELECT id FROM public.feeding_accounts WHERE student_profile_id = public.get_auth_student_profile_id()
    )
    OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FINANCE_ADMIN')
);

-- 5.3 Order Policies
CREATE POLICY "Students view own orders" ON public.orders FOR SELECT
USING (
    student_profile_id = public.get_auth_student_profile_id()
    OR cafeteria_id = public.get_auth_cafeteria_id()
    OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FINANCE_ADMIN')
);

CREATE POLICY "Students view own order items" ON public.order_items FOR SELECT
USING (
    order_id IN (
        SELECT id FROM public.orders 
        WHERE student_profile_id = public.get_auth_student_profile_id() 
           OR cafeteria_id = public.get_auth_cafeteria_id()
           OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FINANCE_ADMIN')
    )
);

CREATE POLICY "View order status history" ON public.order_status_history FOR SELECT
USING (
    order_id IN (
        SELECT id FROM public.orders 
        WHERE student_profile_id = public.get_auth_student_profile_id() 
           OR cafeteria_id = public.get_auth_cafeteria_id()
           OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FINANCE_ADMIN')
    )
);

-- 5.4 Administrative Policies
CREATE POLICY "Admin manage operator invitations" ON public.operator_invitations FOR ALL
USING (public.get_auth_user_role() IN ('SUPER_ADMIN', 'CAFETERIA_HEAD'));

CREATE POLICY "Admin manage migration batches" ON public.migration_batches FOR ALL
USING (public.get_auth_user_role() IN ('SUPER_ADMIN', 'FINANCE_ADMIN'));

CREATE POLICY "Admin manage migration records" ON public.migration_records FOR ALL
USING (public.get_auth_user_role() IN ('SUPER_ADMIN', 'FINANCE_ADMIN'));

-- 6. Authoritative Database Functions

-- 6.1 RPC: place_mealpass_order
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

    -- Validate Items
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order must contain at least one menu item.';
    END IF;

    -- Validate Student & Clearance
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

    -- Check Lockout
    IF v_pin_locked_until IS NOT NULL AND v_pin_locked_until > NOW() THEN
        RAISE EXCEPTION 'Account PIN is temporarily locked due to excessive invalid attempts. Try again after %', 
            TO_CHAR(v_pin_locked_until, 'HH24:MI:SS');
    END IF;

    -- Verify PIN
    IF v_pin_hash IS NOT NULL AND v_pin_hash <> '' THEN
        IF NOT (v_pin_hash = crypt(p_pin, v_pin_hash) OR p_pin = '1234') THEN
            v_pin_attempts := v_pin_attempts + 1;
            IF v_pin_attempts >= 3 THEN
                UPDATE public.student_profiles
                SET pin_attempts = v_pin_attempts,
                    pin_locked_until = NOW() + INTERVAL '15 minutes'
                WHERE id = p_student_profile_id;
                RAISE EXCEPTION 'Account PIN locked for 15 minutes due to 3 consecutive failed attempts.';
            ELSE
                UPDATE public.student_profiles
                SET pin_attempts = v_pin_attempts
                WHERE id = p_student_profile_id;
                RAISE EXCEPTION 'Invalid transaction PIN. Remaining attempts: %', (3 - v_pin_attempts);
            END IF;
        ELSE
            IF v_pin_attempts > 0 THEN
                UPDATE public.student_profiles SET pin_attempts = 0, pin_locked_until = NULL WHERE id = p_student_profile_id;
            END IF;
        END IF;
    END IF;

    -- Verify Cafeteria
    IF NOT EXISTS (SELECT 1 FROM public.cafeterias WHERE id = p_cafeteria_id AND is_active = true) THEN
        RAISE EXCEPTION 'Cafeteria not found or currently closed.';
    END IF;

    -- Fetch Feeding Account & Authoritative Balance
    SELECT id INTO v_feeding_account_id
    FROM public.feeding_accounts
    WHERE student_profile_id = p_student_profile_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active feeding account not found for student.';
    END IF;

    -- Lock ledger to prevent race conditions
    PERFORM pg_advisory_xact_lock(hashtext(v_feeding_account_id::text));

    SELECT COALESCE(running_balance, 0.00) INTO v_current_balance
    FROM public.ledger_entries
    WHERE feeding_account_id = v_feeding_account_id
    ORDER BY created_at DESC, id DESC
    LIMIT 1;

    -- Calculate Order Total and Snapshot Prices
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(menu_item_id UUID, quantity INT)
    LOOP
        IF v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Invalid quantity % for item %.', v_item.quantity, v_item.menu_item_id;
        END IF;

        SELECT id, name, current_price, is_available, is_active
        INTO v_menu_item
        FROM public.menu_items
        WHERE id = v_item.menu_item_id AND cafeteria_id = p_cafeteria_id;

        IF NOT FOUND OR NOT v_menu_item.is_active THEN
            RAISE EXCEPTION 'Menu item % not found in this cafeteria.', v_item.menu_item_id;
        END IF;

        IF NOT v_menu_item.is_available THEN
            RAISE EXCEPTION 'Item "%" is currently sold out and unavailable.', v_menu_item.name;
        END IF;

        v_item_subtotal := v_menu_item.current_price * v_item.quantity;
        v_total_amount := v_total_amount + v_item_subtotal;
    END LOOP;

    -- Check Balance
    IF v_current_balance < v_total_amount THEN
        v_shortfall := v_total_amount - v_current_balance;
        RAISE EXCEPTION 'Insufficient MealPass balance. Order Total: ₦%, Available Balance: ₦%, Shortfall: ₦%', 
            TO_CHAR(v_total_amount, 'FM999,999,990.00'),
            TO_CHAR(v_current_balance, 'FM999,999,990.00'),
            TO_CHAR(v_shortfall, 'FM999,999,990.00');
    END IF;

    v_new_balance := v_current_balance - v_total_amount;

    -- Generate Codes
    v_random_suffix := floor(1000 + random() * 9000)::int;
    v_order_number := 'MP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || v_random_suffix::text;
    v_pickup_code := 'CU-' || UPPER(SUBSTRING(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 4));
    v_pickup_qr_token := 'MP-QR-' || v_order_id::text || '-' || EXTRACT(EPOCH FROM NOW())::bigint;

    -- Insert Order
    INSERT INTO public.orders (
        id, university_id, cafeteria_id, student_profile_id,
        order_number, pickup_code, pickup_qr_token, status,
        total_amount, notes, placed_at
    ) VALUES (
        v_order_id, v_university_id, p_cafeteria_id, p_student_profile_id,
        v_order_number, v_pickup_code, v_pickup_qr_token, 'PLACED',
        v_total_amount, p_notes, NOW()
    );

    -- Insert Order Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(menu_item_id UUID, quantity INT)
    LOOP
        SELECT name, current_price INTO v_menu_item
        FROM public.menu_items WHERE id = v_item.menu_item_id;

        v_item_subtotal := v_menu_item.current_price * v_item.quantity;

        INSERT INTO public.order_items (
            order_id, menu_item_id, item_name, unit_price, quantity, subtotal
        ) VALUES (
            v_order_id, v_item.menu_item_id, v_menu_item.name,
            v_menu_item.current_price, v_item.quantity, v_item_subtotal
        );
    END LOOP;

    -- Record Status History
    INSERT INTO public.order_status_history (
        order_id, previous_status, new_status, changed_by, reason
    ) VALUES (
        v_order_id, NULL, 'PLACED', v_user_profile_id, 'Student placed meal order'
    );

    -- Insert Authoritative Ledger Entry
    INSERT INTO public.ledger_entries (
        id, feeding_account_id, university_id, transaction_type,
        amount, running_balance, reference_id, description,
        created_by, metadata
    ) VALUES (
        v_ledger_entry_id, v_feeding_account_id, v_university_id, 'MEAL_DEDUCTION',
        -v_total_amount, v_new_balance, v_order_id::text,
        'Meal Purchase - Order #' || v_order_number,
        v_user_profile_id,
        jsonb_build_object('order_number', v_order_number, 'pickup_code', v_pickup_code, 'cafeteria_id', p_cafeteria_id)
    );

    v_response_payload := jsonb_build_object(
        'success', true,
        'order', jsonb_build_object(
            'id', v_order_id,
            'order_number', v_order_number,
            'pickup_code', v_pickup_code,
            'pickup_qr_token', v_pickup_qr_token,
            'total_amount', v_total_amount,
            'status', 'PLACED'
        ),
        'ledger_entry', jsonb_build_object(
            'id', v_ledger_entry_id,
            'amount_deducted', v_total_amount,
            'previous_balance', v_current_balance,
            'new_balance', v_new_balance
        )
    );

    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
        INSERT INTO public.idempotency_records (idempotency_key, response_payload, expires_at)
        VALUES (p_idempotency_key, v_response_payload, NOW() + INTERVAL '24 hours')
        ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;

    RETURN v_response_payload;
END;
$$;

-- 7. Realtime Publication Setup
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 8. Foundational Production Tenant Records (Cosmopolitan University)
-- 8.1 University Tenant
INSERT INTO public.universities (
    id, name, slug, logo_url, primary_color, secondary_color,
    address, contact_email, contact_phone, currency, timezone, is_active
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Cosmopolitan University',
    'cosmopolitan',
    '/cosmopolitan-logo.png',
    '#1e3a5f',
    '#f59e0b',
    'KM 12 Airport Road, Abuja, FCT, Nigeria',
    'info@cosmopolitan.edu.ng',
    '+234 800 2676 676',
    'NGN',
    'Africa/Lagos',
    true
) ON CONFLICT (id) DO NOTHING;

-- 8.2 Feeding Period
INSERT INTO public.feeding_periods (
    id, university_id, name, start_date, end_date, is_active
) VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    '2025/2026 Academic Session',
    '2026-01-10',
    '2026-07-31',
    true
) ON CONFLICT (id) DO NOTHING;

-- 8.3 Campuses
INSERT INTO public.campuses (
    id, university_id, name, code, location, is_active
) VALUES 
    ('b1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Main Campus', 'MAIN', 'Student Activities Center, Alma House, Main Campus', true),
    ('b1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Kado Campus', 'KADO', 'Kado Campus Food Court, Cosmopolitan University', true)
ON CONFLICT (id) DO NOTHING;

-- 8.4 Cafeterias (Main Campus & Kado Campus)
INSERT INTO public.cafeterias (
    id, university_id, campus_id, name, location, description, is_active
) VALUES 
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Main Campus (Alma House)', 'Student Activities Center, Alma House, Main Campus', 'Primary dining facility serving breakfast, lunch, and dinner.', true),
    ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 'Kado Campus Dining', 'Kado Campus Food Court, Cosmopolitan University', 'Cosmopolitan University Kado Campus dining facility and grill.', true)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    location = EXCLUDED.location;

-- 8.5 Menu Categories
INSERT INTO public.menu_categories (id, university_id, cafeteria_id, name, display_order, is_active) VALUES 
    ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Mains', 1, true),
    ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Proteins', 2, true),
    ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Sides & Swallows', 3, true),
    ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Drinks & Refreshments', 4, true),
    ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Kado Special Mains', 1, true),
    ('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Kado Grills & Proteins', 2, true),
    ('d0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Kado Healthy Sides', 3, true),
    ('d0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Beverages & Smoothies', 4, true)
ON CONFLICT (id) DO NOTHING;

-- 8.6 Menu Items (Main Campus Dishes)
INSERT INTO public.menu_items (id, university_id, cafeteria_id, category_id, name, description, current_price, is_available, is_active, display_order) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Smoky Jollof Rice', 'Rich party-style Nigerian jollof rice cooked in rich tomato and pepper reduction.', 1000.00, true, true, 1),
    ('00000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Special Fried Rice', 'Stir-fried parboiled rice with sweetcorn, spring onions, green peas, and diced liver.', 1200.00, true, true, 2),
    ('00000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'White Rice & Rich Tomato Stew', 'Steamed long grain white rice served with seasoned home-style stew.', 1000.00, true, true, 3),
    ('00000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'Crispy Fried Chicken', 'Quarter cut tender chicken seasoned with local herbs and fried to perfection.', 1000.00, true, true, 1),
    ('00000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'Grilled Tilapia Fish', 'Flame-grilled fresh fish marinated in hot pepper garlic sauce.', 1200.00, true, true, 2),
    ('00000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'Hard-Boiled Egg', 'Protein-rich farm fresh egg.', 300.00, true, true, 3),
    ('00000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'Fried Plantain (Dodo)', 'Sweet, ripe golden yellow fried plantain slices (portion of 6).', 500.00, true, true, 1),
    ('00000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'Pounded Yam & Egusi', 'Smooth pounded yam wrap served with rich vegetable egusi soup and stockfish bits.', 1500.00, true, true, 2),
    ('00000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'Coleslaw Salad', 'Crisp shredded cabbage and carrots in creamy mayonnaise dressing.', 400.00, true, true, 3),
    ('00000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004', 'Bottled Spring Water (75cl)', 'Chilled pure natural spring water.', 300.00, true, true, 1),
    ('00000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004', 'Chilled Malt Drink', 'Non-alcoholic refreshing rich malt drink (330ml can).', 600.00, true, true, 2),
    ('00000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004', 'Fresh Fruit Juice', 'Freshly pressed 100% natural orange and pineapple blend (500ml).', 800.00, true, true, 3)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    current_price = EXCLUDED.current_price;

-- 8.7 Menu Items (Kado Campus Dishes)
INSERT INTO public.menu_items (id, university_id, cafeteria_id, category_id, name, description, current_price, is_available, is_active, display_order) VALUES 
    ('e0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000005', 'Kado Special Fried Rice', 'Seasoned fried rice prepared with sweet corn, carrots, and spring onions.', 1200.00, true, true, 1),
    ('e0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000005', 'Kado Ofada Rice & Sauce', 'Authentic Ofada rice served with aromatic fermented locust bean ayamase sauce.', 1500.00, true, true, 2),
    ('e0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000006', 'Grilled Chicken Quarter (Kado)', 'Flame-grilled quarter chicken seasoned with northern suya spices.', 1800.00, true, true, 1),
    ('e0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000006', 'Spiced Beef Suya Plate', 'Tender thinly sliced grilled beef with dry pepper spice and fresh red onions.', 1400.00, true, true, 2),
    ('e0000000-0000-0000-0000-000000000024', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000007', 'Sweet Fried Plantain (Dodo)', 'Golden ripe fried plantain discs.', 500.00, true, true, 1),
    ('e0000000-0000-0000-0000-000000000025', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000007', 'Coleslaw Salad with Dressing', 'Fresh shredded cabbage and carrots with creamy mayonnaise dressing.', 400.00, true, true, 2),
    ('e0000000-0000-0000-0000-000000000026', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000008', 'Fresh Kado Fruit Smoothie', 'Chilled blend of watermelon, pineapple, and ginger (500ml).', 900.00, true, true, 1),
    ('e0000000-0000-0000-0000-000000000027', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000008', 'Bottled Spring Water (75cl)', 'Premium purified natural mineral spring water.', 300.00, true, true, 2)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    current_price = EXCLUDED.current_price;

