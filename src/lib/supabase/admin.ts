import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const PRODUCTION_PROJECT_REF = 'ipdqfejoctltasrzbdaj';
const STAGING_PROJECT_REF = 'twgsmumoyfrcwicfllwh';

export function createAdminClient() {
  const isProduction = process.env.NODE_ENV === 'production';
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // In production, guard against accidental staging configuration
  if (isProduction && supabaseUrl && supabaseUrl.includes(STAGING_PROJECT_REF)) {
    throw new Error(
      `FATAL: Production server is configured with Staging Supabase reference (${STAGING_PROJECT_REF})! Aborting to prevent cross-environment data leakage.`
    );
  }

  // Authoritative production default URL
  if (!supabaseUrl) {
    supabaseUrl = `https://${PRODUCTION_PROJECT_REF}.supabase.co`;
  }

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

