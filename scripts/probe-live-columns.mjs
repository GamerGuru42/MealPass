// probe-live-columns.mjs
// Strictly read-only column existence probe against live production PostgREST

const SUPABASE_URL = 'https://ipdqfejoctltasrzbdaj.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwZHFmZWpvY3RsdGFzcnpiZGFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0OTEyNTQsImV4cCI6MjEwOTA2NzI1NH0.nG8dtDOQNc5V5kl5M9HxsTyp9BElppr_y78CKBdy2sE';

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

const tablesToProbe = {
  cafeteria_staff: [
    'id', 'user_profile_id', 'cafeteria_id', 'university_id',
    'role_in_cafeteria', 'created_at', 'assigned_at', 'is_active'
  ],
  user_profiles: [
    'id', 'auth_user_id', 'university_id', 'email', 'first_name', 'last_name',
    'phone', 'avatar_url', 'role', 'is_active', 'created_at', 'updated_at'
  ],
  student_profiles: [
    'id', 'user_profile_id', 'university_id', 'matric_number', 'department',
    'faculty', 'level', 'transaction_pin_hash', 'pin_hash', 'pin_attempts',
    'pin_failed_attempts', 'pin_locked_until', 'is_feeding_active', 'created_at', 'updated_at'
  ],
  orders: [
    'id', 'order_number', 'university_id', 'cafeteria_id', 'student_profile_id',
    'status', 'total_amount', 'pickup_code', 'pickup_qr_token', 'notes',
    'special_instructions', 'idempotency_key', 'placed_at', 'accepted_at',
    'preparing_at', 'ready_at', 'received_at', 'received_by', 'cancelled_at',
    'cancellation_reason', 'created_at', 'updated_at'
  ],
  order_items: [
    'id', 'order_id', 'menu_item_id', 'item_name', 'item_name_snapshot',
    'unit_price', 'unit_price_snapshot', 'quantity', 'subtotal', 'created_at'
  ],
  order_status_history: [
    'id', 'order_id', 'previous_status', 'from_status', 'new_status', 'to_status',
    'changed_by', 'reason', 'is_manual', 'is_manual_override', 'created_at'
  ],
  idempotency_records: [
    'id', 'idempotency_key', 'order_id', 'ledger_entry_id', 'request_hash',
    'response_payload', 'created_at', 'expires_at'
  ],
  bursary_allocations: [
    'id', 'feeding_period_id', 'feeding_account_id', 'university_id',
    'amount', 'allocated_by', 'created_by', 'bank_reference', 'notes', 'created_at'
  ],
  ledger_entries: [
    'id', 'feeding_account_id', 'university_id', 'transaction_type',
    'amount', 'running_balance', 'reference_id', 'description',
    'created_by', 'metadata', 'created_at'
  ],
  audit_logs: [
    'id', 'university_id', 'user_profile_id', 'user_id', 'action',
    'entity_name', 'entity_type', 'entity_id', 'old_data', 'old_values',
    'new_data', 'new_values', 'ip_address', 'user_agent', 'created_at'
  ],
  feeding_periods: [
    'id', 'university_id', 'name', 'start_date', 'end_date', 'is_active',
    'created_at', 'updated_at'
  ],
  cafeterias: [
    'id', 'university_id', 'campus_id', 'name', 'location', 'description',
    'operating_hours', 'is_active', 'created_at', 'updated_at'
  ]
};

async function probe() {
  console.log('=== PROBING LIVE PRODUCTION POSTGRESQL TABLE COLUMNS ===');
  console.log('Target:', SUPABASE_URL);

  const results = {};

  for (const [table, columns] of Object.entries(tablesToProbe)) {
    console.log(`\nTable: ${table}`);
    results[table] = { existing: [], missing: [] };

    for (const col of columns) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${col}&limit=0`, {
          headers
        });
        if (res.status === 200) {
          console.log(`  [EXISTS]  ${col}`);
          results[table].existing.push(col);
        } else if (res.status === 400) {
          const body = await res.json();
          if (body.code === '42703') {
            console.log(`  [MISSING] ${col} (42703 column does not exist)`);
            results[table].missing.push(col);
          } else {
            console.log(`  [ERR 400] ${col}: ${body.message}`);
          }
        } else {
          console.log(`  [STATUS ${res.status}] ${col}`);
        }
      } catch (err) {
        console.log(`  [FETCH FAIL] ${col}: ${err.message}`);
      }
    }
  }

  console.log('\n=== PROBE COMPLETE ===');
}

probe();
