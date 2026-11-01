# MEALPASS — PRODUCTION LIVE SCHEMA VERIFICATION REPORT
**Target Project:** `MealPass Production` (`ipdqfejoctltasrzbdaj`)  
**Region:** North EU (Stockholm) / `eu-north-1`  
**Endpoint:** `https://ipdqfejoctltasrzbdaj.supabase.co`  
**Inspection Commit:** [`6a9f84a`](https://github.com/GamerGuru42/MealPass/commit/6a9f84a446a81ca541a7d1890d7c71d6f736209b)  
**Audit Mode:** Strictly Read-Only (Zero Database Mutations, Zero Test Records)  

---

## 1. EXECUTIVE SUMMARY & VERIFICATION METHODOLOGY

This audit establishes the **exact, empirical truth** of the live production database schema on `ipdqfejoctltasrzbdaj`. 

To eliminate all speculation between development migration files and production initialization scripts, a **direct HTTP column probe** was executed via [`scripts/probe-live-columns.mjs`](file:///C:/Users/biduo/OneDrive/Documents/MealPass/scripts/probe-live-columns.mjs). PostgREST performs query planning and column validation at the PostgreSQL catalog level prior to RLS execution:
- When a requested column **exists**, PostgREST accepts the column (returning `HTTP 200` with data or `HTTP 401` if anonymous SELECT is restricted by RLS).
- When a column **does not exist**, PostgreSQL catalog resolution fails immediately, returning **`HTTP 400`** with PostgreSQL Error **`42703 (column <table_name>.<column_name> does not exist)`**.

### Definitive Finding:
The live production database on `ipdqfejoctltasrzbdaj` was initialized strictly from [`01_mealpass_production_schema.sql`](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/01_mealpass_production_schema.sql). The subsequent hardening migration [`02_production_authorization_hardening.sql`](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/02_production_authorization_hardening.sql) was written against development column conventions, introducing **8 severe runtime column mismatches** inside the function bodies.

---

## 2. TABLE-BY-TABLE LIVE SCHEMA CATALOG & EMPIRICAL PROBE RESULTS

### 2.1 Table: `cafeteria_staff`
- **Schema Source:** [`01_mealpass_production_schema.sql` lines 172–180](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/01_mealpass_production_schema.sql#L172-L180)
- **Primary Key:** `id UUID` (DEFAULT `gen_random_uuid()`)
- **Foreign Keys:**
  - `user_profile_id` $\to$ `public.user_profiles(id) ON DELETE CASCADE`
  - `cafeteria_id` $\to$ `public.cafeterias(id) ON DELETE CASCADE`
  - `university_id` $\to$ `public.universities(id) ON DELETE RESTRICT`
- **Unique Constraint:** `uq_staff_cafeteria_user (cafeteria_id, user_profile_id)`

#### Column Probe Results
| Column Name | Live Data Type | Nullable | Default | Live Probe Status | Verification Classification |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `user_profile_id` | `UUID` | NO | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `cafeteria_id` | `UUID` | NO | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `university_id` | `UUID` | NO | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `role_in_cafeteria`| `cafeteria_staff_role` | NO | `'STAFF'` | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `created_at` | `TIMESTAMPTZ` | YES | `NOW()` | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| *`is_active`* | N/A | — | — | **`42703 (DOES NOT EXIST)`** | **VERIFIED LIVE (MISSING)** |
| *`assigned_at`* | N/A | — | — | **`42703 (DOES NOT EXIST)`** | **VERIFIED LIVE (MISSING)** |

> **Critical Note:** `get_auth_cafeteria_id()` in `02_production_authorization_hardening.sql` referenced `cs.is_active = true`. This column **does not exist** on production and must be removed.

---

### 2.2 Table: `user_profiles`
- **Schema Source:** [`01_mealpass_production_schema.sql` lines 106–125](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/01_mealpass_production_schema.sql#L106-L125)
- **Primary Key:** `id UUID` (DEFAULT `gen_random_uuid()`)
- **Foreign Keys:**
  - `auth_user_id` $\to$ `auth.users(id) ON DELETE CASCADE` (UNIQUE)
  - `university_id` $\to$ `public.universities(id) ON DELETE RESTRICT`
- **Unique Constraint:** `uq_user_profiles_university_email (university_id, email)`

#### Column Probe Results
| Column Name | Live Data Type | Nullable | Default | Live Probe Status | Verification Classification |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `auth_user_id` | `UUID` | YES | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `university_id` | `UUID` | NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `email` | `VARCHAR(255)` | NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `first_name` | `VARCHAR(100)` | NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `last_name` | `VARCHAR(100)` | NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `phone` | `VARCHAR(50)` | YES | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `avatar_url` | `TEXT` | YES | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `role` | `user_role_type`| NO | `'STUDENT'` | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `is_active` | `BOOLEAN` | YES | `true` | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `created_at` | `TIMESTAMPTZ` | YES | `NOW()` | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `updated_at` | `TIMESTAMPTZ` | YES | `NOW()` | `401 Protected` (EXISTS) | **VERIFIED LIVE** |

---

### 2.3 Table: `student_profiles`
- **Schema Source:** [`01_mealpass_production_schema.sql` lines 127–146](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/01_mealpass_production_schema.sql#L127-L146)
- **Primary Key:** `id UUID` (DEFAULT `gen_random_uuid()`)
- **Foreign Keys:**
  - `user_profile_id` $\to$ `public.user_profiles(id) ON DELETE CASCADE` (UNIQUE)
  - `university_id` $\to$ `public.universities(id) ON DELETE RESTRICT`
- **Unique Constraint:** `uq_student_profiles_matric (university_id, matric_number)`

#### Column Probe Results
| Column Name | Live Data Type | Nullable | Default | Live Probe Status | Verification Classification |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `user_profile_id` | `UUID` | NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `university_id` | `UUID` | NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `matric_number` | `VARCHAR(100)` | NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `department` | `VARCHAR(150)` | YES | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `faculty` | `VARCHAR(150)` | YES | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `level` | `VARCHAR(50)` | YES | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `transaction_pin_hash`| `VARCHAR(255)`| YES | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| *`pin_hash`* | N/A | — | — | **`42703 (DOES NOT EXIST)`** | **VERIFIED LIVE (MISSING)** |
| `pin_attempts` | `INT` | YES | `0` | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| *`pin_failed_attempts`*| N/A | — | — | **`42703 (DOES NOT EXIST)`** | **VERIFIED LIVE (MISSING)** |
| `pin_locked_until` | `TIMESTAMPTZ`| YES | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `is_feeding_active` | `BOOLEAN` | YES | `true` | `401 Protected` (EXISTS) | **VERIFIED LIVE** |

> **Critical Note:** The live column is `transaction_pin_hash`, NOT `pin_hash`. The live attempt counter is `pin_attempts`, NOT `pin_failed_attempts`.

---

### 2.4 Table: `orders`
- **Schema Source:** [`01_mealpass_production_schema.sql` lines 228–256](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/01_mealpass_production_schema.sql#L228-L256)
- **Primary Key:** `id UUID` (DEFAULT `gen_random_uuid()`)
- **Foreign Keys:**
  - `university_id` $\to$ `public.universities(id) ON DELETE RESTRICT`
  - `cafeteria_id` $\to$ `public.cafeterias(id) ON DELETE RESTRICT`
  - `student_profile_id` $\to$ `public.student_profiles(id) ON DELETE RESTRICT`
  - `received_by` $\to$ `public.user_profiles(id) ON DELETE SET NULL`
- **Unique Constraints:** `order_number`, `pickup_code`, `pickup_qr_token`

#### Column Probe Results
| Column Name | Live Data Type | Nullable | Default | Live Probe Status | Verification Classification |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `university_id` | `UUID` | NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `cafeteria_id` | `UUID` | NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `student_profile_id` | `UUID` | NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `order_number` | `VARCHAR(100)` | NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `pickup_code` | `VARCHAR(20)` | NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `pickup_qr_token` | `VARCHAR(255)` | NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `status` | `order_status_type`| NO | `'PLACED'` | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `total_amount` | `NUMERIC(12, 2)`| NO | None (CHECK > 0)| `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `notes` | `TEXT` | YES | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| *`special_instructions`*| N/A | — | — | **`42703 (DOES NOT EXIST)`** | **VERIFIED LIVE (MISSING)** |
| *`idempotency_key`* | N/A | — | — | **`42703 (DOES NOT EXIST)`** | **VERIFIED LIVE (MISSING)** |
| `placed_at` | `TIMESTAMPTZ` | YES | `NOW()` | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `accepted_at` | `TIMESTAMPTZ` | YES | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `preparing_at` | `TIMESTAMPTZ` | YES | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `ready_at` | `TIMESTAMPTZ` | YES | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `received_at` | `TIMESTAMPTZ` | YES | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `received_by` | `UUID` | YES | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `cancelled_at` | `TIMESTAMPTZ` | YES | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `cancellation_reason` | `TEXT` | YES | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `created_at` | `TIMESTAMPTZ` | YES | `NOW()` | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `updated_at` | `TIMESTAMPTZ` | YES | `NOW()` | `401 Protected` (EXISTS) | **VERIFIED LIVE** |

> **Critical Note:** The live `orders` table has `notes` (NOT `special_instructions`). It does **not** have an `idempotency_key` column (idempotency is managed via `idempotency_records`).

---

### 2.5 Table: `order_items`
- **Schema Source:** [`01_mealpass_production_schema.sql` lines 258–270](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/01_mealpass_production_schema.sql#L258-L270)
- **Primary Key:** `id UUID` (DEFAULT `gen_random_uuid()`)
- **Foreign Keys:**
  - `order_id` $\to$ `public.orders(id) ON DELETE CASCADE`
  - `menu_item_id` $\to$ `public.menu_items(id) ON DELETE RESTRICT`

#### Column Probe Results
| Column Name | Live Data Type | Nullable | Default | Live Probe Status | Verification Classification |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `order_id` | `UUID` | NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `menu_item_id` | `UUID` | NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `item_name` | `VARCHAR(255)` | NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| *`item_name_snapshot`*| N/A | — | — | **`42703 (DOES NOT EXIST)`** | **VERIFIED LIVE (MISSING)** |
| `unit_price` | `NUMERIC(10, 2)`| NO | None (CHECK >= 0)| `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| *`unit_price_snapshot`*| N/A | — | — | **`42703 (DOES NOT EXIST)`** | **VERIFIED LIVE (MISSING)** |
| `quantity` | `INT` | NO | None (CHECK > 0) | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `subtotal` | `NUMERIC(12, 2)`| NO | None (CHECK >= 0)| `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `created_at` | `TIMESTAMPTZ` | YES | `NOW()` | `401 Protected` (EXISTS) | **VERIFIED LIVE** |

> **Critical Note:** The live columns are `item_name` and `unit_price`. Hardening migration `02` attempted to insert into `item_name_snapshot` and `unit_price_snapshot`, which do not exist.

---

### 2.6 Table: `order_status_history`
- **Schema Source:** [`01_mealpass_production_schema.sql` lines 272–284](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/01_mealpass_production_schema.sql#L272-L284)
- **Primary Key:** `id UUID` (DEFAULT `gen_random_uuid()`)
- **Foreign Keys:**
  - `order_id` $\to$ `public.orders(id) ON DELETE CASCADE`
  - `changed_by` $\to$ `public.user_profiles(id) ON DELETE SET NULL`

#### Column Probe Results
| Column Name | Live Data Type | Nullable | Default | Live Probe Status | Verification Classification |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `order_id` | `UUID` | NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `previous_status` | `order_status_type`| YES | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| *`from_status`* | N/A | — | — | **`42703 (DOES NOT EXIST)`** | **VERIFIED LIVE (MISSING)** |
| `new_status` | `order_status_type`| NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| *`to_status`* | N/A | — | — | **`42703 (DOES NOT EXIST)`** | **VERIFIED LIVE (MISSING)** |
| `changed_by` | `UUID` | YES | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `reason` | `TEXT` | YES | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `is_manual` | `BOOLEAN` | YES | `false` | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| *`is_manual_override`*| N/A | — | — | **`42703 (DOES NOT EXIST)`** | **VERIFIED LIVE (MISSING)** |
| `created_at` | `TIMESTAMPTZ` | YES | `NOW()` | `401 Protected` (EXISTS) | **VERIFIED LIVE** |

> **Critical Note:** The live columns are `previous_status`, `new_status`, and `is_manual`.

---

### 2.7 Table: `idempotency_records`
- **Schema Source:** [`01_mealpass_production_schema.sql` lines 353–362](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/01_mealpass_production_schema.sql#L353-L362)
- **Primary Key:** `id UUID` (DEFAULT `gen_random_uuid()`)
- **Unique Constraint:** `idempotency_key VARCHAR(150) UNIQUE`

#### Column Probe Results
| Column Name | Live Data Type | Nullable | Default | Live Probe Status | Verification Classification |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `idempotency_key` | `VARCHAR(150)` | NO | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `response_payload` | `JSONB` | NO | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `created_at` | `TIMESTAMPTZ` | YES | `NOW()` | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `expires_at` | `TIMESTAMPTZ` | NO | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| *`request_hash`* | N/A | — | — | **`42703 (DOES NOT EXIST)`** | **VERIFIED LIVE (MISSING)** |
| *`order_id`* | N/A | — | — | **`42703 (DOES NOT EXIST)`** | **VERIFIED LIVE (MISSING)** |
| *`ledger_entry_id`* | N/A | — | — | **`42703 (DOES NOT EXIST)`** | **VERIFIED LIVE (MISSING)** |

---

### 2.8 Table: `bursary_allocations`
- **Schema Source:** [`01_mealpass_production_schema.sql` lines 305–314](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/01_mealpass_production_schema.sql#L305-L314)
- **Primary Key:** `id UUID` (DEFAULT `gen_random_uuid()`)
- **Foreign Keys:**
  - `feeding_period_id` $\to$ `public.feeding_periods(id) ON DELETE RESTRICT` (NOT NULL)
  - `feeding_account_id` $\to$ `public.feeding_accounts(id) ON DELETE RESTRICT` (NOT NULL)
  - `university_id` $\to$ `public.universities(id) ON DELETE RESTRICT` (NOT NULL)
  - `allocated_by` $\to$ `public.user_profiles(id) ON DELETE RESTRICT` (NOT NULL)

#### Column Probe Results
| Column Name | Live Data Type | Nullable | Default | Live Probe Status | Verification Classification |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `feeding_period_id`| `UUID` | NO | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `feeding_account_id`| `UUID` | NO | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `university_id` | `UUID` | NO | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `amount` | `NUMERIC(12, 2)`| NO | None (CHECK > 0)| `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `allocated_by` | `UUID` | NO | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| *`created_by`* | N/A | — | — | **`42703 (DOES NOT EXIST)`** | **VERIFIED LIVE (MISSING)** |
| *`bank_reference`* | N/A | — | — | **`42703 (DOES NOT EXIST)`** | **VERIFIED LIVE (MISSING)** |
| `notes` | `TEXT` | YES | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `created_at` | `TIMESTAMPTZ` | YES | `NOW()` | `200 OK` (EXISTS) | **VERIFIED LIVE** |

> **Critical Note:** `bursary_allocations` strictly requires `feeding_period_id` (NOT NULL FK) and uses `allocated_by` (NOT NULL FK). It does not have `bank_reference` or `created_by`.

---

### 2.9 Table: `ledger_entries`
- **Schema Source:** [`01_mealpass_production_schema.sql` lines 286–303](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/01_mealpass_production_schema.sql#L286-L303)
- **Primary Key:** `id UUID` (DEFAULT `gen_random_uuid()`)
- **Foreign Keys:**
  - `feeding_account_id` $\to$ `public.feeding_accounts(id) ON DELETE RESTRICT`
  - `university_id` $\to$ `public.universities(id) ON DELETE RESTRICT`
  - `created_by` $\to$ `public.user_profiles(id) ON DELETE SET NULL`
- **Immutability:** Guarded by trigger `trg_prevent_ledger_modification` (prevents UPDATE/DELETE).

#### Column Probe Results
| Column Name | Live Data Type | Nullable | Default | Live Probe Status | Verification Classification |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `feeding_account_id`| `UUID` | NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `university_id` | `UUID` | NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `transaction_type`| `transaction_type`| NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `amount` | `NUMERIC(12, 2)`| NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `running_balance` | `NUMERIC(12, 2)`| NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `reference_id` | `VARCHAR(150)` | YES | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `description` | `TEXT` | NO | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `created_by` | `UUID` | YES | None | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `metadata` | `JSONB` | YES | `'{}'::jsonb` | `401 Protected` (EXISTS) | **VERIFIED LIVE** |
| `created_at` | `TIMESTAMPTZ` | YES | `NOW()` | `401 Protected` (EXISTS) | **VERIFIED LIVE** |

---

### 2.10 Table: `audit_logs`
- **Schema Source:** [`01_mealpass_production_schema.sql` lines 335–351](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/01_mealpass_production_schema.sql#L335-L351)
- **Primary Key:** `id UUID` (DEFAULT `gen_random_uuid()`)
- **Foreign Keys:**
  - `university_id` $\to$ `public.universities(id) ON DELETE RESTRICT`
  - `user_profile_id` $\to$ `public.user_profiles(id) ON DELETE SET NULL`

#### Column Probe Results
| Column Name | Live Data Type | Nullable | Default | Live Probe Status | Verification Classification |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `university_id` | `UUID` | NO | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `user_profile_id` | `UUID` | YES | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| *`user_id`* | N/A | — | — | **`42703 (DOES NOT EXIST)`** | **VERIFIED LIVE (MISSING)** |
| `action` | `VARCHAR(100)` | NO | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `entity_name` | `VARCHAR(100)` | NO | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| *`entity_type`* | N/A | — | — | **`42703 (DOES NOT EXIST)`** | **VERIFIED LIVE (MISSING)** |
| `entity_id` | `VARCHAR(100)` | YES | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `old_data` | `JSONB` | YES | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| *`old_values`* | N/A | — | — | **`42703 (DOES NOT EXIST)`** | **VERIFIED LIVE (MISSING)** |
| `new_data` | `JSONB` | YES | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| *`new_values`* | N/A | — | — | **`42703 (DOES NOT EXIST)`** | **VERIFIED LIVE (MISSING)** |
| `ip_address` | `VARCHAR(50)` | YES | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `user_agent` | `TEXT` | YES | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `created_at` | `TIMESTAMPTZ` | YES | `NOW()` | `200 OK` (EXISTS) | **VERIFIED LIVE** |

> **Critical Note:** The live table uses `user_profile_id`, `entity_name`, `old_data`, `new_data`.

---

### 2.11 Table: `feeding_periods`
- **Schema Source:** [`01_mealpass_production_schema.sql` lines 159–170](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/01_mealpass_production_schema.sql#L159-L170)
- **Primary Key:** `id UUID` (DEFAULT `gen_random_uuid()`)
- **Foreign Key:** `university_id` $\to$ `public.universities(id) ON DELETE RESTRICT`

#### Column Probe Results
| Column Name | Live Data Type | Nullable | Default | Live Probe Status | Verification Classification |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `university_id` | `UUID` | NO | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `name` | `VARCHAR(150)` | NO | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `start_date` | `DATE` | NO | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `end_date` | `DATE` | NO | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `is_active` | `BOOLEAN` | YES | `false` | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `created_at` | `TIMESTAMPTZ` | YES | `NOW()` | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `updated_at` | `TIMESTAMPTZ` | YES | `NOW()` | `200 OK` (EXISTS) | **VERIFIED LIVE** |

---

### 2.12 Table: `cafeterias`
- **Schema Source:** [`01_mealpass_production_schema.sql` lines 90–104](file:///C:/Users/biduo/OneDrive/Documents/MealPass/supabase/production/01_mealpass_production_schema.sql#L90-L104)
- **Primary Key:** `id UUID` (DEFAULT `gen_random_uuid()`)
- **Foreign Keys:**
  - `university_id` $\to$ `public.universities(id) ON DELETE RESTRICT`
  - `campus_id` $\to$ `public.campuses(id) ON DELETE SET NULL`

#### Column Probe Results
| Column Name | Live Data Type | Nullable | Default | Live Probe Status | Verification Classification |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `university_id` | `UUID` | NO | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `campus_id` | `UUID` | YES | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `name` | `VARCHAR(255)` | NO | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `location` | `VARCHAR(255)` | YES | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `description` | `TEXT` | YES | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `operating_hours` | `JSONB` | YES | None | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `is_active` | `BOOLEAN` | YES | `true` | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `created_at` | `TIMESTAMPTZ` | YES | `NOW()` | `200 OK` (EXISTS) | **VERIFIED LIVE** |
| `updated_at` | `TIMESTAMPTZ` | YES | `NOW()` | `200 OK` (EXISTS) | **VERIFIED LIVE** |

---

## 3. STRICT READ-ONLY SQL INSPECTION SCRIPT FOR SUPABASE SQL EDITOR

For full catalog verification inside the Supabase Dashboard SQL Editor, execute:

```sql
-- STRICTLY READ-ONLY LIVE SCHEMA INSPECTION QUERY
SELECT 
    c.table_name,
    c.ordinal_position,
    c.column_name,
    c.data_type,
    c.udt_name,
    c.is_nullable,
    c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name IN (
    'cafeteria_staff',
    'user_profiles',
    'student_profiles',
    'orders',
    'order_items',
    'order_status_history',
    'idempotency_records',
    'bursary_allocations',
    'ledger_entries',
    'audit_logs',
    'feeding_periods',
    'cafeterias'
  )
ORDER BY c.table_name, c.ordinal_position;
```
