/**
 * API Response Types
 */

export type RoleType = 'explorer' | 'healer' | 'archivist' | 'relation' | 'achiever'

export interface Location {
  latitude: number
  longitude: number
}

export interface UserProfile {
  id: string
  email: string
  username: string
  display_name: string | null
  bio: string | null
  profile_image_url: string | null
  current_role: RoleType
  level: number
  total_xp: number
  xp_to_next_level: number
  current_streak: number
  longest_streak: number
  last_active_date: string | null
  last_location: Location | null
  home_location: Location | null
  is_onboarded: boolean
  onboarding_completed_at: string | null
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface OnboardingData {
  username: string
  display_name: string
  current_role: RoleType
  home_location?: Location
}

export interface UserStats {
  total_quests: number
  completed_quests: number
  total_places_visited: number
  total_narratives: number
  favorite_categories: string[]
}

export interface APIError {
  detail: string
  status?: number
}
