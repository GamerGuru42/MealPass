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
