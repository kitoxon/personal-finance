'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserClientPromise: Promise<SupabaseClient> | null = null;

export const getSupabaseBrowserClient = async (): Promise<SupabaseClient | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase browser client env vars are missing.');
    return null;
  }

  if (!browserClientPromise) {
    browserClientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(supabaseUrl, supabaseAnonKey)
    );
  }

  return browserClientPromise;
};
