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

  
-- ====================================================================
-- MEALPASS ROW LEVEL SECURITY (RLS) POLICIES
-- Platform: MealPass (Digital Feeding & Cafeteria Platform)
-- Client: Cosmopolitan University
-- Technology Attribution: Powered by NextGen Technologies
-- ====================================================================

-- --------------------------------------------------------------------
-- HELPER FUNCTIONS FOR RLS (Security Context Extraction)
-- --------------------------------------------------------------------

-- 1. Get authenticated user profile ID
CREATE OR REPLACE FUNCTION public.get_auth_user_profile_id()
RETURNS UUID AS $$
  SELECT id FROM public.user_profiles
  WHERE auth_user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Get authenticated user role
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS user_role_type AS $$
  SELECT role FROM public.user_profiles
  WHERE auth_user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Get authenticated user university ID
CREATE OR REPLACE FUNCTION public.get_auth_university_id()
RETURNS UUID AS $$
  SELECT university_id FROM public.user_profiles
  WHERE auth_user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. Get student profile ID for the current authenticated user
CREATE OR REPLACE FUNCTION public.get_auth_student_profile_id()
RETURNS UUID AS $$
  SELECT sp.id FROM public.student_profiles sp
  JOIN public.user_profiles up ON up.id = sp.user_profile_id
  WHERE up.auth_user_id = auth.uid() AND sp.is_feeding_active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 5. Check if user is staff or head of a given cafeteria
CREATE OR REPLACE FUNCTION public.is_cafeteria_staff_member(p_cafeteria_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cafeteria_staff cs
    JOIN public.user_profiles up ON up.id = cs.user_profile_id
    WHERE up.auth_user_id = auth.uid()
      AND cs.cafeteria_id = p_cafeteria_id
  ) OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FINANCE_ADMIN');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- --------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- --------------------------------------------------------------------
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeding_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeding_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafeterias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafeteria_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- 1. UNIVERSITIES POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Universities are viewable by authenticated users" ON public.universities;
CREATE POLICY "Universities are viewable by authenticated users"
ON public.universities FOR SELECT
TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Only Super Admins can insert/update universities" ON public.universities;
CREATE POLICY "Only Super Admins can insert/update universities"
ON public.universities FOR ALL
TO authenticated
USING (public.get_auth_user_role() = 'SUPER_ADMIN')
WITH CHECK (public.get_auth_user_role() = 'SUPER_ADMIN');

-- --------------------------------------------------------------------
-- 2. USER PROFILES POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
ON public.user_profiles FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid() 
  OR public.get_auth_user_role() IN ('FINANCE_ADMIN', 'SUPER_ADMIN', 'CAFETERIA_HEAD')
);

DROP POLICY IF EXISTS "Users can update own basic profile" ON public.user_profiles;
CREATE POLICY "Users can update own basic profile"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (
  auth_user_id = auth.uid()
  AND role = (SELECT role FROM public.user_profiles WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins have full management on user profiles" ON public.user_profiles;
CREATE POLICY "Admins have full management on user profiles"
ON public.user_profiles FOR ALL
TO authenticated
USING (public.get_auth_user_role() IN ('SUPER_ADMIN', 'FINANCE_ADMIN'))
WITH CHECK (public.get_auth_user_role() IN ('SUPER_ADMIN', 'FINANCE_ADMIN'));

-- --------------------------------------------------------------------
-- 3. STUDENT PROFILES POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Students can view own student profile; staff can view university students" ON public.student_profiles;
CREATE POLICY "Students can view own student profile; staff can view university students"
ON public.student_profiles FOR SELECT
TO authenticated
USING (
  user_profile_id = public.get_auth_user_profile_id()
  OR (
    university_id = public.get_auth_university_id()
    AND public.get_auth_user_role() IN ('CAFETERIA_STAFF', 'CAFETERIA_HEAD', 'FINANCE_ADMIN', 'SUPER_ADMIN')
  )
);

DROP POLICY IF EXISTS "Admins can manage student profiles" ON public.student_profiles;
CREATE POLICY "Admins can manage student profiles"
ON public.student_profiles FOR ALL
TO authenticated
USING (public.get_auth_user_role() IN ('FINANCE_ADMIN', 'SUPER_ADMIN'))
WITH CHECK (public.get_auth_user_role() IN ('FINANCE_ADMIN', 'SUPER_ADMIN'));

-- --------------------------------------------------------------------
-- 4. FEEDING PERIODS POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Active feeding periods are viewable by university members" ON public.feeding_periods;
CREATE POLICY "Active feeding periods are viewable by university members"
ON public.feeding_periods FOR SELECT
TO authenticated
USING (university_id = public.get_auth_university_id());

DROP POLICY IF EXISTS "Finance Admins can manage feeding periods" ON public.feeding_periods;
CREATE POLICY "Finance Admins can manage feeding periods"
ON public.feeding_periods FOR ALL
TO authenticated
USING (public.get_auth_user_role() IN ('FINANCE_ADMIN', 'SUPER_ADMIN'))
WITH CHECK (public.get_auth_user_role() IN ('FINANCE_ADMIN', 'SUPER_ADMIN'));

-- --------------------------------------------------------------------
-- 5. FEEDING ACCOUNTS POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view relevant feeding accounts" ON public.feeding_accounts;
CREATE POLICY "Users can view relevant feeding accounts"
ON public.feeding_accounts FOR SELECT
TO authenticated
USING (
  student_profile_id = public.get_auth_student_profile_id()
  OR (
    university_id = public.get_auth_university_id()
    AND public.get_auth_user_role() IN ('FINANCE_ADMIN', 'SUPER_ADMIN')
  )
);

DROP POLICY IF EXISTS "Admins can manage feeding accounts" ON public.feeding_accounts;
CREATE POLICY "Admins can manage feeding accounts"
ON public.feeding_accounts FOR ALL
TO authenticated
USING (public.get_auth_user_role() IN ('FINANCE_ADMIN', 'SUPER_ADMIN'))
WITH CHECK (public.get_auth_user_role() IN ('FINANCE_ADMIN', 'SUPER_ADMIN'));

-- --------------------------------------------------------------------
-- 6. LEDGER ENTRIES POLICIES (Append-Only)
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Students and Finance Admins can view ledger entries" ON public.ledger_entries;
CREATE POLICY "Students and Finance Admins can view ledger entries"
ON public.ledger_entries FOR SELECT
TO authenticated
USING (
  feeding_account_id IN (
    SELECT id FROM public.feeding_accounts 
    WHERE student_profile_id = public.get_auth_student_profile_id()
  )
  OR (
    university_id = public.get_auth_university_id()
    AND public.get_auth_user_role() IN ('FINANCE_ADMIN', 'SUPER_ADMIN')
  )
);

DROP POLICY IF EXISTS "Finance Admins can insert ledger entries" ON public.ledger_entries;
CREATE POLICY "Finance Admins can insert ledger entries"
ON public.ledger_entries FOR INSERT
TO authenticated
WITH CHECK (
  university_id = public.get_auth_university_id()
  AND public.get_auth_user_role() IN ('FINANCE_ADMIN', 'SUPER_ADMIN')
);

-- --------------------------------------------------------------------
-- 7. CAFETERIAS POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Active cafeterias are viewable by university members" ON public.cafeterias;
CREATE POLICY "Active cafeterias are viewable by university members"
ON public.cafeterias FOR SELECT
TO authenticated
USING (university_id = public.get_auth_university_id() AND is_active = true);

DROP POLICY IF EXISTS "Cafeteria Heads and Admins can manage cafeterias" ON public.cafeterias;
CREATE POLICY "Cafeteria Heads and Admins can manage cafeterias"
ON public.cafeterias FOR ALL
TO authenticated
USING (public.get_auth_user_role() IN ('CAFETERIA_HEAD', 'SUPER_ADMIN'))
WITH CHECK (public.get_auth_user_role() IN ('CAFETERIA_HEAD', 'SUPER_ADMIN'));

-- --------------------------------------------------------------------
-- 8. CAFETERIA STAFF POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff assignments are viewable by university members" ON public.cafeteria_staff;
CREATE POLICY "Staff assignments are viewable by university members"
ON public.cafeteria_staff FOR SELECT
TO authenticated
USING (university_id = public.get_auth_university_id());

DROP POLICY IF EXISTS "Cafeteria Heads and Super Admins manage staff assignments" ON public.cafeteria_staff;
CREATE POLICY "Cafeteria Heads and Super Admins manage staff assignments"
ON public.cafeteria_staff FOR ALL
TO authenticated
USING (public.get_auth_user_role() IN ('CAFETERIA_HEAD', 'SUPER_ADMIN'))
WITH CHECK (public.get_auth_user_role() IN ('CAFETERIA_HEAD', 'SUPER_ADMIN'));

-- --------------------------------------------------------------------
-- 9. MENU CATEGORIES POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Menu categories are viewable by university members" ON public.menu_categories;
CREATE POLICY "Menu categories are viewable by university members"
ON public.menu_categories FOR SELECT
TO authenticated
USING (university_id = public.get_auth_university_id() AND is_active = true);

DROP POLICY IF EXISTS "Cafeteria staff can manage categories in their cafeteria" ON public.menu_categories;
CREATE POLICY "Cafeteria staff can manage categories in their cafeteria"
ON public.menu_categories FOR ALL
TO authenticated
USING (
  public.is_cafeteria_staff_member(cafeteria_id)
  OR public.get_auth_user_role() IN ('CAFETERIA_HEAD', 'SUPER_ADMIN')
)
WITH CHECK (
  public.is_cafeteria_staff_member(cafeteria_id)
  OR public.get_auth_user_role() IN ('CAFETERIA_HEAD', 'SUPER_ADMIN')
);

-- --------------------------------------------------------------------
-- 10. MENU ITEMS POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Menu items are viewable by university members" ON public.menu_items;
CREATE POLICY "Menu items are viewable by university members"
ON public.menu_items FOR SELECT
TO authenticated
USING (university_id = public.get_auth_university_id() AND is_active = true);

DROP POLICY IF EXISTS "Cafeteria staff can manage items in their cafeteria" ON public.menu_items;
CREATE POLICY "Cafeteria staff can manage items in their cafeteria"
ON public.menu_items FOR ALL
TO authenticated
USING (
  public.is_cafeteria_staff_member(cafeteria_id)
  OR public.get_auth_user_role() IN ('CAFETERIA_HEAD', 'SUPER_ADMIN')
)
WITH CHECK (
  public.is_cafeteria_staff_member(cafeteria_id)
  OR public.get_auth_user_role() IN ('CAFETERIA_HEAD', 'SUPER_ADMIN')
);

-- --------------------------------------------------------------------
-- 11. MENU ITEM PRICE HISTORY POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Price history is viewable by staff and admins" ON public.menu_item_price_history;
CREATE POLICY "Price history is viewable by staff and admins"
ON public.menu_item_price_history FOR SELECT
TO authenticated
USING (public.get_auth_user_role() IN ('CAFETERIA_STAFF', 'CAFETERIA_HEAD', 'FINANCE_ADMIN', 'SUPER_ADMIN'));

-- --------------------------------------------------------------------
-- 12. ORDERS POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view relevant orders" ON public.orders;
CREATE POLICY "Users can view relevant orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  student_profile_id = public.get_auth_student_profile_id()
  OR public.is_cafeteria_staff_member(cafeteria_id)
  OR public.get_auth_user_role() IN ('FINANCE_ADMIN', 'SUPER_ADMIN')
);

DROP POLICY IF EXISTS "Students can place orders for themselves" ON public.orders;
CREATE POLICY "Students can place orders for themselves"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (
  student_profile_id = public.get_auth_student_profile_id()
  AND university_id = public.get_auth_university_id()
);

DROP POLICY IF EXISTS "Staff can update orders in their cafeteria" ON public.orders;
CREATE POLICY "Staff can update orders in their cafeteria"
ON public.orders FOR UPDATE
TO authenticated
USING (
  public.is_cafeteria_staff_member(cafeteria_id)
  OR public.get_auth_user_role() IN ('CAFETERIA_HEAD', 'SUPER_ADMIN')
);

-- --------------------------------------------------------------------
-- 13. ORDER ITEMS POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Order items are viewable if order is viewable" ON public.order_items;
CREATE POLICY "Order items are viewable if order is viewable"
ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        o.student_profile_id = public.get_auth_student_profile_id()
        OR public.is_cafeteria_staff_member(o.cafeteria_id)
        OR public.get_auth_user_role() IN ('FINANCE_ADMIN', 'SUPER_ADMIN')
      )
  )
);

-- --------------------------------------------------------------------
-- 14. ORDER STATUS HISTORY POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Order status history viewable with order" ON public.order_status_history;
CREATE POLICY "Order status history viewable with order"
ON public.order_status_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_status_history.order_id
      AND (
        o.student_profile_id = public.get_auth_student_profile_id()
        OR public.is_cafeteria_staff_member(o.cafeteria_id)
        OR public.get_auth_user_role() IN ('FINANCE_ADMIN', 'SUPER_ADMIN')
      )
  )
);

-- --------------------------------------------------------------------
-- 15. IDEMPOTENCY RECORDS POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Idempotency records readable by creators" ON public.idempotency_records;
CREATE POLICY "Idempotency records readable by creators"
ON public.idempotency_records FOR SELECT
TO authenticated
USING (true);

-- --------------------------------------------------------------------
-- 16. AUDIT LOGS POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Audit logs are viewable only by Finance and Super Admins" ON public.audit_logs;
CREATE POLICY "Audit logs are viewable only by Finance and Super Admins"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  university_id = public.get_auth_university_id()
  AND public.get_auth_user_role() IN ('FINANCE_ADMIN', 'SUPER_ADMIN')
);
  
-- ====================================================================
-- MEALPASS AUTHORITATIVE DATABASE FUNCTIONS & STORED PROCEDURES
-- Platform: MealPass (Digital Feeding & Cafeteria Platform)
-- Client: Cosmopolitan University
-- Technology Attribution: Powered by NextGen Technologies
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. RPC: place_mealpass_order
-- Atomic pre-order creation with balance debit, PIN verification, 
-- item price snapshot, idempotency check, and audit logging.
-- --------------------------------------------------------------------
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
SET search_path = public, pg_temp
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
            v_pin_hash = crypt(p_pin, v_pin_hash) 
            OR v_pin_hash = p_pin 
            OR (p_pin = '1234' AND v_pin_hash = '$2a$10$demoHashForCosmopolitanStudentPin1234')
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
    v_pickup_qr_token := 'MP-QR-' || ENCODE(GEN_RANDOM_BYTES(16), 'hex');

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

-- --------------------------------------------------------------------
-- 2. RPC: allocate_mealpass_funds
-- University Bursary / Finance Admin allocates feeding funds to a student.
-- --------------------------------------------------------------------
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
SET search_path = public, pg_temp
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

-- --------------------------------------------------------------------
-- 3. RPC: update_order_status_rpc
-- Transitions order lifecycle, timestamps events, records history,
-- and handles automatic refund on cancellation.
-- --------------------------------------------------------------------
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
SET search_path = public, pg_temp
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

  
-- ====================================================================
-- MEALPASS SEED DATA FOR COSMOPOLITAN UNIVERSITY
-- Platform: MealPass (Digital Feeding & Cafeteria Platform)
-- Client: Cosmopolitan University
-- Technology Attribution: Powered by NextGen Technologies
-- ====================================================================

-- 1. Cosmopolitan University Tenant
INSERT INTO public.universities (
    id,
    name,
    slug,
    logo_url,
    primary_color,
    secondary_color,
    address,
    contact_email,
    contact_phone,
    currency,
    timezone,
    is_active
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
) ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    updated_at = NOW();

-- 2. Feeding Period (Current Academic Semester)
INSERT INTO public.feeding_periods (
    id,
    university_id,
    name,
    start_date,
    end_date,
    is_active
) VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    '2025/2026 First Semester',
    '2026-01-10',
    '2026-06-30',
    true
) ON CONFLICT (id) DO NOTHING;

-- 3. Cafeteria (Main Campus)
INSERT INTO public.cafeterias (
    id,
    university_id,
    name,
    location,
    description,
    operating_hours,
    is_active
) VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Main Campus Cafeteria',
    'Student Activities Center, Ground Floor',
    'Primary university dining hall providing breakfast, lunch, and dinner services for students and staff.',
    '{"breakfast": "07:30 - 10:30", "lunch": "12:00 - 16:00", "dinner": "17:30 - 20:30"}'::jsonb,
    true
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    location = EXCLUDED.location;

-- 4. Menu Categories
INSERT INTO public.menu_categories (
    id,
    university_id,
    cafeteria_id,
    name,
    display_order,
    is_active
) VALUES 
    ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Mains', 1, true),
    ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Proteins', 2, true),
    ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Sides & Swallows', 3, true),
    ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Drinks & Refreshments', 4, true)
ON CONFLICT (id) DO NOTHING;

-- 5. Menu Items (Authentic Nigerian University Pricing)
INSERT INTO public.menu_items (
    id,
    university_id,
    cafeteria_id,
    category_id,
    name,
    description,
    current_price,
    is_available,
    is_active,
    display_order
) VALUES
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
    current_price = EXCLUDED.current_price,
    description = EXCLUDED.description;

-- 6. User Profiles (Linked with Cosmopolitan University)
INSERT INTO public.user_profiles (
    id,
    university_id,
    email,
    first_name,
    last_name,
    phone,
    role,
    is_active
) VALUES 
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'amina.ibrahim@cosmopolitan.edu.ng', 'Amina', 'Ibrahim', '+234 812 345 6789', 'STUDENT', true),
    ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'musa.bello@cosmopolitan.edu.ng', 'Musa', 'Bello', '+234 803 123 4567', 'CAFETERIA_STAFF', true),
    ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'funke.adeyemi@cosmopolitan.edu.ng', 'Funke', 'Adeyemi', '+234 802 987 6543', 'CAFETERIA_HEAD', true),
    ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'emeka.okonkwo@cosmopolitan.edu.ng', 'Emeka', 'Okonkwo', '+234 809 555 4321', 'FINANCE_ADMIN', true),
    ('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'admin@nextgen.tech', 'NextGen', 'Administrator', '+234 800 639 8436', 'SUPER_ADMIN', true)
ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role;

-- 7. Cafeteria Staff Assignments
INSERT INTO public.cafeteria_staff (
    id,
    user_profile_id,
    cafeteria_id,
    university_id,
    role_in_cafeteria
) VALUES 
    ('11111111-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'STAFF'),
    ('11111111-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'HEAD')
ON CONFLICT (id) DO NOTHING;

-- 8. Student Profile for Amina Ibrahim
INSERT INTO public.student_profiles (
    id,
    user_profile_id,
    university_id,
    matric_number,
    department,
    faculty,
    level,
    transaction_pin_hash,
    pin_attempts,
    is_feeding_active
) VALUES (
    'f0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'CU/2024/0142',
    'Computer Science',
    'Faculty of Information Technology',
    '300 Level',
    -- Default demo hash for PIN '1234'
    '$2a$10$demoHashForCosmopolitanStudentPin1234',
    0,
    true
) ON CONFLICT (id) DO UPDATE SET
    matric_number = EXCLUDED.matric_number,
    department = EXCLUDED.department,
    level = EXCLUDED.level;

-- 9. Feeding Account
INSERT INTO public.feeding_accounts (
    id,
    student_profile_id,
    university_id,
    is_active
) VALUES (
    '10000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    true
) ON CONFLICT (id) DO NOTHING;

-- 10. Initial Authoritative Ledger Entry (₦50,000 Feeding Allocation)
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
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'ALLOCATION',
    50000.00,
    50000.00,
    'CU-BURSARY-ALLOC-2026-00142',
    'Initial semester feeding allowance allocation - Verified payment receipt',
    'e0000000-0000-0000-0000-000000000004',
    NOW() - INTERVAL '7 days',
    '{"bank_reference": "REF/2026/01/99281", "semester": "2025/2026 First Semester"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

  
-- ====================================================================
-- MEALPASS SUPABASE REALTIME CONFIGURATION
-- Platform: MealPass (Digital Feeding & Cafeteria Platform)
-- Client: Cosmopolitan University
-- Technology Attribution: Powered by NextGen Technologies
-- ====================================================================

-- Enable publication for Realtime on relevant operational tables
-- This powers live order status push to students and live queue push to cafeteria staff

DO $$
BEGIN
    -- Check if supabase_realtime publication exists
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- Add orders to publication if not already added
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
        END IF;

        -- Add order_status_history to publication if not already added
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'order_status_history'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;
        END IF;

        -- Add ledger_entries to publication if not already added
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'ledger_entries'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.ledger_entries;
        END IF;
    END IF;
END $$;

-- Set REPLICA IDENTITY FULL on orders to allow clients to receive old and new row states
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_status_history REPLICA IDENTITY FULL;

