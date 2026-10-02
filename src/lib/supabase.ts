import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configurationError = !url || !key ? 'Supabase configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then rebuild the application.' : null;
export const supabase = createClient(url || 'https://invalid.supabase.co', key || 'missing-configuration', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
});
export function checkError(error: { message: string } | null) { if (error) throw new Error(error.message); }