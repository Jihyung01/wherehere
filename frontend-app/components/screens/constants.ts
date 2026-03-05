/** 역할/기분 타입 및 상수 - 화면 컴포넌트와 complete-app에서 공유 */

export type RoleType = 'explorer' | 'healer' | 'artist' | 'foodie' | 'challenger'
export type MoodType = 'curious' | 'tired' | 'creative' | 'hungry' | 'adventurous' | 'calm' | 'inspired' | 'stressed' | 'sad' | 'happy'

export const ROLES = [
  { id: 'explorer' as RoleType, name: '탐험가', icon: '🧭', description: '숨겨진 보석을 찾아 떠나는 모험가', color: '#E8740C' },
  { id: 'healer' as RoleType, name: '힐러', icon: '🌿', description: '지친 마음을 달래는 휴식 전문가', color: '#10B981' },
  { id: 'artist' as RoleType, name: '예술가', icon: '🎨', description: '영감을 찾아 떠나는 창작자', color: '#8B5CF6' },
  { id: 'foodie' as RoleType, name: '미식가', icon: '🍜', description: '맛의 세계를 탐험하는 미각 전문가', color: '#F59E0B' },
  { id: 'challenger' as RoleType, name: '도전자', icon: '⚡', description: '한계를 넘어서는 도전 정신', color: '#EF4444' },
]

export const MOODS = [
  { id: 'curious' as MoodType, name: '호기심 가득', icon: '🔍', color: '#E8740C' },
  { id: 'tired' as MoodType, name: '지쳐있어요', icon: '😴', color: '#10B981' },
  { id: 'creative' as MoodType, name: '영감 필요', icon: '✨', color: '#8B5CF6' },
  { id: 'hungry' as MoodType, name: '배고파요', icon: '🍽️', color: '#F59E0B' },
  { id: 'adventurous' as MoodType, name: '모험 준비됨', icon: '🚀', color: '#EF4444' },
  { id: 'calm' as MoodType, name: '차분해요', icon: '🍃', color: '#10B981' },
  { id: 'inspired' as MoodType, name: '영감 받았어요', icon: '💡', color: '#8B5CF6' },
  { id: 'stressed' as MoodType, name: '스트레스', icon: '😤', color: '#F59E0B' },
  { id: 'sad' as MoodType, name: '우울해요', icon: '😢', color: '#6B7280' },
  { id: 'happy' as MoodType, name: '기분 좋아요', icon: '😊', color: '#E8740C' },
]
