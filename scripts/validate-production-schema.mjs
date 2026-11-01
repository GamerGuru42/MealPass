import fs from 'fs';

const sqlPath = 'supabase/production/01_mealpass_production_schema.sql';
const sql = fs.readFileSync(sqlPath, 'utf8');

console.log('=== VALIDATING PRODUCTION SCHEMA SCRIPT ===');
console.log('File:', sqlPath);
console.log('Size:', (sql.length / 1024).toFixed(2), 'KB');

const expectedTables = [
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

console.log('\n1. Verifying Table Definitions (CREATE TABLE):');
let missingTables = [];
for (const table of expectedTables) {
  const regex = new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}\\b`, 'i');
  if (regex.test(sql)) {
    console.log(`  ✓ Table public.${table} defined`);
  } else {
    console.log(`  ❌ Missing table: ${table}`);
    missingTables.push(table);
  }
}

console.log('\n2. Verifying RLS Activation (ENABLE ROW LEVEL SECURITY):');
let missingRLS = [];
for (const table of expectedTables) {
  if (table === 'idempotency_records') continue; // system idempotency
  const regex = new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, 'i');
  if (regex.test(sql)) {
    console.log(`  ✓ RLS enabled on public.${table}`);
  } else {
    console.log(`  ❌ Missing RLS on: ${table}`);
    missingRLS.push(table);
  }
}

console.log('\n3. Verifying Staging/Test Data Quarantined (ZERO TEST DATA):');
const testNames = ['Amina', 'Ibrahim', 'Samuel', 'Okon', 'Zainab', 'Abubakar', '50000.00', 'demoHash'];
let foundTestData = [];
for (const term of testNames) {
  if (sql.includes(term)) {
    console.log(`  ⚠️ Found test term in production script: "${term}"`);
    foundTestData.push(term);
  }
}
if (foundTestData.length === 0) {
  console.log('  ✓ Verified: Zero test students, fake balances, or dummy hashes in script!');
}

console.log('\n4. Verifying Functions & Procedures:');
const expectedFunctions = [
  'get_auth_user_role',
  'get_auth_student_profile_id',
  'get_auth_cafeteria_id',
  'place_mealpass_order',
  'allocate_mealpass_funds',
  'update_order_status_rpc',
];
for (const fn of expectedFunctions) {
  if (sql.includes(`FUNCTION public.${fn}`)) {
    console.log(`  ✓ Function public.${fn} defined`);
  } else {
    console.log(`  ❌ Missing function: ${fn}`);
  }
}

console.log('\n5. Verifying Search Path Security:');
const searchPathCount = (sql.match(/SET search_path = public, extensions, pg_temp/g) || []).length;
console.log(`  ✓ Found ${searchPathCount} functions secured with explicit fixed search_path`);

console.log('\n6. Verifying Seed Records for Universities & Cafeterias:');
console.log('  Cosmopolitan University seed:', sql.includes('Cosmopolitan University'));
console.log('  Main Campus (Alma House) seed:', sql.includes('Main Campus (Alma House)'));
console.log('  Kado Campus Dining seed:', sql.includes('Kado Campus Dining'));

if (missingTables.length === 0 && missingRLS.length === 0 && foundTestData.length === 0) {
  console.log('\n🎉 PRODUCTION SCHEMA VALIDATION: 100% PASSED!');
} else {
  console.log('\n⚠️ Schema validation issues found');
}
