import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL y SUPABASE_KEY deben estar definidos (ver .env)',
    );
  }

  cached = createClient(url, key);
  return cached;
}
