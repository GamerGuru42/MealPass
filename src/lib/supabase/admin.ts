import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://twgsmumoyfrcwicfllwh.supabase.co';
  const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isRealServiceKey = Boolean(rawServiceKey && !rawServiceKey.includes('demo') && !rawServiceKey.includes('dummy'));
  const key = isRealServiceKey ? rawServiceKey! : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_key';

  return createClient<Database>(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

