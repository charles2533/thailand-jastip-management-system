import { createClient } from '@supabase/supabase-js'

// Note: intentionally NOT using supabase-js's generic `Database` typing here.
// This app instead types every query result explicitly at the call site
// (see src/services/*.ts, which cast to the Row types in src/types/database.ts).
// This keeps the client simple across supabase-js versions and avoids
// brittle generic-inference issues with the untyped query builder.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing Supabase environment variables. Copy .env.example to .env and fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
