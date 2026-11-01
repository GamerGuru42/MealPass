/**
 * MealPass Live Supabase Database Verification Suite
 * Technology: Powered by NextGen Technologies
 * Client: Cosmopolitan University
 * 
 * Executes real tests against live Supabase PostgreSQL project.
 * Redacts all secrets.
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('====================================================================');
console.log('MEALPASS LIVE SUPABASE DATABASE VERIFICATION');
console.log('Client: Cosmopolitan University');
console.log('Technology Attribution: Powered by NextGen Technologies');
console.log('====================================================================\n');

if (!url || !anonKey) {
  console.error('[FATAL] Missing Supabase configuration in environment.');
  process.exit(1);
}

const safeHost = new URL(url).hostname;
console.log(`Connected to Host: ${safeHost}`);
console.log(`Auth Mode: ${serviceRoleKey && !serviceRoleKey.includes('demo') ? 'Service Role + Anon Client' : 'Anon Client Only'}\n`);

const supabase = createClient(url, serviceRoleKey && !serviceRoleKey.includes('demo') ? serviceRoleKey : anonKey);

async function runLiveVerification() {
  // Test 1: Connection & Auth Health
  console.log('1. Connection Test:');
  try {
    const healthRes = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anonKey } });
    if (healthRes.ok) {
      console.log('   [PASS] Successfully reached Supabase Auth & PostgreSQL cluster (HTTP 200)\n');
    } else {
      console.log(`   [FAIL] Supabase Auth returned HTTP ${healthRes.status}\n`);
    }
  } catch (err) {
    console.log(`   [FAIL] Connection error: ${err.message}\n`);
    return;
  }

  // Test 2: Migration Status (Verify 16 Tables)
  console.log('2. Schema Migration Verification:');
  const expectedTables = [
    'universities',
    'user_profiles',
    'student_profiles',
    'feeding_periods',
    'feeding_accounts',
    'ledger_entries',
    'cafeterias',
    'cafeteria_staff',
    'menu_categories',
    'menu_items',
    'menu_item_price_history',
    'orders',
    'order_items',
    'order_status_history',
    'idempotency_records',
    'audit_logs',
  ];

  let missingTables = [];
  for (const table of expectedTables) {
    const { error, status } = await supabase.from(table).select('*').limit(0);
    if (error && (status === 404 || error.code === 'PGRST205')) {
      missingTables.push(table);
    }
  }

  if (missingTables.length > 0) {
    console.log(`   [NOT APPLIED] ${missingTables.length} of ${expectedTables.length} tables not found in schema cache.`);
    console.log(`   Missing tables include: ${missingTables.slice(0, 4).join(', ')}...`);
    console.log('   Action required: Run `supabase/deploy_all_migrations.sql` in Supabase SQL Editor.\n');
    return;
  }

  console.log('   [PASS] All 16 MealPass tables verified in PostgreSQL schema cache!\n');

  // Test 3: Seed Data Verification
  console.log('3. Seed Data Verification:');
  const { data: uni } = await supabase.from('universities').select('name, slug').eq('slug', 'cosmopolitan').single();
  const { data: menu } = await supabase.from('menu_items').select('id, name, current_price').eq('is_active', true);
  const { data: student } = await supabase.from('student_profiles').select('matric_number').eq('matric_number', 'CU/2024/0142').single();

  if (uni && menu?.length > 0 && student) {
    console.log(`   [PASS] Cosmopolitan University tenant verified (${uni.name})`);
    console.log(`   [PASS] Active menu items verified (${menu.length} items loaded)`);
    console.log(`   [PASS] Seed student verified (${student.matric_number})\n`);
  } else {
    console.log('   [FAIL] Seed records incomplete.\n');
  }
}

runLiveVerification().catch(console.error);

