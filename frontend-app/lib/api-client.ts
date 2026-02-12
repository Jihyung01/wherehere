/**
 * API Client
 * Handles all backend API calls with authentication
 */

import { createClient } from './supabase'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

/**
 * Get authentication headers with JWT token
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  
  return headers
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders()
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new APIError(
      error.detail || `HTTP ${response.status}`,
      response.status,
      error
    )
  }
  
  return response.json()
}

// ============================================================
// User API
// ============================================================

export interface UserProfile {
  id: string
  email: string
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
  last_location: { latitude: number; longitude: number } | null
  home_location: { latitude: number; longitude: number } | null
  is_onboarded: boolean
  onboarding_completed_at: string | null
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface OnboardingData {
  username: string
  display_name: string
  current_role: 'explorer' | 'healer' | 'archivist' | 'relation' | 'achiever'
  home_location?: { latitude: number; longitude: number }
}

export interface UserStats {
  total_quests: number
  completed_quests: number
  total_places_visited: number
  total_narratives: number
  favorite_categories: string[]
}

export const userAPI = {
  /**
   * Get current user profile
   */
  getProfile: () => 
    apiRequest<UserProfile>('/api/v1/users/me'),
  
  /**
   * Update current user profile
   */
  updateProfile: (data: Partial<UserProfile>) =>
    apiRequest<UserProfile>('/api/v1/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  /**
   * Complete onboarding
   */
  completeOnboarding: (data: OnboardingData) =>
    apiRequest<UserProfile>('/api/v1/users/me/onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  /**
   * Get user statistics
   */
  getStats: () =>
    apiRequest<UserStats>('/api/v1/users/me/stats'),
  
  /**
   * Get user by ID (public profile)
   */
  getUserById: (userId: string) =>
    apiRequest<UserProfile>(`/api/v1/users/${userId}`),
}

// ============================================================
// Health Check
// ============================================================

export const healthAPI = {
  check: () => apiRequest<{ status: string }>('/health'),
}
