const SUPABASE_URL = 'https://ipdqfejoctltasrzbdaj.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwZHFmZWpvY3RsdGFzcnpiZGFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0OTEyNTQsImV4cCI6MjEwOTA2NzI1NH0.nG8dtDOQNc5V5kl5M9HxsTyp9BElppr_y78CKBdy2sE';

const anonHeaders = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
};

async function testRpcAccess() {
  console.log('=== CHECKING LIVE PRODUCTION DATABASE RPC PERMISSIONS ===');
  console.log('Target Project: ipdqfejoctltasrzbdaj');

  const rpcs = [
    {
      name: 'place_mealpass_order',
      body: {
        p_student_profile_id: '00000000-0000-0000-0000-000000000000',
        p_cafeteria_id: 'c0000000-0000-0000-0000-000000000001',
        p_items: [],
        p_pin: '0000',
      },
    },
    {
      name: 'allocate_mealpass_funds',
      body: {
        p_student_profile_id: '00000000-0000-0000-0000-000000000000',
        p_amount: 100,
        p_description: 'Test',
      },
    },
    {
      name: 'update_order_status_rpc',
      body: {
        p_order_id: '00000000-0000-0000-0000-000000000000',
        p_new_status: 'ACCEPTED',
        p_changed_by: 'Test',
      },
    },
    {
      name: 'verify_student_pin',
      body: {
        p_student_profile_id: '00000000-0000-0000-0000-000000000000',
        p_plain_pin: '1234',
      },
    },
    {
      name: 'process_legacy_migration_batch',
      body: {
        p_batch_id: '00000000-0000-0000-0000-000000000000',
        p_records: [],
      },
    },
  ];

  for (const rpc of rpcs) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${rpc.name}`, {
        method: 'POST',
        headers: anonHeaders,
        body: JSON.stringify(rpc.body),
      });
      const data = await res.json().catch(() => null);
      console.log(`\nRPC: ${rpc.name}`);
      console.log(`  HTTP Status: ${res.status}`);
      console.log(`  Response:`, data);
    } catch (err) {
      console.log(`\nRPC: ${rpc.name} ERROR:`, err.message);
    }
  }
}

testRpcAccess().catch(console.error);

