/** 동적 퀘스트 미션 시스템 - 역할/기분에 따라 3~4개 랜덤 선택 */

import type { RoleType, MoodType } from './screens'

export type MissionType = 'photo' | 'text_input' | 'photo_with_prompt' | 'choice' | 'number_input' | 'arrival'

export interface Mission {
  id: string
  title: string
  description: string
  type: MissionType
  icon: string
  prompt?: string
  choices?: string[]
  roles?: RoleType[]
  moods?: MoodType[]
  feedLabel?: string
  required?: boolean
  xpBonus?: number
}

export const MISSION_POOL: Mission[] = [
  { id: 'arrival', title: '장소 도착 인증', description: '100m 이내에서 GPS 인증', type: 'arrival', icon: '📍', required: true, roles: [], moods: [], feedLabel: '도착 인증', xpBonus: 50 },
  { id: 'star_rating', title: '별점 평가', description: '이 장소에 별점을 매겨주세요', type: 'choice', icon: '⭐', choices: ['1점', '2점', '3점', '4점', '5점'], required: true, roles: [], moods: [], feedLabel: '별점', xpBonus: 30 },

  { id: 'best_angle', title: '이 장소 베스트 앵글', description: '가장 예쁜 각도로 장소 사진 한 장', type: 'photo', icon: '📸', roles: [], moods: [], feedLabel: '베스트 앵글', xpBonus: 40 },
  { id: 'selfie', title: '여기서 인증샷', description: '이 장소에서 나의 인증샷 찍기', type: 'photo', icon: '🤳', roles: [], moods: [], feedLabel: '인증샷', xpBonus: 40 },
  { id: 'hidden_detail', title: '숨은 디테일 발견', description: '남들이 잘 안 보는 디테일을 사진으로 포착', type: 'photo_with_prompt', icon: '🔍', prompt: '어떤 디테일을 발견했나요?', roles: ['explorer', 'challenger'], moods: [], feedLabel: '숨은 디테일', xpBonus: 60 },
  { id: 'vibe_photo', title: '이곳의 분위기 한 컷', description: '이 장소의 분위기가 느껴지는 사진', type: 'photo', icon: '🎨', roles: ['artist', 'healer'], moods: ['calm', 'inspired'], feedLabel: '분위기 한 컷', xpBonus: 40 },
  { id: 'food_photo', title: '시그니처 메뉴 촬영', description: '이 장소의 대표 메뉴/음식 사진', type: 'photo', icon: '🍽️', roles: ['foodie'], moods: [], feedLabel: '시그니처 메뉴', xpBonus: 50 },
  { id: 'before_after', title: '나의 Before & After', description: '방문 전 기대 vs 방문 후 실제 느낌 사진 2장', type: 'photo', icon: '🔄', roles: [], moods: ['curious', 'adventurous'], feedLabel: 'Before & After', xpBonus: 60 },

  { id: 'one_line_review', title: '한 줄 감성 리뷰', description: '이 장소를 한 문장으로 표현하면?', type: 'text_input', icon: '✍️', prompt: '한 문장으로 이 장소를 표현해주세요', roles: [], moods: [], feedLabel: '한 줄 리뷰', xpBonus: 30 },
  { id: 'recommend_menu', title: '추천 메뉴 입력', description: '가장 마음에 든 메뉴/상품은?', type: 'text_input', icon: '👨‍🍳', prompt: '추천 메뉴 또는 상품 이름', roles: ['foodie'], moods: [], feedLabel: '추천 메뉴', xpBonus: 30 },
  { id: 'mood_word', title: '기분을 한 단어로', description: '지금 이 장소에서의 기분은?', type: 'text_input', icon: '💭', prompt: '지금 기분을 한 단어로!', roles: ['healer'], moods: ['tired', 'stressed', 'sad'], feedLabel: '기분 한 단어', xpBonus: 20 },
  { id: 'tip_for_next', title: '다음 방문자에게 팁', description: '다음에 올 사람에게 한마디!', type: 'text_input', icon: '💡', prompt: '다음 방문자에게 전하는 팁', roles: ['explorer'], moods: [], feedLabel: '방문 팁', xpBonus: 30 },
  { id: 'story_moment', title: '오늘의 특별한 순간', description: '이곳에서 가장 기억에 남는 순간은?', type: 'text_input', icon: '✨', prompt: '가장 기억에 남는 순간을 적어주세요', roles: [], moods: ['happy', 'inspired'], feedLabel: '특별한 순간', xpBonus: 40 },
  { id: 'would_return', title: '재방문 이유 한마디', description: '다시 오고 싶은 이유가 있다면?', type: 'text_input', icon: '🔁', prompt: '다시 올 이유 한마디', roles: [], moods: [], feedLabel: '재방문 이유', xpBonus: 20 },

  { id: 'who_with', title: '누구와 오면 좋을까?', description: '이 장소는 누구와 함께?', type: 'choice', icon: '👥', choices: ['혼자', '연인', '친구', '가족', '동료'], roles: [], moods: [], feedLabel: '추천 동행', xpBonus: 20 },
  { id: 'best_time', title: '추천 방문 시간대', description: '이 장소는 언제가 베스트?', type: 'choice', icon: '🕐', choices: ['아침', '점심', '오후', '저녁', '밤'], roles: [], moods: [], feedLabel: '추천 시간', xpBonus: 20 },
  { id: 'vibe_tag', title: '이 장소 바이브 태그', description: '이곳의 분위기를 고르세요', type: 'choice', icon: '🏷️', choices: ['아늑한', '힙한', '조용한', '활기찬', '로맨틱한', '레트로'], roles: ['artist'], moods: [], feedLabel: '바이브 태그', xpBonus: 20 },
  { id: 'spend_range', title: '소비 금액대', description: '대략 얼마나 썼나요?', type: 'choice', icon: '💰', choices: ['~5천원', '~1만원', '~2만원', '~3만원', '3만원+'], roles: [], moods: [], feedLabel: '소비 금액', xpBonus: 20 },
  { id: 'noise_level', title: '소음 레벨 판정', description: '이 장소의 소음 레벨은?', type: 'choice', icon: '🔊', choices: ['매우 조용', '조용한 편', '보통', '활기찬', '시끌벅적'], roles: ['healer'], moods: ['tired', 'calm'], feedLabel: '소음 레벨', xpBonus: 20 },
  { id: 'challenge_complete', title: '도전 미션 클리어', description: '이 장소에서 새로운 걸 시도했나요?', type: 'choice', icon: '🏆', choices: ['새 메뉴 시도', '처음 온 장소', '사장님과 대화', '모르는 사람에게 추천받음'], roles: ['challenger'], moods: ['adventurous', 'curious'], feedLabel: '도전 미션', xpBonus: 50 },

  { id: 'stay_minutes', title: '체류 시간 기록', description: '이 장소에서 몇 분 있었나요?', type: 'number_input', icon: '⏱️', prompt: '체류 시간 (분)', roles: [], moods: [], feedLabel: '체류 시간', xpBonus: 10 },
]

export function selectMissions(role: RoleType, mood: MoodType): Mission[] {
  const required = MISSION_POOL.filter((m) => m.required)
  const optional = MISSION_POOL.filter((m) => !m.required)
  const scored = optional.map((m) => {
    let score = Math.random() * 10
    if (m.roles?.length && m.roles.includes(role)) score += 20
    if (m.moods?.length && m.moods.includes(mood)) score += 15
    if (!m.roles?.length && !m.moods?.length) score += 5
    return { mission: m, score }
  })
  scored.sort((a, b) => b.score - a.score)
  const selected: Mission[] = []
  let hasPhoto = false
  let hasInput = false
  for (const { mission } of scored) {
    if (selected.length >= 2) break
    if (!hasPhoto && (mission.type === 'photo' || mission.type === 'photo_with_prompt')) {
      selected.push(mission)
      hasPhoto = true
    } else if (!hasInput && (mission.type === 'text_input' || mission.type === 'choice' || mission.type === 'number_input')) {
      selected.push(mission)
      hasInput = true
    }
  }
  for (const { mission } of scored) {
    if (selected.length >= 2) break
    if (!selected.includes(mission)) selected.push(mission)
  }
  return [...required, ...selected]
}
