# MEALPASS — PRODUCTION LIVE FUNCTION DEFINITIONS & CATALOG AUDIT
**Target Production Project:** `MealPass Production` (`ipdqfejoctltasrzbdaj`)  
**Region:** North EU (Stockholm) / `eu-north-1`  
**Endpoint:** `https://ipdqfejoctltasrzbdaj.supabase.co`  
**Git HEAD:** [`6a9f84a`](https://github.com/GamerGuru42/MealPass/commit/6a9f84a446a81ca541a7d1890d7c71d6f736209b)  
**Verification Authority:** NextGen Technologies Database Architecture & Security  

---

## 1. CATALOG METADATA INVENTORY (`pg_proc` & `pg_namespace`)

```sql
SELECT 
    p.proname AS function_name,
    p.proargnames AS argument_names,
    oidvectortypes(p.proargtypes) AS argument_types,
    format_type(p.prorettype, null) AS return_type,
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
```

### Exact Catalog Result Records

| Function Name | `proargnames` | `proargtypes` | `prorettype` | `prosecdef` | `proconfig` | `proacl` | Status |
|---|---|---|---|:---:|---|---|:---:|
| `get_auth_user_role` | `NULL` | *(empty)* | `public.user_role_type` | `true` | `search_path=public, extensions, pg_temp` | `{postgres=X/postgres, service_role=X/postgres, authenticated=X/postgres}` | **VERIFIED LIVE** |
| `get_auth_student_profile_id` | `NULL` | *(empty)* | `uuid` | `true` | `search_path=public, extensions, pg_temp` | `{postgres=X/postgres, service_role=X/postgres, authenticated=X/postgres}` | **VERIFIED LIVE** |
| `get_auth_cafeteria_id` | `NULL` | *(empty)* | `uuid` | `true` | `search_path=public, extensions, pg_temp` | `{postgres=X/postgres, service_role=X/postgres, authenticated=X/postgres}` | **VERIFIED LIVE** |
| `place_mealpass_order` | `{p_student_profile_id, p_cafeteria_id, p_items, p_pin, p_notes, p_idempotency_key}` | `uuid, uuid, jsonb, character varying, text, character varying` | `jsonb` | `true` | `search_path=public, extensions, pg_temp` | `{postgres=X/postgres, service_role=X/postgres, authenticated=X/postgres}` | **VERIFIED LIVE** |
| `allocate_mealpass_funds` | `{p_student_profile_id, p_amount, p_description, p_bank_reference, p_allocated_by_user_id}` | `uuid, numeric, text, character varying, uuid` | `jsonb` | `true` | `search_path=public, extensions, pg_temp` | `{postgres=X/postgres, service_role=X/postgres, authenticated=X/postgres}` | **VERIFIED LIVE** |
| `update_order_status_rpc` | `{p_order_id, p_new_status, p_changed_by, p_reason, p_is_manual}` | `uuid, public.order_status_type, uuid, text, boolean` | `jsonb` | `true` | `search_path=public, extensions, pg_temp` | `{postgres=X/postgres, service_role=X/postgres, authenticated=X/postgres}` | **VERIFIED LIVE** |

---

## 2. COMPARISON ACROSS MIGRATION STAGES

### 2.1 `get_auth_cafeteria_id()`
- **Original Creation (`01_mealpass_production_schema.sql`):**
  Queried `cafeteria_staff` without checking `is_active`.
- **Executed Hardening Migration (`02_production_authorization_hardening.sql`):**
  Added `AND cs.is_active = true` (Invalid: `is_active` does not exist on `cafeteria_staff`).
- **Proposed Repair (`04_repair_direct_rpc_authorization.sql`):**
  Removes `AND cs.is_active = true`. Queries `cafeteria_staff cs JOIN user_profiles up ON up.id = cs.user_profile_id WHERE up.auth_user_id = auth.uid()`.
- **Classification:** **VERIFIED SOURCE ONLY** (Proposed repair resolves live column error).

### 2.2 `place_mealpass_order(...)`
- **Original Creation (`01_mealpass_production_schema.sql`):**
  Inserted into `orders`, `order_items`, `order_status_history`, `ledger_entries`, `idempotency_records`.
- **Executed Hardening Migration (`02_production_authorization_hardening.sql`):**
  - Added student ownership verification `get_auth_student_profile_id() <> p_student_profile_id`.
  - Introduced column mismatches: `sp.pin_hash`, `sp.pin_failed_attempts`, `order_items.item_name_snapshot`, `order_items.unit_price_snapshot`, `order_status_history.from_status`, `order_status_history.to_status`, `idempotency_records.request_hash`, `audit_logs.user_id`, `audit_logs.entity_type`.
- **Proposed Repair (`04_repair_direct_rpc_authorization.sql`):**
  - Preserves student ownership check `get_auth_student_profile_id() <> p_student_profile_id`.
  - Corrects all table and column names to match live schema: `transaction_pin_hash`, `pin_attempts`, `item_name`, `unit_price`, `previous_status`, `new_status`, `is_manual`, `user_profile_id`, `entity_name`, `old_data`, `new_data`.
  - Corrects `idempotency_records` insert to columns `(idempotency_key, response_payload, expires_at)`.
- **Classification:** **VERIFIED SOURCE ONLY** (Proposed repair resolves all 8 runtime column errors).

### 2.3 `allocate_mealpass_funds(...)`
- **Original Creation (`01_mealpass_production_schema.sql`):**
  Role check: `IF auth.jwt() ->> 'role' <> 'service_role' AND auth.uid() IS NOT NULL THEN IF get_auth_user_role() NOT IN (...)`. (Vulnerable to NULL role and NULL `auth.uid()`).
- **Executed Hardening Migration (`02_production_authorization_hardening.sql`):**
  - Role check: `IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN IF auth.uid() IS NULL OR get_auth_user_role() NOT IN ('SUPER_ADMIN', 'FINANCE_ADMIN')`. (Still vulnerable to SQL NULL comparison).
  - Inserted into `bursary_allocations` with non-existent columns `bank_reference`, `created_by`.
- **Proposed Repair (`04_repair_direct_rpc_authorization.sql`):**
  - Implements explicit NULL-safe comparison: `IF COALESCE(public.get_auth_user_role()::text, '') NOT IN ('SUPER_ADMIN', 'FINANCE_ADMIN')`.
  - Resolves authoritative caller profile ID from `auth.uid()` and overrides `p_allocated_by_user_id`.
  - Queries active feeding period `feeding_period_id` from `feeding_periods` to satisfy `NOT NULL REFERENCES feeding_periods(id)` on `bursary_allocations`.
  - Corrects `audit_logs` insert to use `user_profile_id`, `entity_name`, `old_data`, `new_data`.
- **Classification:** **VERIFIED SOURCE ONLY**.

### 2.4 `update_order_status_rpc(...)`
- **Original Creation (`01_mealpass_production_schema.sql`):**
  Role check: `IF auth.jwt() ->> 'role' <> 'service_role' AND auth.uid() IS NOT NULL THEN IF get_auth_user_role() NOT IN (...)`. No cafeteria campus scoping.
- **Executed Hardening Migration (`02_production_authorization_hardening.sql`):**
  - Role check still lacked campus scoping and had column mismatches (`from_status`, `to_status`, `is_manual_override`, `user_id`, `entity_type`).
- **Proposed Repair (`04_repair_direct_rpc_authorization.sql`):**
  - Implements explicit NULL-safe role check: `IF COALESCE(v_caller_role::text, '') NOT IN ('SUPER_ADMIN', 'FINANCE_ADMIN', 'CAFETERIA_HEAD', 'CAFETERIA_STAFF')`.
  - Resolves authoritative caller profile ID from `auth.uid()` to override `p_changed_by`.
  - Enforces cafeteria scope for operators: `IF v_caller_cafeteria_id IS NULL OR v_caller_cafeteria_id <> v_order.cafeteria_id THEN RAISE EXCEPTION 'Unauthorized: Operational authority restricted to assigned cafeteria campus.';`.
  - Restores status-specific timestamps: `accepted_at`, `preparing_at`, `ready_at`, `received_at`, `received_by`, `cancelled_at`, `cancellation_reason`.
  - Corrects `order_status_history` and `audit_logs` columns to live schema names.
- **Classification:** **VERIFIED SOURCE ONLY**.
