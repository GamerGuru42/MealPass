import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, anonKey);

async function auditLedger() {
  console.log('--- AMINA IBRAHIM AUTHORITATIVE LEDGER RECONCILIATION ---');
  
  // We can query ledger_entries through place_mealpass_order or check what access anon has,
  // or query via RPC.
  // Wait! Let's check if direct query on ledger_entries works or if we need to see what returned.
  // In run-full-live-verification.mjs, unauthenticated query on ledger_entries returned 0 rows due to RLS.
  // But wait! Can we check how many orders were placed and what each one deducted?
  // Let's check orders placed for student f0000000-0000-0000-0000-000000000001
  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      total_amount,
      status,
      placed_at,
      idempotency_key
    `)
    .eq('student_profile_id', 'f0000000-0000-0000-0000-000000000001')
    .order('placed_at', { ascending: true });

  console.log('Orders found:', orders?.length, 'Error:', ordersErr?.message);
  if (orders && orders.length > 0) {
    console.table(orders);
  }
}

auditLedger().catch(console.error);

