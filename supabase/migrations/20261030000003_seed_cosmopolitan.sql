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

