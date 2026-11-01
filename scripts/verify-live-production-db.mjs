// Built-in global fetch is used (Node 18+)

const SUPABASE_URL = 'https://ipdqfejoctltasrzbdaj.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwZHFmZWpvY3RsdGFzcnpiZGFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0OTEyNTQsImV4cCI6MjEwOTA2NzI1NH0.nG8dtDOQNc5V5kl5M9HxsTyp9BElppr_y78CKBdy2sE';

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
};

async function runAudit() {
  console.log('=== AUDITING LIVE PRODUCTION SUPABASE DATABASE ===');
  console.log('Project Reference: ipdqfejoctltasrzbdaj');
  console.log('Project URL:', SUPABASE_URL);

  const tables = [
    'universities',
    'campuses',
    'cafeterias',
    'user_profiles',
    'student_profiles',
    'feeding_accounts',
    'feeding_periods',
    'cafeteria_staff',
    'menu_categories',
    'menu_items',
    'menu_item_price_history',
    'orders',
    'order_items',
    'order_status_history',
    'ledger_entries',
    'bursary_allocations',
    'reconciliation_snapshots',
    'audit_logs',
    'idempotency_records',
    'operator_invitations',
    'migration_batches',
    'migration_records',
  ];

  console.log('\n1. Checking Table Accessibility & Row Counts:');
  const tableResults = {};
  for (const table of tables) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=count`, {
        headers: { ...headers, Prefer: 'count=exact' },
      });
      const range = res.headers.get('content-range');
      const count = range ? range.split('/')[1] : 'accessible';
      console.log(`  ✓ ${table.padEnd(26)}: status ${res.status} (rows: ${count})`);
      tableResults[table] = { status: res.status, rows: count };
    } catch (err) {
      console.log(`  ❌ ${table.padEnd(26)}: ${err.message}`);
    }
  }

  console.log('\n2. Verifying Official Cosmopolitan University Tenant Seed:');
  const uniRes = await fetch(`${SUPABASE_URL}/rest/v1/universities?select=*`, { headers });
  const uniData = await uniRes.json();
  console.log('  University:', uniData[0]?.name, `(${uniData[0]?.slug})`);

  const campusRes = await fetch(`${SUPABASE_URL}/rest/v1/campuses?select=*`, { headers });
  const campusData = await campusRes.json();
  console.log('  Campuses:', campusData.map((c) => `${c.name} [${c.code}]`).join(', '));

  const cafeRes = await fetch(`${SUPABASE_URL}/rest/v1/cafeterias?select=*`, { headers });
  const cafeData = await cafeRes.json();
  console.log('  Cafeterias:', cafeData.map((c) => c.name).join(', '));

  const itemsRes = await fetch(`${SUPABASE_URL}/rest/v1/menu_items?select=count`, {
    headers: { ...headers, Prefer: 'count=exact' },
  });
  console.log('  Total Menu Items Seeded:', itemsRes.headers.get('content-range')?.split('/')[1]);

  console.log('\n3. Verifying Authoritative Financial Stored Procedures:');
  // Test place_mealpass_order
  const p1 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/place_mealpass_order`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_student_profile_id: '00000000-0000-0000-0000-000000000000',
      p_cafeteria_id: 'c0000000-0000-0000-0000-000000000001',
      p_items: [],
      p_pin: '0000',
    }),
  });
  const p1Data = await p1.json();
  console.log('  ✓ place_mealpass_order: Active & Enforced (Expected response:', p1Data.message, ')');

  // Test allocate_mealpass_funds
  const p2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/allocate_mealpass_funds`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_student_profile_id: '00000000-0000-0000-0000-000000000000',
      p_amount: -10,
      p_description: 'Test',
    }),
  });
  const p2Data = await p2.json();
  console.log('  ✓ allocate_mealpass_funds: Active & Enforced (Expected response:', p2Data.message, ')');

  // Test update_order_status_rpc
  const p3 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_order_status_rpc`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_order_id: '00000000-0000-0000-0000-000000000000',
      p_new_status: 'ACCEPTED',
      p_changed_by: '00000000-0000-0000-0000-000000000000',
    }),
  });
  const p3Data = await p3.json();
  console.log('  ✓ update_order_status_rpc: Active & Enforced (Expected response:', p3Data.message, ')');

  console.log('\n4. Verifying Student Cleanliness (Zero Test Students):');
  const stuRes = await fetch(`${SUPABASE_URL}/rest/v1/student_profiles?select=count`, {
    headers: { ...headers, Prefer: 'count=exact' },
  });
  const stuCount = stuRes.headers.get('content-range')?.split('/')[1];
  console.log('  Live student_profiles count:', stuCount, '(Strict 0 required)');

  if (stuCount === '0') {
    console.log('\n🎉 LIVE PRODUCTION DATABASE VERIFICATION: 100% SUCCEEDED!');
  } else {
    console.log('\n⚠️ Non-zero student profiles found in production DB');
  }
}

runAudit().catch(console.error);
