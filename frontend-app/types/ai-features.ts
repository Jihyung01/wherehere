/**
 * AI 기능 타입 정의
 */

// Big Five 성격 모델
export interface Personality {
  openness: number
  conscientiousness: number
  extraversion: number
  agreeableness: number
  neuroticism: number
  reasoning?: {
    openness: string
    conscientiousness: string
    extraversion: string
    agreeableness: string
    neuroticism: string
  }
}

// AI 동행자 스타일
export interface CompanionStyle {
  tone: 'friendly' | 'formal' | 'energetic' | 'calm' | 'reassuring'
  emoji_usage: 'high' | 'medium' | 'low'
  formality: 'casual' | 'polite' | 'formal'
  encouragement_level: number
  example_messages?: string[]
}

// 사용자 프로필
export interface UserProfile {
  personality: Personality
  companion_style: CompanionStyle
  preferred_categories: string[]
  behavior_stats: {
    total_visits: number
    avg_duration: number
    social_ratio: number
  }
}

// 챌린지
export interface Challenge {
  challenge_id?: string
  title: string
  description: string
  theme: string
  difficulty: 'easy' | 'medium' | 'hard'
  duration_days: number
  places: ChallengePlace[]
  rewards: ChallengeRewards
  tips: string
  created_at?: string
  deadline?: string
  status?: 'active' | 'completed' | 'failed' | 'abandoned'
  estimated_cost?: number
  estimated_time?: string
}

export interface ChallengePlace {
  name: string
  category: string
  region: string
  why: string
  order: number
  mission_hint?: string
  place_id?: string | null
  completed: boolean
}

export interface ChallengeRewards {
  xp: number
  badge_code: string
  badge_name: string
  unlock?: string | null
}

// 챌린지 진행 상황
export interface ChallengeProgress {
  challenge: Challenge
  completed_places: string[]
  completed_count: number
  total_places: number
  progress: number
  days_left: number
  ai_comment: string
  next_recommendation: ChallengePlace | null
}

// 패턴 분석
export interface PatternAnalysis {
  stats: {
    total_visits: number
    category_distribution: Record<string, string>
    time_preference: Record<string, string>
    avg_duration: number
    avg_budget: number
    max_budget: number
    total_distance_km: number
    exploration_radius_km: number
    main_region: string
  }
  ai_analysis: {
    style_name: string
    style_emoji: string
    style_description: string
    characteristics: string[]
    recommendations: PatternRecommendation[]
  }
  journey_map_data: {
    polyline: Array<{ lat: number; lng: number }>
    markers: Array<{
      lat: number
      lng: number
      place_name: string
      category: string
      completed_at: string
    }>
  }
}

export interface PatternRecommendation {
  place_name: string
  category: string
  reason: string
  match_probability: number
  why_match: string
}

// 모임
export interface Gathering {
  gathering_id?: string
  creator_id: string
  place_id: string
  title: string
  description: string
  scheduled_time: string
  max_participants: number
  current_participants: number
  status: 'open' | 'full' | 'completed' | 'cancelled'
  created_at?: string
  place?: any
  creator?: any
  matches?: UserMatch[]
}

export interface UserMatch {
  user: any
  match_score: number
  reasons: string[]
  compatibility: 'excellent' | 'good' | 'fair' | 'poor'
}

// 공유
export interface ShareLink {
  share_id: string
  share_url: string
  og_image_url: string
  title: string
  description: string
  kakao_share_data: any
}

// 도착 가이드
export interface ArrivalGuide {
  guide: {
    welcome: string
    recommended_spot: string
    recommended_menu: string
    photo_spot: string
    local_tip: string
    estimated_duration: number
    review_sources: string[]
  }
  missions: Mission[]
  next_recommendations: any[]
  weather: {
    condition: string
    condition_kr: string
    temperature: number
    humidity: number
  }
}

export interface Mission {
  type: string
  title: string
  description: string
  xp: number
  difficulty: 'easy' | 'medium' | 'hard'
  icon: string
  auto_complete?: boolean
}

// 뱃지
export interface Badge {
  id: string
  code: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  unlock_condition: any
  earned_at?: string
}
