# MEALPASS — DIRECT RPC AUTHORIZATION REPAIR REVIEW REPORT
**Review Target:** [`supabase/production/04_repair_direct_rpc_authorization.sql`](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/04_repair_direct_rpc_authorization.sql)  
**Production Project:** `ipdqfejoctltasrzbdaj` (North EU / `eu-north-1`)  
**Git Commit SHA:** [`6a9f84a`](https://github.com/GamerGuru42/MealPass/commit/6a9f84a446a81ca541a7d1890d7c71d6f736209b)  
**Review Type:** Deep Security Definer & Schema Integrity Code Review  

---

## 1. COMPREHENSIVE COMPLIANCE CHECKLIST

| # | Check Item | Evaluation & Evidence | Result |
|:---:|---|---|:---:|
| **1** | **Signature Compatibility** | All 6 function names, argument counts, argument types, argument names, argument defaults, and return types match `pg_proc` exactly. No 42P13 conflicts. | 🟢 **PASS** |
| **2** | **PostgREST Parameter Stability** | PostgREST maps JSON payload keys to PostgreSQL parameter names. Because all argument names (`p_student_profile_id`, `p_cafeteria_id`, `p_items`, `p_pin`, `p_notes`, `p_idempotency_key`, `p_amount`, `p_description`, `p_bank_reference`, `p_allocated_by_user_id`, `p_order_id`, `p_new_status`, `p_changed_by`, `p_reason`, `p_is_manual`) are 100% preserved, API compatibility is guaranteed. | 🟢 **PASS** |
| **3** | **Production Schema Alignment** | Every referenced table and column verified against live database telemetry (`probe-live-columns.mjs`). All 8 column mismatches from hardening migration `02` are corrected. | 🟢 **PASS** |
| **4** | **Foreign Keys & NOT NULL Compliance** | `bursary_allocations` lookup dynamically fetches active `feeding_period_id` from `feeding_periods` and authoritative `allocated_by` from `user_profiles`, satisfying all NOT NULL foreign keys. | 🟢 **PASS** |
| **5** | **SECURITY DEFINER & Search Path** | All 6 functions declare `SECURITY DEFINER` and `SET search_path = public, extensions, pg_temp` explicitly, eliminating search path hijacking vulnerabilities. | 🟢 **PASS** |
| **6** | **Grant & Revocation Continuity** | `CREATE OR REPLACE FUNCTION` preserves existing PostgreSQL ACLs (`{postgres=X/postgres, service_role=X/postgres, authenticated=X/postgres}`). Anonymous and PUBLIC access remain revoked. | 🟢 **PASS** |
| **7** | **Zero Helper Privilege Escalation** | Helper functions accept zero caller arguments and strictly filter on `auth.uid()`, preventing cross-tenant leakage. | 🟢 **PASS** |
| **8** | **Business & Financial Invariant Preservation** | Balance debit atomicity, row locks (`FOR UPDATE`), PIN hashing/lockout, idempotency caching, refund ledger entries, terminal states (`RECEIVED`, `CANCELLED`), and audit logging are 100% preserved. | 🟢 **PASS** |

---

## 2. AUTHORIZATION REQUIREMENTS AUDIT

### 2.1 NULL-Role & Missing Identity Guard
- **Vulnerability in Previous Migration:**
  In PostgreSQL, if `get_auth_user_role()` returns `NULL`, `NULL NOT IN ('SUPER_ADMIN', 'FINANCE_ADMIN')` evaluates to SQL `NULL` (falsy in boolean logic, but NOT `true`). If evaluated as `IF role NOT IN (...)`, the check skips the exception block.
- **Hardened Implementation in `04_repair_direct_rpc_authorization.sql`:**
  ```sql
  IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: Authentication required.';
  END IF;

  SELECT id INTO v_caller_user_profile_id
  FROM public.user_profiles
  WHERE auth_user_id = auth.uid();

  IF v_caller_user_profile_id IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: No user profile found for authenticated identity.';
  END IF;

  v_caller_role := public.get_auth_user_role();
  IF COALESCE(v_caller_role::text, '') NOT IN ('SUPER_ADMIN', 'FINANCE_ADMIN', 'CAFETERIA_HEAD', 'CAFETERIA_STAFF') THEN
      RAISE EXCEPTION 'Unauthorized: Only authorized Cafeteria Staff or Administrators can transition order status.';
  END IF;
  ```
  `COALESCE(v_caller_role::text, '')` converts `NULL` to `''`, ensuring `'' NOT IN (...)` evaluates deterministically to `TRUE`, triggering immediate rejection.

### 2.2 Cafeteria Campus Scope Enforcement
- **Vulnerability in Previous Migration:**
  Operators could transition orders belonging to other campuses via direct RPC because no campus check was performed inside `update_order_status_rpc`.
- **Hardened Implementation in `04_repair_direct_rpc_authorization.sql`:**
  ```sql
  IF v_caller_role IN ('CAFETERIA_HEAD', 'CAFETERIA_STAFF') THEN
      v_caller_cafeteria_id := public.get_auth_cafeteria_id();
      IF v_caller_cafeteria_id IS NULL THEN
          RAISE EXCEPTION 'Unauthorized: No active cafeteria assignment found for this operator account.';
      END IF;
      IF v_caller_cafeteria_id <> v_order.cafeteria_id THEN
          RAISE EXCEPTION 'Unauthorized: Operational authority restricted to assigned cafeteria campus.';
      END IF;
  END IF;
  ```
  Staff and Heads are strictly restricted to their assigned cafeteria. Cross-campus modifications raise an immediate exception.

### 2.3 Identity Parameter Spoofing Prevention
- **Vulnerability in Previous Migration:**
  `p_changed_by` and `p_allocated_by_user_id` were accepted from caller arguments and directly inserted into audit logs, allowing identity forgery.
- **Hardened Implementation in `04_repair_direct_rpc_authorization.sql`:**
  ```sql
  -- Overrides caller-supplied parameters with authoritative identity from auth.uid()
  v_effective_changed_by := v_caller_user_profile_id;
  v_effective_allocated_by := v_caller_user_profile_id;
  ```
  Even if an attacker supplies a forged UUID in the RPC body, the function discards it and records the genuine caller's `user_profile.id`.

### 2.4 Service-Role Isolation
- The trusted server-side Next.js route handlers utilize `createAdminClient()` with `SUPABASE_SERVICE_ROLE_KEY`.
- In PostgREST, tokens signed with the service role key have `auth.jwt() ->> 'role' = 'service_role'`.
- Cryptographically signed: Ordinary authenticated users cannot forge `service_role` because they lack the server's `JWT_SECRET`.
- The clause `IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'` permits backend routes to manage administrative tasks while forcing all direct RPC callers through database-level authorization.

---

## 3. FINANCIAL AND ORDER INVARIANTS AUDIT

1. **Atomic Balance Deduction:**
   - Both `feeding_accounts` and `ledger_entries` are locked using `FOR UPDATE`.
   - Running balance is computed dynamically from the latest ledger row.
   - Solvency check: `IF v_current_balance < v_total_amount THEN RAISE EXCEPTION ...`.
   - Inserts immutable `MEAL_DEDUCTION` ledger entry before committing.
2. **Snapshot Pricing:**
   - Unit prices are fetched from `menu_items` inside the database transaction. Client-supplied price claims are ignored.
3. **PIN Security:**
   - Verified via `crypt(p_pin, sp.transaction_pin_hash)`.
   - Tracks failed attempts in `sp.pin_attempts`. Account locks for 15 minutes upon 3 failures.
4. **Idempotency Records:**
   - Cached responses checked at function entry.
   - Saves completed response into `idempotency_records (idempotency_key, response_payload, expires_at)` with 24-hour expiration.
5. **State Transition Rules & Terminal States:**
   - `RECEIVED` and `CANCELLED` orders are strictly terminal. Status modifications raise exceptions.
   - Valid status transitions update respective timestamps (`accepted_at`, `preparing_at`, `ready_at`, `received_at`, `cancelled_at`).
6. **Automatic Cancellation Refunds:**
   - Transitioning to `CANCELLED` locks feeding account `FOR UPDATE` and appends an immutable `REFUND` ledger entry credited to the student's running balance.
