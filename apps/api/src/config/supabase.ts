import { createClient } from '@supabase/supabase-js';
import { loadEnvironment } from './loadEnv.js';

loadEnvironment();

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) as string;
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY) as string;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || supabaseServiceKey;

function createConfiguredClient(key: string) {
  const finalUrl = supabaseUrl || 'https://placeholder.supabase.co';
  const finalKey = key || 'placeholder-key';

  return createClient(finalUrl, finalKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}

export const supabaseAdmin = createConfiguredClient(supabaseServiceKey);

export function createSupabaseAuthClient() {
  return createConfiguredClient(supabaseAnonKey);
}
