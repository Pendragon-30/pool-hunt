import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  // This is expected until you've created your Supabase project and
  // added VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to your .env file.
  console.warn(
    'Supabase environment variables are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to a .env file (see .env.example).',
  )
}

export const supabase = createClient<Database>(supabaseUrl ?? '', supabaseAnonKey ?? '')
