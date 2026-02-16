/**
 * Authentication Types
 */

import { User, Session } from '@supabase/supabase-js'

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: Error | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupCredentials {
  email: string
  password: string
  username: string
}

export interface AuthError {
  message: string
  status?: number
}
