const SUPABASE_URL = 'https://ipdqfejoctltasrzbdaj.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwZHFmZWpvY3RsdGFzcnpiZGFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0OTEyNTQsImV4cCI6MjEwOTA2NzI1NH0.nG8dtDOQNc5V5kl5M9HxsTyp9BElppr_y78CKBdy2sE';

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'count=exact',
};

async function verifyProductionDataIntegrity() {
  console.log('=== VERIFYING LIVE PRODUCTION DATABASE DATA INTEGRITY ===');
  console.log('Project: ipdqfejoctltasrzbdaj\n');

  const targetTables = [
    'user_profiles',
    'student_profiles',
    'feeding_accounts',
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

  let allClean = true;

  for (const table of targetTables) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=count`, { headers });
    const contentRange = res.headers.get('content-range');
    const count = contentRange ? parseInt(contentRange.split('/')[1], 10) : 0;
    
    const isZero = count === 0;
    if (!isZero) allClean = false;
    
    console.log(`  ${isZero ? '✓' : '❌'} ${table.padEnd(26)}: ${count} rows (status: ${res.status})`);
  }

  console.log('\n--- Foundational Tenant Seed Tables ---');
  const seedTables = ['universities', 'campuses', 'cafeterias', 'menu_categories', 'menu_items'];
  for (const table of seedTables) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=count`, { headers });
    const contentRange = res.headers.get('content-range');
    const count = contentRange ? parseInt(contentRange.split('/')[1], 10) : 0;
    console.log(`  ✓ ${table.padEnd(26)}: ${count} rows`);
  }

  if (allClean) {
    console.log('\n🎉 PRODUCTION DATABASE IS 100% CLEAN: 0 student profiles, 0 orders, 0 ledger entries, 0 allocations.');
  } else {
    console.error('\n❌ CONTAMINATION DETECTED IN PRODUCTION DATABASE.');
  }
}

verifyProductionDataIntegrity().catch(console.error);

