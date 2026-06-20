import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL ERROR: Supabase environment variables are missing! Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel project environment variables settings.');
}

// Fallback to placeholder string to prevent the library from throwing an uncaught error at import time
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

window.supabase = supabase;

