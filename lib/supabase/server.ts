import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let serverClient: SupabaseClient | undefined;

const ensureEnv = () => {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase server client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
};

export const getSupabaseServerClient = () => {
  if (!serverClient) {
    ensureEnv();
    serverClient = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: {
        persistSession: false,
      },
    });
  }

  return serverClient;
};
