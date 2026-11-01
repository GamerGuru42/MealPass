# MEALPASS — FINAL EVIDENCE INTEGRITY REVIEW & PRE-MIGRATION GATE AUDIT

**Target Supabase Production Project:** `ipdqfejoctltasrzbdaj` (North EU / `eu-north-1`)  
**Proposed Repair Migration:** [`supabase/production/04_repair_direct_rpc_authorization.sql`](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/04_repair_direct_rpc_authorization.sql)  
**Evaluated Git Commit:** `83a6615` (Pushed to `origin/main`)  
**Prior Git Commit Under Review:** `76339fd`  
**Security Gate Status:** **HOLD — PRE-MIGRATION BLOCKERS IDENTIFIED**

---

## EXECUTIVE SUMMARY

This audit is the definitive evidence integrity review of the MealPass database authorization architecture for Cosmopolitan University prior to executing database repairs or production deployment.

In accordance with strict pre-deployment mandates:
1. **Zero Production Mutations:** No migrations, table alterations, test users, test students, test wallets, or orders were executed against production project `ipdqfejoctltasrzbdaj`.
2. **Zero Vercel Deployments:** No Vercel deployment or production promotion was initiated.
3. **Evidence Integrity Reconciliation:** Testing claims from earlier validation reports have been audited and corrected. Specifically, claims marked as "ISOLATED" were re-evaluated: because local Docker and PostgreSQL services were unavailable and the dev dependency installation of `@electric-sql/pglite` stalled and was canceled, **no isolated PostgreSQL database engine actually executed the test scenarios**. All such claims are now formally reclassified as `VERIFIED SOURCE` or `NOT VERIFIED`. No execution results are fabricated.
4. **Final Gate Recommendation:** **`HOLD AND IDENTIFY THE REMAINING BLOCKERS`**. Controlled execution of [`04_repair_direct_rpc_authorization.sql`](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/04_repair_direct_rpc_authorization.sql) must remain on hold until the operator executes the provided `pg_get_functiondef()` query in the Supabase SQL Editor to capture and record the exact live function bodies.

---

## 1. VERIFY THE LIVE FUNCTION DEFINITIONS

### 1.1 Limitation of Remote Metadata Probing vs. Function Bodies

Live catalog probes conducted via PostgREST and PostgreSQL error reflections verified that the six RPC functions exist on production `ipdqfejoctltasrzbdaj` with:
- Exact argument types matching expected signatures.
- Return types matching expected signatures (resolving PostgreSQL error `42P13`).
- `prosecdef = true` (SECURITY DEFINER active).
- `proconfig = {search_path=public,pg_temp}` (Fixed search path active).
- Anonymous execution revoked (`HTTP 401 / 42501`).

However, **PostgREST does not expose `pg_get_functiondef()`**. While `pg_proc` metadata proves the outer interface and configuration, it **does not prove the internal AST or PL/pgSQL body statements** currently active inside PostgreSQL on production. Merely having matching metadata does not constitute proof of the internal logic.

Therefore, the live function body comparison is strictly classified as **`NOT VERIFIED (PENDING SQL EDITOR OUTPUT)`** until the operator manually runs the query below in the Supabase SQL Editor.

### 1.2 Supabase SQL Editor Query Script

The operator must execute the following read-only SQL script in the Supabase SQL Editor for project `ipdqfejoctltasrzbdaj`:

```sql
-- ====================================================================
-- MEALPASS: RETRIEVE LIVE FUNCTION DEFINITIONS (READ-ONLY AUDIT)
-- Project: ipdqfejoctltasrzbdaj
-- ====================================================================

SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS argument_signature,
    pg_get_function_result(p.oid) AS return_type,
    p.prosecdef AS is_security_definer,
    p.proconfig AS search_path_config,
    pg_get_functiondef(p.oid) AS complete_function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
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

### 1.3 4-Way Comparative Analysis

The table below documents the 4-way comparison across all six functions:
- **Def 1:** Actual Live Definition (on production `ipdqfejoctltasrzbdaj`) — Status: `NOT VERIFIED (PENDING SQL EDITOR OUTPUT)`.
- **Def 2:** Original Production Schema ([`01_mealpass_production_schema.sql`](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/01_mealpass_production_schema.sql)) — Status: `VERIFIED SOURCE`.
- **Def 3:** Hardening Migration ([`02_production_authorization_hardening.sql`](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/02_production_authorization_hardening.sql)) — Status: `VERIFIED SOURCE`.
- **Def 4:** Proposed Repair ([`04_repair_direct_rpc_authorization.sql`](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/04_repair_direct_rpc_authorization.sql)) — Status: `VERIFIED SOURCE`.

```
====================================================================================================
FUNCTION 1: public.get_auth_user_role()
====================================================================================================
- Def 1 (Live Production): Pending manual SQL Editor output. (NOT VERIFIED)
- Def 2 (01 Schema): Returned TEXT via `COALESCE(role::text, 'ANONYMOUS')`.
- Def 3 (02 Hardening): Attempted `RETURNS public.user_role_type` (failed with 42P13 return type clash).
- Def 4 (04 Repair): `RETURNS public.user_role_type`. Queries `user_profiles.role` WHERE `auth_user_id = auth.uid()` and `is_active = true`. Returns NULL if user inactive or not found.
- Source Comparison: Def 4 aligns with Def 3 return type while ensuring only active user accounts return a valid role.

====================================================================================================
FUNCTION 2: public.get_auth_student_profile_id()
====================================================================================================
- Def 1 (Live Production): Pending manual SQL Editor output. (NOT VERIFIED)
- Def 2 (01 Schema): Queries `student_profiles sp` JOIN `user_profiles up` WHERE `up.auth_user_id = auth.uid()`.
- Def 3 (02 Hardening): Identical lookup, added SECURITY DEFINER and search_path.
- Def 4 (04 Repair): Preserved identical lookup, SECURITY DEFINER, search_path, and returns UUID.
- Source Comparison: Fully aligned across Def 2, 3, and 4.

====================================================================================================
FUNCTION 3: public.get_auth_cafeteria_id()
====================================================================================================
- Def 1 (Live Production): Pending manual SQL Editor output. (NOT VERIFIED)
- Def 2 (01 Schema): `SELECT cafeteria_id FROM cafeteria_staff cs JOIN user_profiles up ON up.id = cs.user_profile_id WHERE up.auth_user_id = auth.uid()`.
- Def 3 (02 Hardening): Added `AND cs.is_active = true` (BUG: `cs.is_active` does NOT exist in production schema, causing runtime error 42703).
- Def 4 (04 Repair): REMOVED `cs.is_active`. Added `JOIN cafeterias c ON c.id = cs.cafeteria_id`. Added checks: `up.is_active = true`, `c.is_active = true`, and `up.role IN ('CAFETERIA_STAFF', 'CAFETERIA_HEAD')`.
- Source Comparison: Def 4 fixes Def 3 schema mismatch and prevents stale operator access if staff account or cafeteria is inactive.

====================================================================================================
FUNCTION 4: public.place_mealpass_order(p_student_id UUID, p_cafeteria_id UUID, p_order_items JSONB, p_order_type VARCHAR, p_notes TEXT, p_idempotency_key VARCHAR)
====================================================================================================
- Def 1 (Live Production): Pending manual SQL Editor output. (NOT VERIFIED)
- Def 2 (01 Schema): Checked role = 'STUDENT', matched `p_student_id`, locked feeding account FOR UPDATE, inserted order and order_items.
- Def 3 (02 Hardening): Introduced 7 column mismatches: `sp.pin_hash`, `sp.pin_failed_attempts`, `order_items.item_name_snapshot`, `order_items.unit_price_snapshot`, `order_status_history.from_status/to_status/is_manual_override`, `idempotency_records.request_hash`, `audit_logs.user_id/entity_type/old_values/new_values`, and `orders.special_instructions`.
- Def 4 (04 Repair): Reconciled all 7 column references to match live schema: `sp.transaction_pin_hash`, `sp.pin_attempts`, `order_items.item_name`, `order_items.unit_price`, `order_status_history.previous_status/new_status/is_manual`, `orders.notes`, and live `audit_logs` columns. Preserved student ownership enforcement and balance locking.
- Source Comparison: Def 4 restores schema compatibility while keeping zero-trust authorization.

====================================================================================================
FUNCTION 5: public.allocate_mealpass_funds(p_student_id UUID, p_amount NUMERIC, p_description TEXT, p_allocation_type VARCHAR, p_allocated_by UUID)
====================================================================================================
- Def 1 (Live Production): Pending manual SQL Editor output. (NOT VERIFIED)
- Def 2 (01 Schema): Checked role IN ('SUPER_ADMIN', 'FINANCE_ADMIN'), locked feeding account FOR UPDATE, inserted ledger entry. Did not populate `bursary_allocations`.
- Def 3 (02 Hardening): Added `bursary_allocations` insert with `LIMIT 1` on `feeding_periods`. Used caller-supplied `p_allocated_by`. Role check used `IF v_caller_role NOT IN (...)` (vulnerable to NULL-role bypass).
- Def 4 (04 Repair): 
  - Fixed NULL-role bypass: `IF COALESCE(public.get_auth_user_role()::text, '') NOT IN ('SUPER_ADMIN', 'FINANCE_ADMIN')`.
  - Authoritative attribution: overrides `p_allocated_by` with `v_caller_user_profile_id` derived from `auth.uid()`.
  - Strict feeding period validation: counts active periods. Fails closed (`RAISE EXCEPTION`) if count is 0 or >1.
  - Concurrency safety: acquires `FOR SHARE` lock on `feeding_periods`.
  - Inserts `bursary_allocations`, immutable ledger entry, and live-schema `audit_logs`.
- Source Comparison: Def 4 eliminates NULL-role bypass, spoofed attribution, and academic session ambiguity.

====================================================================================================
FUNCTION 6: public.update_order_status_rpc(p_order_id UUID, p_new_status public.order_status_type, p_changed_by UUID, p_notes TEXT, p_is_manual BOOLEAN)
====================================================================================================
- Def 1 (Live Production): Pending manual SQL Editor output. (NOT VERIFIED)
- Def 2 (01 Schema): Role check for staff/admin. Did NOT enforce cafeteria ownership. Used caller-supplied `p_changed_by`.
- Def 3 (02 Hardening): Checked role IN ('SUPER_ADMIN', 'FINANCE_ADMIN', 'CAFETERIA_HEAD', 'CAFETERIA_STAFF'). Did NOT verify whether staff was assigned to the order's cafeteria. Used caller-supplied `p_changed_by`. Column mismatches in `order_status_history` and `audit_logs`.
- Def 4 (04 Repair):
  - Fixed NULL-role bypass: `COALESCE(v_caller_role::text, '') NOT IN (...)`.
  - Authoritative attribution: overrides `p_changed_by` with `v_caller_user_profile_id` from `auth.uid()`.
  - Cafeteria ownership enforcement: retrieves caller's assigned cafeteria via `public.get_auth_cafeteria_id()`. If caller is CAFETERIA_STAFF or CAFETERIA_HEAD, enforces `v_order_cafeteria_id = v_caller_cafeteria_id`; fails closed with `42501` exception if mismatched.
  - Auto-refund: on `CANCELLED` status, acquires `FOR UPDATE` on `feeding_accounts`, appends `REFUND` ledger entry, and restores student balance.
  - Schema alignment: corrects columns for `order_status_history` and `audit_logs`.
- Source Comparison: Def 4 closes the major cross-cafeteria status tampering vulnerability and identity spoofing.
```

---

## 2. RECONCILE THE ISOLATED TESTING CLAIMS

### 2.1 Transparent Execution Audit

A review of the conversation trajectory and execution logs reveals the following facts:

1. **Host Environment Checks:**
   - Docker daemon was checked via shell command; Docker was not installed or running.
   - Local PostgreSQL server on `localhost:5432` was checked; no local instance was listening.
2. **Attempted In-Process Database Installation:**
   - On 2026-11-01, an attempt was made to install `@electric-sql/pglite` as a dev dependency via `cmd.exe /c npm install --save-dev @electric-sql/pglite`.
   - The task (`task-5346`) stalled/hung without making network progress.
   - The task was terminated (`manage_task kill`), and `package.json` and `package-lock.json` were restored.
3. **Reality of Previous "ISOLATED" Claims:**
   - The scenarios marked in earlier documents as `TESTED IN ISOLATED DATABASE` or `EXECUTED ISOLATED` were **NOT executed against an isolated PostgreSQL-compatible engine**.
   - Those results represented **static code reviews, manual logic walkthroughs, and Next.js TypeScript mock unit tests**, NOT empirical execution inside a real PostgreSQL engine executing `04_repair_direct_rpc_authorization.sql`.

### 2.2 Formal Parameters of Execution Reality

To uphold strict evidence integrity:

| Parameter | Actual Recorded Value |
|---|---|
| **Database Engine & Version** | **None executed** (Docker unavailable; local PostgreSQL absent; PGlite installation canceled) |
| **Database Initialization Command** | **N/A** (No engine started) |
| **Schema Initialization Source** | **N/A** (No database initialized) |
| **Test Command for Each Scenario** | **N/A** (Only Next.js Jest/Vitest mock tests ran; no database SQL runner executed) |
| **Raw Database Execution Output** | **N/A** |
| **Test Database Connection Target** | **N/A** |

### 2.3 Correction and Reclassification

All claims in earlier reports asserting isolated database execution are formally **RECLASSIFIED**:

- **Bypass Scenario 1 (NULL-role bypass):** Reclassified to **`VERIFIED SOURCE`** (proven via PostgreSQL three-valued logic rule: `NULL NOT IN (...)` evaluates to `NULL`, whereas `COALESCE(NULL, '') NOT IN (...)` evaluates to `TRUE`, guaranteeing fail-closed branch execution).
- **Bypass Scenario 2 (Attribution spoofing):** Reclassified to **`VERIFIED SOURCE`** (proven via SQL code review: `v_effective_changed_by := v_caller_user_profile_id;` completely discards `p_changed_by`).
- **Bypass Scenario 3 (Cross-cafeteria status tampering):** Reclassified to **`VERIFIED SOURCE`** (proven via SQL code review: `IF v_caller_role IN (...) AND v_caller_cafeteria_id <> v_order_cafeteria_id THEN RAISE EXCEPTION ...`).
- **Bypass Scenario 4 (Ambiguous feeding period):** Reclassified to **`VERIFIED SOURCE`** (proven via SQL count check: `IF v_active_period_count <> 1 THEN RAISE EXCEPTION ...`).
- **Empirical Column Availability:** Classified as **`VERIFIED LIVE`** (proven via live HTTP probing against `https://ipdqfejoctltasrzbdaj.supabase.co/rest/v1/`).

---

## 3. REVIEW FEEDING-PERIOD ALLOCATION SAFETY

### 3.1 Function Implementation Inspection

In [`supabase/production/04_repair_direct_rpc_authorization.sql`](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/04_repair_direct_rpc_authorization.sql), the feeding-period resolution inside `allocate_mealpass_funds()` is implemented as follows:

```sql
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
```

### 3.2 Evaluation of Specific Scenarios

#### Scenario A: Zero Active Feeding Periods
- **Condition:** No row in `public.feeding_periods` has `university_id = v_university_id AND is_active = true`.
- **Behavior:** `v_active_period_count = 0`.
- **Result:** Execution reaches `IF v_active_period_count = 0 THEN RAISE EXCEPTION ...`.
- **Integrity Guarantee:** The transaction terminates immediately and rolls back. No balance is modified, no ledger entry is written, and no orphaned or invalid bursary allocation is created. **Fails closed.**

#### Scenario B: Exactly One Active Feeding Period
- **Condition:** Exactly one row exists with `is_active = true` for the student's university.
- **Behavior:** `v_active_period_count = 1`, and `v_feeding_period_id` is assigned that row's UUID.
- **Locking:** `PERFORM 1 ... FOR SHARE` places a shared lock on the feeding period row, preventing any concurrent transaction from updating or deactivating the period while this transaction is active.
- **Integrity Guarantee:** `bursary_allocations` record is inserted with valid non-null foreign key `feeding_period_id`. The immutable ledger entry is written, and the feeding account balance is updated. **Succeeds atomically.**

#### Scenario C: Multiple Active Feeding Periods
- **Production Schema Inspection:** Table `public.feeding_periods` (defined in `01_mealpass_production_schema.sql` L160-169) does **not** define a unique constraint or partial unique index on `(university_id) WHERE (is_active = true)`.
- **Risk:** Without application or database constraints, administrative error could cause two academic semesters to be simultaneously marked `is_active = true`.
- **Old Behavior (02 Migration):** Migration `02` used `LIMIT 1`, which non-deterministically selected an arbitrary period.
- **New Behavior (04 Repair):** `v_active_period_count > 1`. Execution reaches `IF v_active_period_count > 1 THEN RAISE EXCEPTION ...`.
- **Integrity Guarantee:** The transaction fails closed immediately, rejecting funds allocation until university administrators resolve the ambiguity. **Fails closed.**

#### Scenario D: Concurrent Allocation Attempts
- **Condition:** Multiple administrators or API requests attempt to allocate funds to the same student or multiple students simultaneously.
- **Per-Student Concurrency:** Serialized by the wallet lock:
  ```sql
  SELECT id, university_id INTO v_feeding_account_id, v_university_id 
  FROM public.feeding_accounts 
  WHERE student_id = p_student_id 
  FOR UPDATE;
  ```
  Any concurrent transaction attempting to allocate to or spend from the same student account blocks until the active transaction commits or rolls back.
- **Cross-Student Concurrency:** Concurrent allocations to different students each acquire `FOR SHARE` on the active `feeding_periods` row. PostgreSQL permits multiple simultaneous `FOR SHARE` locks on the same row, enabling high-throughput parallel allocations without deadlocks.

#### Scenario E: Feeding Period Deactivation During Allocation
- **Condition:** An administrator attempts to execute `UPDATE feeding_periods SET is_active = false WHERE id = ...` while an allocation is executing.
- **Behavior:** The admin's `UPDATE` statement requires an exclusive row lock (`FOR UPDATE`). Because the in-flight allocation holds `FOR SHARE`, the deactivation waits until the allocation completes and commits.
- **Reverse Timing:** If the deactivation transaction commits *before* the allocation's `SELECT COUNT(*)`, the allocation query reads `is_active = true` as 0 rows and immediately fails closed with an exception.
- **Integrity Guarantee:** Zero window exists for allocating funds under a deactivated academic period.

---

## 4. REVIEW CAFETERIA STAFF REVOCATION

### 4.1 Schema Investigation: Table `cafeteria_staff`

Empirical probing of live production catalogs (`https://ipdqfejoctltasrzbdaj.supabase.co/rest/v1/cafeteria_staff?select=is_active`) confirmed:
- `HTTP 400 Bad Request: column cafeteria_staff.is_active does not exist (PostgreSQL 42703)`.
- The live table schema strictly matches `01_mealpass_production_schema.sql` L172-180:
  ```sql
  CREATE TABLE IF NOT EXISTS public.cafeteria_staff (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
      cafeteria_id UUID NOT NULL REFERENCES public.cafeterias(id) ON DELETE CASCADE,
      university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
      role_in_cafeteria VARCHAR(50) DEFAULT 'STAFF',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_profile_id, cafeteria_id)
  );
  ```

### 4.2 Mechanisms of Operator Access Revocation

In the production database architecture, cafeteria operator access is revoked through four distinct mechanisms:

1. **Assignment Deletion:**
   - Removing the staff member from the cafeteria via `DELETE FROM public.cafeteria_staff WHERE user_profile_id = ... AND cafeteria_id = ...`.
   - Result: `get_auth_cafeteria_id()` query finds 0 rows and returns `NULL`.
2. **User Account Suspension:**
   - Setting `user_profiles.is_active = false` (e.g. employee termination or lockout).
   - In [`04_repair_direct_rpc_authorization.sql`](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/04_repair_direct_rpc_authorization.sql), `get_auth_cafeteria_id()` joins `user_profiles up` with `up.is_active = true`.
   - Result: Deactivated operator returns `NULL`.
3. **Cafeteria Closure / Inactivation:**
   - Setting `cafeterias.is_active = false` (e.g. cafeteria renovation, summer closure, contract termination).
   - In [`04_repair_direct_rpc_authorization.sql`](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/04_repair_direct_rpc_authorization.sql), `get_auth_cafeteria_id()` joins `cafeterias c` with `c.is_active = true`.
   - Result: Operators assigned to an inactive cafeteria return `NULL`.
4. **Role Change / Demotion:**
   - If an operator's role in `user_profiles.role` is changed to `STUDENT` or revoked, `get_auth_cafeteria_id()` enforces `up.role IN ('CAFETERIA_STAFF', 'CAFETERIA_HEAD')`.
   - Result: Demoted operator returns `NULL`.

### 4.3 Implementation in Proposed Repair

```sql
CREATE OR REPLACE FUNCTION public.get_auth_cafeteria_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
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
```

### 4.4 Verification of Downstream Authorization Impact

When `get_auth_cafeteria_id()` returns `NULL`:
- **RLS Policy on `orders`:** `cafeteria_id = public.get_auth_cafeteria_id()` evaluates to `cafeteria_id = NULL` (UNKNOWN/false in SQL). The revoked operator cannot read any orders.
- **RLS Policy on `order_items`:** Evaluates to false. The revoked operator cannot read order details.
- **RPC `update_order_status_rpc`:**
  ```sql
  v_caller_cafeteria_id := public.get_auth_cafeteria_id();
  IF v_caller_role IN ('CAFETERIA_HEAD', 'CAFETERIA_STAFF') THEN
      IF v_caller_cafeteria_id IS NULL OR v_caller_cafeteria_id <> v_order_cafeteria_id THEN
          RAISE EXCEPTION 'Unauthorized: Cafeteria staff can only update orders for their assigned cafeteria.';
      END IF;
  END IF;
  ```
  The function fails closed with an `Unauthorized` exception.

**Conclusion:** Removing `cs.is_active` does not grant access to revoked or stale cafeteria staff. Security is strictly preserved without altering the production schema.

---

## 5. VERIFY THE COMPLETE REPAIR SCRIPT

The complete script [`supabase/production/04_repair_direct_rpc_authorization.sql`](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/04_repair_direct_rpc_authorization.sql) (commit `83a6615`) was audited against all authorization, financial, and schema requirements:

| Checkpoint | Status | Analysis / Evidence |
|---|---|---|
| **Exact Function Signatures** | **PASS** | Matches live PostgreSQL catalog signatures for all 6 routines. Return type `public.user_role_type` preserved. |
| **Grants & Revocations** | **PASS** | `REVOKE ALL FROM PUBLIC;` and `GRANT EXECUTE TO authenticated, service_role;` applied to all 6 routines. |
| **SECURITY DEFINER** | **PASS** | Explicitly declared on all 6 routines. |
| **Fixed Search Path** | **PASS** | `SET search_path = public, pg_temp` explicitly configured on all 6 routines. |
| **NULL-Safe Role Checks** | **PASS** | Uses `COALESCE(public.get_auth_user_role()::text, '') NOT IN (...)` in `allocate_mealpass_funds` and `update_order_status_rpc`. |
| **Student Ownership Enforcement** | **PASS** | `place_mealpass_order` enforces `p_student_id = v_auth_student_id`. |
| **Cafeteria Ownership Enforcement** | **PASS** | `update_order_status_rpc` enforces `v_order_cafeteria_id = v_caller_cafeteria_id` for cafeteria staff and heads. |
| **Authoritative Identity Attribution** | **PASS** | Overrides caller-supplied `p_changed_by` and `p_allocated_by` with `auth.uid()` lookup from `user_profiles`. |
| **All Production Column Names** | **PASS** | Uses `transaction_pin_hash`, `pin_attempts`, `item_name`, `unit_price`, `previous_status`, `new_status`, `is_manual`, `user_profile_id`, `entity_name`, `old_data`, `new_data`. |
| **Foreign Keys & NOT NULL** | **PASS** | Guarantees non-null `feeding_period_id` in `bursary_allocations`. Satisfies all schema FKs. |
| **Balance Locking** | **PASS** | `SELECT ... FOR UPDATE` on `feeding_accounts` in order placement, funds allocation, and cancellation refunds. |
| **Idempotency** | **PASS** | `idempotency_records` queried and written without referencing non-existent `request_hash`. |
| **PIN Lockout** | **PASS** | Increments `pin_attempts`; locks student account at $\ge 3$ attempts (`is_pin_locked = true`). |
| **Cancellation & Refund Integrity** | **PASS** | When transitioning to `CANCELLED`, locks wallet `FOR UPDATE`, appends `REFUND` ledger entry, updates running balance. |
| **Audit Logging** | **PASS** | Writes to `audit_logs` using live production column names and authoritative user profile IDs. |
| **Order State Transitions** | **PASS** | Validates legal state machine transitions (`PENDING` $\to$ `CONFIRMED` $\to$ `PREPARING` $\to$ `READY_FOR_PICKUP` $\to$ `COMPLETED`). |
| **No Accidental Weakening** | **PASS** | Direct RPC calls from `authenticated` users fail closed if role, student profile, or cafeteria assignment is missing. |

---

## 6. COMPREHENSIVE EVIDENCE TABLE

The table below catalogs every critical requirement, the audit method used, and the verified evidence classification:
- **`VERIFIED LIVE`:** Supported by actual production database catalog output.
- **`VERIFIED SOURCE`:** Supported by comprehensive source code inspection.
- **`EXECUTED ISOLATED`:** Actually executed against an identified isolated database engine.
- **`NOT VERIFIED`:** Empirical evidence currently unavailable.
- **`FAILED`:** Demonstrated test or security failure.

| Target Item | Category | Evidence Source | Classification |
|---|---|---|---|
| Function OIDs & Existence | Schema | Production `pg_proc` via PostgREST probes | **`VERIFIED LIVE`** |
| Function Signatures & Types | Schema | Production `pg_proc` via PostgREST probes | **`VERIFIED LIVE`** |
| `prosecdef = true` | Security | Production `pg_proc` via PostgREST probes | **`VERIFIED LIVE`** |
| `proconfig` search path | Security | Production `pg_proc` via PostgREST probes | **`VERIFIED LIVE`** |
| Anon EXECUTE Revocation | Security | Production HTTP 401 / 42501 responses | **`VERIFIED LIVE`** |
| Table Columns (8 Mismatches) | Schema | Production HTTP 400 (42703) live column probes | **`VERIFIED LIVE`** |
| Complete Live Function Bodies | Schema | Requires manual `pg_get_functiondef()` execution | **`NOT VERIFIED (PENDING SQL EDITOR)`** |
| Isolated DB Execution of 04 Repair | Testing | Execution log audit (stalled PGlite task killed) | **`NOT VERIFIED (NO ENGINE EXECUTED)`** |
| NULL-Safe Role Logic | Authorization | `04_repair` SQL review (`COALESCE` three-valued logic) | **`VERIFIED SOURCE`** |
| Identity Attribution Override | Authorization | `04_repair` SQL review (`auth.uid()` derivation) | **`VERIFIED SOURCE`** |
| Cafeteria Scope Enforcement | Authorization | `04_repair` SQL review (`v_caller_cafeteria_id` check) | **`VERIFIED SOURCE`** |
| Feeding Period Fail-Closed Check | Financial | `04_repair` SQL review (`v_active_period_count <> 1`) | **`VERIFIED SOURCE`** |
| Feeding Period Concurrency Lock | Financial | `04_repair` SQL review (`PERFORM ... FOR SHARE`) | **`VERIFIED SOURCE`** |
| Cafeteria Staff Revocation Logic | Authorization | `04_repair` SQL review (`up.is_active`, `c.is_active`, role) | **`VERIFIED SOURCE`** |
| Automatic Order Refund Logic | Financial | `04_repair` SQL review (`REFUND` ledger & wallet update) | **`VERIFIED SOURCE`** |
| Next.js API Server Auth Fail-Closed | Application | `src/lib/auth/server-auth.ts` source inspection | **`VERIFIED SOURCE`** |
| Next.js Mock Authorization Suite | Application | Unit tests with mock Supabase client (`npm test`) | **`VERIFIED SOURCE`** |

---

## 7. FINAL DECISION & REMAINING BLOCKERS

### Recommendation: **`HOLD AND IDENTIFY THE REMAINING BLOCKERS`**

While the proposed repair script [`supabase/production/04_repair_direct_rpc_authorization.sql`](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/04_repair_direct_rpc_authorization.sql) has been thoroughly verified at the source level and successfully reconciles all live production schema mismatches, **production migration and Vercel deployment must remain on HOLD**.

### Remaining Blockers Before Production Migration:

1. **Blocker 1: Live Function Definition Baseline (Operator SQL Editor Execution)**
   - *Requirement:* The operator must run the read-only SQL script in Section 1.2 in the Supabase SQL Editor (`ipdqfejoctltasrzbdaj`).
   - *Purpose:* Capture the exact text returned by `pg_get_functiondef()` for all six functions, establishing an empirical baseline before replacing them.
2. **Blocker 2: Controlled Execution of `04_repair_direct_rpc_authorization.sql`**
   - *Requirement:* Once Blocker 1 is recorded, the operator must execute [`supabase/production/04_repair_direct_rpc_authorization.sql`](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/04_repair_direct_rpc_authorization.sql) in the Supabase SQL Editor.
   - *Purpose:* Apply the repaired direct-RPC authorization logic, fixing column mismatches and closing the direct-RPC bypass vulnerabilities.
3. **Blocker 3: Post-Migration Live Function Verification**
   - *Requirement:* After execution of Blocker 2, rerun Section 1.2 query to verify that the live bodies match `04_repair` and perform an authenticated test call with a real test identity to confirm that direct RPC calls succeed for authorized operations and fail closed for unauthorized attempts.

---
*Report synchronized with Git commit `83a6615`.*
