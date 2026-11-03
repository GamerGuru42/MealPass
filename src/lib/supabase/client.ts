import { createBrowserClient } from '@supabase/ssr';
import { Database } from './database.types';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ipdqfejoctltasrzbdaj.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_anon_key';

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

