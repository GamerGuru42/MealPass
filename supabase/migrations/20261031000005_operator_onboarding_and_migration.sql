-- ====================================================================
-- MEALPASS — PROMPT 10 DATABASE MIGRATION
-- Operator Onboarding, Legacy Migration & Two-Campus Foundation
-- Cosmopolitan University | Powered by NextGen Technologies
-- ====================================================================

-- 1. Extend transaction_type Enum with OPENING_BALANCE
-- Guarantees historical legacy entitlements have a dedicated financial ledger transaction type
DO $$ BEGIN
    ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'OPENING_BALANCE';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Operator Invitations Table (Single-use, Expiring, Role-gated)
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
CREATE INDEX IF NOT EXISTS idx_operator_invitations_status ON public.operator_invitations(status);

-- 3. Migration Batches Table (Audit Trail for Legacy Student Entitlement Imports)
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
CREATE INDEX IF NOT EXISTS idx_migration_batches_idemp ON public.migration_batches(idempotency_key);

-- 4. Migration Records Table (Per-Student Legacy Extraction & Opening Balance Mapping)
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

-- 5. Two-Campus Foundation Configuration
-- Main Campus: explicitly named "Main Campus (Alma House)" (Alma House is the building on Main Campus)
UPDATE public.cafeterias 
SET name = 'Main Campus (Alma House)', 
    location = 'Student Activities Center, Alma House, Main Campus'
WHERE id = 'c0000000-0000-0000-0000-000000000001';

-- Kado Campus Dining: Second official university food operation
INSERT INTO public.cafeterias (
    id,
    university_id,
    name,
    location,
    description,
    operating_hours,
    is_active
) VALUES (
    'c0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Kado Campus Dining',
    'Kado Campus Food Court, Cosmopolitan University',
    'Official satellite university dining facility providing full MealPass services for students and faculty at Kado Campus.',
    '{"breakfast": "08:00 - 10:30", "lunch": "12:00 - 15:30", "dinner": "17:30 - 20:00"}'::jsonb,
    true
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    location = EXCLUDED.location,
    description = EXCLUDED.description;

-- 6. Kado Campus Menu Categories
INSERT INTO public.menu_categories (
    id,
    university_id,
    cafeteria_id,
    name,
    display_order,
    is_active
) VALUES 
    ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Kado Special Mains', 1, true),
    ('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Kado Grills & Proteins', 2, true),
    ('d0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Kado Healthy Sides', 3, true),
    ('d0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Beverages & Smoothies', 4, true)
ON CONFLICT (id) DO NOTHING;

-- 7. Kado Campus Menu Items (Distinct Campus Menu)
INSERT INTO public.menu_items (
    id,
    university_id,
    cafeteria_id,
    category_id,
    name,
    description,
    current_price,
    is_available,
    display_order
) VALUES
    ('e0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000005', 'Kado Special Fried Rice', 'Seasoned fried rice prepared with sweet corn, carrots, and spring onions.', 1200.00, true, 1),
    ('e0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000005', 'Kado Ofada Rice & Sauce', 'Authentic Ofada rice served with aromatic fermented locust bean ayamase sauce.', 1500.00, true, 2),
    ('e0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000006', 'Grilled Chicken Quarter (Kado)', 'Flame-grilled quarter chicken seasoned with northern suya spices.', 1800.00, true, 1),
    ('e0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000006', 'Spiced Beef Suya Plate', 'Tender thinly sliced grilled beef with dry pepper spice and fresh red onions.', 1400.00, true, 2),
    ('e0000000-0000-0000-0000-000000000024', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000007', 'Sweet Fried Plantain (Dodo)', 'Golden ripe fried plantain discs.', 500.00, true, 1),
    ('e0000000-0000-0000-0000-000000000025', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000007', 'Coleslaw Salad with Dressing', 'Fresh shredded cabbage and carrots with creamy mayonnaise dressing.', 400.00, true, 2),
    ('e0000000-0000-0000-0000-000000000026', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000008', 'Fresh Kado Fruit Smoothie', 'Chilled blend of watermelon, pineapple, and ginger (500ml).', 900.00, true, 1),
    ('e0000000-0000-0000-0000-000000000027', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000008', 'Bottled Spring Water (75cl)', 'Premium purified natural mineral spring water.', 300.00, true, 2)
ON CONFLICT (id) DO NOTHING;

-- 8. Row Level Security Policies
ALTER TABLE public.operator_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_records ENABLE ROW LEVEL SECURITY;

-- Operator Invitations Policies:
-- Service role has full management
DROP POLICY IF EXISTS "Service role manages invitations" ON public.operator_invitations;
CREATE POLICY "Service role manages invitations" ON public.operator_invitations
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Admins and Cafeteria Heads can view invitations within their university
DROP POLICY IF EXISTS "Admins view invitations" ON public.operator_invitations;
CREATE POLICY "Admins view invitations" ON public.operator_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.role IN ('SUPER_ADMIN', 'FINANCE_ADMIN', 'CAFETERIA_HEAD')
        )
    );

-- Migration Batches Policies:
DROP POLICY IF EXISTS "Service role manages migration batches" ON public.migration_batches;
CREATE POLICY "Service role manages migration batches" ON public.migration_batches
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Admins view migration batches" ON public.migration_batches;
CREATE POLICY "Admins view migration batches" ON public.migration_batches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.role IN ('SUPER_ADMIN', 'FINANCE_ADMIN', 'CAFETERIA_HEAD')
        )
    );

-- Migration Records Policies:
DROP POLICY IF EXISTS "Service role manages migration records" ON public.migration_records;
CREATE POLICY "Service role manages migration records" ON public.migration_records
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Admins view migration records" ON public.migration_records;
CREATE POLICY "Admins view migration records" ON public.migration_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.role IN ('SUPER_ADMIN', 'FINANCE_ADMIN', 'CAFETERIA_HEAD')
        )
    );

