-- ====================================================================
-- MEALPASS DATABASE SCHEMA MIGRATION
-- Platform: MealPass (Digital Feeding & Cafeteria Platform)
-- Client: Cosmopolitan University
-- Technology Attribution: Powered by NextGen Technologies
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
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
        'ADJUSTMENT'
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

-- 1. Universities (Tenants)
CREATE TABLE IF NOT EXISTS universities (
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

-- 2. User Profiles (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
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

CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_id ON user_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_university_id ON user_profiles(university_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- 3. Student Profiles
CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID UNIQUE NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
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
    CONSTRAINT uq_student_profiles_university_matric UNIQUE (university_id, matric_number)
);

CREATE INDEX IF NOT EXISTS idx_student_profiles_university_id ON student_profiles(university_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_matric ON student_profiles(matric_number);

-- 4. Feeding Periods (Academic Semesters)
CREATE TABLE IF NOT EXISTS feeding_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feeding_periods_university_id ON feeding_periods(university_id);

-- 5. Feeding Accounts
CREATE TABLE IF NOT EXISTS feeding_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_profile_id UUID UNIQUE NOT NULL REFERENCES student_profiles(id) ON DELETE RESTRICT,
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feeding_accounts_university_id ON feeding_accounts(university_id);

-- 6. Authoritative Financial Ledger Entries (Append-Only)
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feeding_account_id UUID NOT NULL REFERENCES feeding_accounts(id) ON DELETE RESTRICT,
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
    transaction_type transaction_type NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    running_balance NUMERIC(12, 2) NOT NULL,
    reference_id VARCHAR(150),
    description TEXT NOT NULL,
    created_by UUID REFERENCES user_profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_created ON ledger_entries(feeding_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_university_id ON ledger_entries(university_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_reference_id ON ledger_entries(reference_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_type ON ledger_entries(transaction_type);

-- Strictly Prevent Updates and Deletes on the Ledger (Financial Immutability)
CREATE OR REPLACE FUNCTION prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Authoritative financial ledger records are immutable and append-only. Modification or deletion is strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_ledger_modification ON ledger_entries;
CREATE TRIGGER trg_prevent_ledger_modification
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION prevent_ledger_modification();

-- 7. Cafeterias
CREATE TABLE IF NOT EXISTS cafeterias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    location VARCHAR(255),
    description TEXT,
    operating_hours JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cafeterias_university_id ON cafeterias(university_id);

-- 8. Cafeteria Staff Assignments
CREATE TABLE IF NOT EXISTS cafeteria_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    cafeteria_id UUID NOT NULL REFERENCES cafeterias(id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
    role_in_cafeteria cafeteria_staff_role DEFAULT 'STAFF',
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_cafeteria_staff_user_cafeteria UNIQUE (user_profile_id, cafeteria_id)
);

CREATE INDEX IF NOT EXISTS idx_cafeteria_staff_user ON cafeteria_staff(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_cafeteria_staff_cafeteria ON cafeteria_staff(cafeteria_id);

-- 9. Menu Categories
CREATE TABLE IF NOT EXISTS menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
    cafeteria_id UUID NOT NULL REFERENCES cafeterias(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_categories_cafeteria ON menu_categories(cafeteria_id);

-- 10. Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
    cafeteria_id UUID NOT NULL REFERENCES cafeterias(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    image_url TEXT,
    current_price NUMERIC(12, 2) NOT NULL CHECK (current_price > 0),
    is_available BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_cafeteria ON menu_items(cafeteria_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);

-- 11. Menu Item Price History
CREATE TABLE IF NOT EXISTS menu_item_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    old_price NUMERIC(12, 2) NOT NULL,
    new_price NUMERIC(12, 2) NOT NULL,
    changed_by UUID REFERENCES user_profiles(id) ON DELETE RESTRICT,
    reason TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_menu_item ON menu_item_price_history(menu_item_id);

-- 12. Orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(100) NOT NULL,
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
    student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE RESTRICT,
    cafeteria_id UUID NOT NULL REFERENCES cafeterias(id) ON DELETE RESTRICT,
    status order_status_type NOT NULL DEFAULT 'PLACED',
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
    pickup_code VARCHAR(20) NOT NULL,
    pickup_qr_token VARCHAR(255) NOT NULL,
    idempotency_key VARCHAR(255),
    notes TEXT,
    placed_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    preparing_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    received_by UUID REFERENCES user_profiles(id) ON DELETE RESTRICT,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_orders_university_number UNIQUE (university_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_orders_university_student ON orders(university_id, student_profile_id);
CREATE INDEX IF NOT EXISTS idx_orders_cafeteria_status ON orders(cafeteria_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_pickup_qr_token ON orders(pickup_qr_token);
CREATE INDEX IF NOT EXISTS idx_orders_pickup_code ON orders(pickup_code);
CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key);

-- 13. Order Items (Stores Captured Historical Unit Prices)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
    item_name VARCHAR(200) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price > 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- 14. Order Status History (Audited Transitions)
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    previous_status order_status_type,
    new_status order_status_type NOT NULL,
    changed_by UUID REFERENCES user_profiles(id) ON DELETE RESTRICT,
    reason TEXT,
    is_manual BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);

-- 15. Persistent Idempotency Records
CREATE TABLE IF NOT EXISTS idempotency_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    ledger_entry_id UUID REFERENCES ledger_entries(id) ON DELETE SET NULL,
    response_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_idempotency_key ON idempotency_records(idempotency_key);

-- 16. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_university ON audit_logs(university_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

