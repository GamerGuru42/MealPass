/**
 * MealPass Exhaustive Live Supabase PostgreSQL Verification Suite
 * Technology: Powered by NextGen Technologies
 * Client: Cosmopolitan University
 * 
 * Executes real tests against live Supabase PostgreSQL project.
 * Distinguishes genuine database executions from any simulated fallback.
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('====================================================================');
console.log('MEALPASS EXHAUSTIVE LIVE SUPABASE VERIFICATION');
console.log('Client: Cosmopolitan University');
console.log('Technology Attribution: Powered by NextGen Technologies');
console.log('====================================================================\n');

const safeHost = new URL(url).hostname;
console.log(`Live PostgreSQL Endpoint: ${safeHost}`);
console.log(`Auth Mode: ${serviceRoleKey && !serviceRoleKey.includes('demo') ? 'Elevated Service Role Key' : 'Public Anon Key'}\n`);

const supabase = createClient(
  url, 
  serviceRoleKey && !serviceRoleKey.includes('demo') ? serviceRoleKey : anonKey
);

const results = [];

function record(name, status, details, isRealDb = true) {
  results.push({ name, status, details, isRealDb });
  const tag = isRealDb ? '[LIVE DB]' : '[SIMULATED]';
  console.log(`${status === 'PASS' ? '✓ [PASS]' : '✗ [FAIL]'} ${tag} ${name}`);
  if (details) console.log(`   ${details}`);
}

async function runSuite() {
  // 1. Tables Verification
  console.log('\n--- 1. Expected Database Tables ---');
  const expectedTables = [
    'universities', 'user_profiles', 'student_profiles', 'feeding_periods',
    'feeding_accounts', 'ledger_entries', 'cafeterias', 'cafeteria_staff',
    'menu_categories', 'menu_items', 'menu_item_price_history', 'orders',
    'order_items', 'order_status_history', 'idempotency_records', 'audit_logs'
  ];

  let missing = [];
  for (const t of expectedTables) {
    const { error, status } = await supabase.from(t).select('*').limit(0);
    if (error && (status === 404 || error.code === 'PGRST205')) {
      missing.push(t);
    }
  }

  if (missing.length === 0) {
    record('All 16 Expected Tables Exist in PostgreSQL', 'PASS', 'Schema verified in live PostgREST schema cache.');
  } else {
    record('All 16 Expected Tables Exist in PostgreSQL', 'FAIL', `Missing tables: ${missing.join(', ')}`);
  }

  // 2. RLS Enforcement on Unauthenticated Queries
  console.log('\n--- 2. RLS Enforcement on Protected Tables ---');
  const anonClient = createClient(url, anonKey);
  const unauthUni = await anonClient.from('universities').select('*');
  const unauthLedger = await anonClient.from('ledger_entries').select('*');

  if (unauthLedger.data && unauthLedger.data.length === 0) {
    record('RLS Blocks Unauthenticated Access to Private Ledger', 'PASS', 'Unauthenticated query to ledger_entries returned 0 rows (RLS enforced).');
  } else {
    record('RLS Blocks Unauthenticated Access to Private Ledger', 'FAIL', `Unauthenticated ledger query returned ${unauthLedger.data?.length} rows.`);
  }

  // 3. Supabase Auth Integration
  console.log('\n--- 3. Supabase Auth Integration ---');
  const testEmail = `student.qa.${Date.now()}@cosmopolitan.edu.ng`;
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: testEmail,
    password: 'TestPassword2026!Secure',
  });

  if (!authErr && authData.user?.id) {
    record('Supabase Auth User Provisioning', 'PASS', `Created live auth user: ${testEmail} (ID: ${authData.user.id})`);
  } else {
    record('Supabase Auth User Provisioning', 'FAIL', authErr?.message || 'Failed to create auth user');
  }

  // 4. Stored Procedure / RPC place_mealpass_order Execution
  console.log('\n--- 4. Authoritative Database RPC (place_mealpass_order) ---');
  const rpcRes = await supabase.rpc('place_mealpass_order', {
    p_student_profile_id: 'f0000000-0000-0000-0000-000000000001',
    p_cafeteria_id: 'c0000000-0000-0000-0000-000000000001',
    p_items: [{ menu_item_id: '00000000-0000-0000-0000-000000000001', quantity: 1 }],
    p_pin: '1234',
    p_notes: 'Live verification order',
    p_idempotency_key: `IDEMP-LIVE-${Date.now()}`
  });

  if (rpcRes.error) {
    record('Atomic Meal Purchase RPC (place_mealpass_order)', 'FAIL', `PostgreSQL execution returned: ${rpcRes.error.message}`);
  } else {
    record('Atomic Meal Purchase RPC (place_mealpass_order)', 'PASS', `Order placed successfully! Order Number: ${rpcRes.data?.order?.order_number}, Deducted: ₦${rpcRes.data?.ledger_entry?.amount_deducted}`);
  }

  // 5. Insufficient Balance Check
  console.log('\n--- 5. Insufficient Balance Shortfall Reporting ---');
  const hugeOrderRes = await supabase.rpc('place_mealpass_order', {
    p_student_profile_id: 'f0000000-0000-0000-0000-000000000001',
    p_cafeteria_id: 'c0000000-0000-0000-0000-000000000001',
    p_items: [{ menu_item_id: '00000000-0000-0000-0000-000000000001', quantity: 5000 }], // 5,000,000 NGN
    p_pin: '1234'
  });

  if (hugeOrderRes.error && hugeOrderRes.error.message.includes('Insufficient MealPass balance')) {
    record('Insufficient Balance Rejection & Shortfall Calculation', 'PASS', `PostgreSQL RAISE EXCEPTION caught: "${hugeOrderRes.error.message}"`);
  } else {
    record('Insufficient Balance Rejection & Shortfall Calculation', 'FAIL', hugeOrderRes.error ? hugeOrderRes.error.message : 'Order should have failed');
  }

  // 6. Non-Existent Student Rejection
  console.log('\n--- 6. Invalid Student Account Rejection ---');
  const invalidStudentRes = await supabase.rpc('place_mealpass_order', {
    p_student_profile_id: '00000000-0000-0000-0000-000000000099',
    p_cafeteria_id: 'c0000000-0000-0000-0000-000000000001',
    p_items: [{ menu_item_id: '00000000-0000-0000-0000-000000000001', quantity: 1 }],
    p_pin: '1234'
  });

  if (invalidStudentRes.error && invalidStudentRes.error.message.includes('Student profile not found')) {
    record('Unregistered Student Rejection', 'PASS', 'Correctly rejected with "Student profile not found."');
  } else {
    record('Unregistered Student Rejection', 'FAIL', invalidStudentRes.error?.message || 'Expected rejection');
  }

  // 7. Realtime Channel Subscription Check
  console.log('\n--- 7. Realtime WebSocket Subscription ---');
  try {
    const channel = supabase.channel('qa_live_orders_test');
    let subscriptionSucceeded = false;
    
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {});
    
    await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(), 3000);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          subscriptionSucceeded = true;
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    supabase.removeChannel(channel);

    if (subscriptionSucceeded) {
      record('Supabase Realtime Channel Subscription', 'PASS', 'Subscribed to orders postgres_changes channel successfully.');
    } else {
      record('Supabase Realtime Channel Subscription', 'FAIL', 'Realtime subscription timed out or unconfirmed.');
    }
  } catch (err) {
    record('Supabase Realtime Channel Subscription', 'FAIL', err.message);
  }

  console.log('\n====================================================================');
  console.log('SUMMARY OF REAL DATABASE VERIFICATION');
  console.log('====================================================================');
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  console.log(`Passed: ${passed}/${total}`);
}

runSuite().catch(console.error);

