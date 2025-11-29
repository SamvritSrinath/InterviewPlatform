'use client';

import {createBrowserClient as createSSRBrowserClient} from '@supabase/ssr';
import {Database} from './types';

export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Env vars are required - this should be checked before calling this function
  // But we provide a clear error message if they're missing
  if (!url || !anonKey) {
    throw new Error(
      '@supabase/ssr: Your project\'s URL and API key are required to create a Supabase client!\n\n' +
      'Check your Supabase project\'s API settings to find these values\n' +
      'https://supabase.com/dashboard/project/_/settings/api\n\n' +
      'Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment variables.'
    );
  }

  return createSSRBrowserClient<Database>(url, anonKey);
}

