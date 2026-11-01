import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://twgsmumoyfrcwicfllwh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isRealServiceKey = Boolean(rawServiceKey && !rawServiceKey.includes('demo') && !rawServiceKey.includes('dummy') && !rawServiceKey.includes('your-service-role'));
const key = isRealServiceKey ? rawServiceKey : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!key) {
  console.error('Supabase key missing from environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, key, {
  auth: { persistSession: false },
});

async function auditDatabase() {
  console.log('=== AUDITING LIVE STAGING SUPABASE DATABASE ===');
  console.log('URL:', SUPABASE_URL);

  const tablesToCheck = [
    'universities',
    'cafeterias',
    'campuses',
    'user_profiles',
    'student_profiles',
    'feeding_accounts',
    'menu_categories',
    'menu_items',
    'menu_item_price_history',
    'orders',
    'order_items',
    'order_status_history',
    'ledger_entries',
    'bursary_allocations',
    'feeding_periods',
    'reconciliation_snapshots',
    'audit_logs',
    'operator_invitations',
    'migration_batches',
    'migration_records',
  ];

  console.log('\n--- Checking Table Existence ---');
  for (const table of tablesToCheck) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ Table "${table}": NOT FOUND / ERROR (${error.message})`);
    } else {
      console.log(`✓ Table "${table}": EXISTS (Row count: ${count ?? 0})`);
    }
  }

  console.log('\n--- Checking Transaction Types in ledger_entries ---');
  const { data: ledgerTypes, error: ledgerError } = await supabase
    .from('ledger_entries')
    .select('transaction_type')
    .limit(50);
  if (ledgerError) {
    console.log('Error querying ledger_entries:', ledgerError.message);
  } else {
    const uniqueTypes = Array.from(new Set(ledgerTypes.map(r => r.transaction_type)));
    console.log('Unique transaction types present in DB:', uniqueTypes);
  }

  console.log('\n--- Checking Cafeterias in DB ---');
  const { data: cafeterias, error: cafError } = await supabase
    .from('cafeterias')
    .select('id, name, location, is_active');
  if (cafError) {
    console.log('Error querying cafeterias:', cafError.message);
  } else {
    console.log(`Found ${cafeterias?.length} cafeterias in database:`);
    cafeterias?.forEach(c => console.log(`  - [${c.id}] ${c.name} (${c.location}) - Active: ${c.is_active}`));
  }

  console.log('\n--- Checking Migration History / RPC Functions ---');
  const { data: rpcMenu, error: rpcMenuErr } = await supabase.rpc('get_cafeteria_menu', {
    p_cafeteria_id: 'c0000000-0000-0000-0000-000000000001'
  });
  if (rpcMenuErr) {
    console.log('RPC get_cafeteria_menu:', rpcMenuErr.message);
  } else {
    console.log('RPC get_cafeteria_menu: AVAILABLE (Success:', rpcMenu?.success, ', Item count:', rpcMenu?.items?.length, ')');
  }
}

auditDatabase();
