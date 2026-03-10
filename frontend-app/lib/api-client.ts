/**
 * WhereHere API Client
 * 브라우저에서는 같은 출처(프록시) 사용 → CORS 방지. SSR에서는 백엔드 URL 사용.
 */
const API_BASE =
  typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')

// ============================================================
// AI Features
// ============================================================

export async function analyzePersonality(userId: string) {
  const response = await fetch(`${API_BASE}/api/v1/ai/personality/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId })
  })
  return response.json()
}

export async function getPersonality(userId: string) {
  const response = await fetch(`${API_BASE}/api/v1/ai/personality/${userId}`)
  return response.json()
}

export async function getArrivalGuide(userId: string, questId: string, placeId: string) {
  const response = await fetch(`${API_BASE}/api/v1/ai/arrival`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, quest_id: questId, place_id: placeId })
  })
  return response.json()
}

export async function analyzePattern(userId: string, days: number = 90) {
  const response = await fetch(`${API_BASE}/api/v1/ai/pattern/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, days })
  })
  return response.json()
}

export async function generatePersonalizedMessage(
  userId: string,
  contextType: string,
  contextData: any
) {
  const response = await fetch(`${API_BASE}/api/v1/ai/message/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, context_type: contextType, context_data: contextData })
  })
  return response.json()
}

// ============================================================
// Challenges
// ============================================================

export async function generateChallenge(userId: string) {
  const response = await fetch(`${API_BASE}/api/v1/challenges/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId })
  })
  return response.json()
}

export async function getChallengeProgress(challengeId: string, userId: string) {
  const response = await fetch(
    `${API_BASE}/api/v1/challenges/${challengeId}/progress?user_id=${userId}`
  )
  return response.json()
}

export async function completeChallenge(challengeId: string, userId: string) {
  const response = await fetch(`${API_BASE}/api/v1/challenges/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challenge_id: challengeId, user_id: userId })
  })
  return response.json()
}

// ============================================================
// Social
// ============================================================

export async function createGathering(
  creatorId: string,
  placeId: string,
  scheduledTime: string,
  title?: string,
  description?: string,
  maxParticipants: number = 4
) {
  const response = await fetch(`${API_BASE}/api/v1/social/gatherings/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creator_id: creatorId,
      place_id: placeId,
      scheduled_time: scheduledTime,
      title,
      description,
      max_participants: maxParticipants
    })
  })
  return response.json()
}

export async function joinGathering(gatheringId: string, userId: string) {
  const response = await fetch(`${API_BASE}/api/v1/social/gatherings/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gathering_id: gatheringId, user_id: userId })
  })
  return response.json()
}

export async function getGatheringDetails(gatheringId: string, userId: string) {
  const response = await fetch(
    `${API_BASE}/api/v1/social/gatherings/${gatheringId}?user_id=${userId}`
  )
  return response.json()
}

export async function getRecommendedGatherings(userId: string, limit: number = 10) {
  const response = await fetch(
    `${API_BASE}/api/v1/social/gatherings/recommended/${userId}?limit=${limit}`
  )
  return response.json()
}

export async function findMatches(
  userId: string,
  placeId: string,
  scheduledTime: string,
  maxDistanceKm: number = 5.0
) {
  const response = await fetch(`${API_BASE}/api/v1/social/matches/find`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      place_id: placeId,
      scheduled_time: scheduledTime,
      max_distance_km: maxDistanceKm
    })
  })
  return response.json()
}

export async function createShareLink(
  userId: string,
  questId: string,
  placeId: string,
  questData: any
) {
  const response = await fetch(`${API_BASE}/api/v1/social/share/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      quest_id: questId,
      place_id: placeId,
      quest_data: questData
    })
  })
  return response.json()
}

export async function getShareData(shareId: string) {
  const response = await fetch(`${API_BASE}/api/v1/social/share/${shareId}`)
  return response.json()
}

// ============================================================
// Existing API (기존 API)
// ============================================================

export async function getRecommendations(
  latitude: number,
  longitude: number,
  roleType: string,
  mood: string
) {
  const response = await fetch(`${API_BASE}/api/v1/recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role_type: roleType,
      current_location: {
        latitude,
        longitude
      },
      mood: {
        mood_text: mood,
        intensity: 0.7
      }
    })
  })
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }
  
  return response.json()
}

/** 2단계: 팔로우한 친구들이 별점 4 이상 준 장소 (GET /api/v1/recommendations/friend-picks) */
export async function getFriendPicks(
  userId: string,
  lat: number,
  lng: number,
  limit: number = 5
) {
  const params = new URLSearchParams({
    user_id: userId,
    lat: String(lat),
    lng: String(lng),
    limit: String(limit),
  })
  const response = await fetch(`${API_BASE}/api/v1/recommendations/friend-picks?${params}`)
  if (!response.ok) return { friend_picks: [], has_data: false, source: 'error' }
  return response.json()
}

// User API stub (for compatibility with hooks/useUser.ts)
export const userAPI = {
  getProfile: async (userId: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`)
    if (!response.ok) throw new Error('Failed to fetch user profile')
    return response.json()
  },
  updateProfile: async (userId: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to update user profile')
    return response.json()
  },
  completeOnboarding: async (userId: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to complete onboarding')
    return response.json()
  }
}
