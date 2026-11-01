/**
 * Phase 3 Live Production Database Permission & Catalog Verification
 * Target: https://ipdqfejoctltasrzbdaj.supabase.co
 */

const SUPABASE_URL = 'https://ipdqfejoctltasrzbdaj.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwZHFmZWpvY3RsdGFzcnpiZGFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0OTEyNTQsImV4cCI6MjEwOTA2NzI1NH0.nG8dtDOQNc5V5kl5M9HxsTyp9BElppr_y78CKBdy2sE';

const anonHeaders = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
};

async function checkRpc(name, body = {}) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${name}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: anonHeaders,
      body: JSON.stringify(body),
    });
    let data;
    try {
      data = await res.json();
    } catch {
      data = await res.text();
    }
    return { status: res.status, data };
  } catch (err) {
    return { status: 0, error: err.message };
  }
}

async function runAudit() {
  console.log('=== PHASE 3 LIVE PRODUCTION DATABASE RPC PERMISSION AUDIT ===');
  console.log(`Target: ${SUPABASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const functionsToTest = [
    { name: 'get_auth_user_role', body: {} },
    { name: 'get_auth_student_profile_id', body: {} },
    { name: 'get_auth_cafeteria_id', body: {} },
    {
      name: 'place_mealpass_order',
      body: {
        p_student_profile_id: '00000000-0000-0000-0000-000000000000',
        p_cafeteria_id: 'c0000000-0000-0000-0000-000000000001',
        p_items: [{ menu_item_id: '00000000-0000-0000-0000-000000000000', quantity: 1 }],
        p_pin: '1234',
      },
    },
    {
      name: 'allocate_mealpass_funds',
      body: {
        p_student_profile_id: '00000000-0000-0000-0000-000000000000',
        p_amount: 100,
        p_description: 'Audit Test',
      },
    },
    {
      name: 'update_order_status_rpc',
      body: {
        p_order_id: '00000000-0000-0000-0000-000000000000',
        p_new_status: 'ACCEPTED',
        p_changed_by: '00000000-0000-0000-0000-000000000000',
      },
    },
  ];

  for (const fn of functionsToTest) {
    const result = await checkRpc(fn.name, fn.body);
    const isDenied = result.status === 401 || result.status === 403 || result.status === 404;
    console.log(`Function: ${fn.name}`);
    console.log(`  HTTP Status: ${result.status}`);
    console.log(`  Access Denied (Hardened): ${isDenied ? '✅ YES' : '❌ NO (Executable by anon!)'}`);
    console.log(`  Response:`, JSON.stringify(result.data, null, 2));
    console.log('----------------------------------------------------');
  }
}

runAudit();
