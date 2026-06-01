// config/supabase.js — Cloudflare Workers compatible
import { createClient } from '@supabase/supabase-js';

// In Workers, env vars come from the request context (c.env)
// This factory is called per-request with the env object
export function getSupabase(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}
