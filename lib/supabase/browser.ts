import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserClient: SupabaseClient | undefined;

const ensureEnv = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase browser client requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
};

export const getSupabaseBrowserClient = () => {
  if (!browserClient) {
    ensureEnv();
    browserClient = createClient(supabaseUrl!, supabaseAnonKey!);
  }

  return browserClient;
};
