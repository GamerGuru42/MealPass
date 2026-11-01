-- ====================================================================
-- MEALPASS POST-MIGRATION CATALOG & PERMISSION EVIDENCE AUDIT
-- Target Project: ipdqfejoctltasrzbdaj (North EU / eu-north-1)
-- Scope: Queries PostgreSQL catalog tables (pg_proc, pg_namespace, pg_policies)
--        to produce exact evidence of authorization hardening and security attributes.
-- ====================================================================

-- QUERY 1: Function Signatures, Return Types, Security Definer, Search Path, and ACLs
SELECT 
    p.proname AS function_name,
    n.nspname AS schema_name,
    pg_get_function_identity_arguments(p.oid) AS argument_signature,
    pg_get_function_result(p.oid) AS return_type,
    p.prosecdef AS is_security_definer,
    array_to_string(p.proconfig, ', ') AS search_path_config,
    array_to_string(p.proacl, ', ') AS access_control_list
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN (
    'get_auth_user_role',
    'get_auth_student_profile_id',
    'get_auth_cafeteria_id',
    'place_mealpass_order',
    'allocate_mealpass_funds',
    'update_order_status_rpc'
  )
ORDER BY p.proname;

-- QUERY 2: Programmatic Execution Privilege Verification (has_function_privilege)
SELECT 
    p.proname AS function_name,
    has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
    has_function_privilege('public', p.oid, 'EXECUTE') AS public_can_execute,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
    has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_can_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN (
    'get_auth_user_role',
    'get_auth_student_profile_id',
    'get_auth_cafeteria_id',
    'place_mealpass_order',
    'allocate_mealpass_funds',
    'update_order_status_rpc'
  )
ORDER BY p.proname;

-- QUERY 3: Verification of the 10 Dependent Row-Level Security (RLS) Policies
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual ILIKE '%get_auth_user_role%'
    OR qual ILIKE '%get_auth_student_profile_id%'
    OR qual ILIKE '%get_auth_cafeteria_id%'
  )
ORDER BY tablename, policyname;

-- QUERY 4: Verification of Dependent Stored Procedures
SELECT 
    p.proname AS procedure_name,
    pg_get_function_identity_arguments(p.oid) AS argument_signature,
    pg_get_function_result(p.oid) AS return_type,
    p.prosecdef AS is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN (
    'allocate_mealpass_funds',
    'update_order_status_rpc'
  )
ORDER BY p.proname;
