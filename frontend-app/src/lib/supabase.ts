/**
 * Supabase Client Configuration
 * Handles authentication and database connections
 * Build-safe: when URL/Key are missing (e.g. Vercel build), returns a no-op client so build does not fail.
 */

import { createBrowserClient } from '@supabase/ssr'

function createNoopClient() {
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: (_callback: any) => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signOut: () => Promise.resolve({ error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
  } as ReturnType<typeof createBrowserClient>
}

// Client-side Supabase client (for use in Client Components)
export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return createNoopClient()
  }
  return createBrowserClient(url, key)
}

// Database types (will be auto-generated later with Supabase CLI)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          display_name: string | null
          bio: string | null
          profile_image_url: string | null
          current_role: 'explorer' | 'healer' | 'archivist' | 'relation' | 'achiever'
          level: number
          total_xp: number
          xp_to_next_level: number
          current_streak: number
          longest_streak: number
          last_active_date: string | null
          is_onboarded: boolean
          onboarding_completed_at: string | null
          created_at: string
          updated_at: string
          is_active: boolean
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          current_role?: 'explorer' | 'healer' | 'archivist' | 'relation' | 'achiever'
        }
        Update: {
          username?: string
          display_name?: string | null
          bio?: string | null
          current_role?: 'explorer' | 'healer' | 'archivist' | 'relation' | 'achiever'
        }
      }
    }
  }
}
