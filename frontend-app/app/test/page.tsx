'use client'

import { useState } from 'react'

export default function TestPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testChallengeAPI = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/v1/challenges/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'test-user-123' })
      })
      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({ error: error.message })
    }
    setLoading(false)
  }

  const testPersonalityAPI = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/v1/ai/personality/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'test-user-123' })
      })
      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({ error: error.message })
    }
    setLoading(false)
  }

  const testPatternAPI = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/v1/ai/pattern/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'test-user-123', days: 90 })
      })
      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({ error: error.message })
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '20px' }}>
        🧪 WhereHere 새 기능 테스트
      </h1>
      
      <p style={{ marginBottom: '30px', color: '#666' }}>
        새로 추가된 8대 AI 기능을 테스트해보세요!
      </p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
        <button
          onClick={testChallengeAPI}
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: '#E8740C',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          🏆 챌린지 생성 테스트
        </button>

        <button
          onClick={testPersonalityAPI}
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          👤 성격 분석 테스트
        </button>

        <button
          onClick={testPatternAPI}
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: '#8B5CF6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          🗺️ 패턴 분석 테스트
        </button>
      </div>

      {loading && (
        <div style={{ padding: '20px', background: '#f0f0f0', borderRadius: '8px' }}>
          로딩 중...
        </div>
      )}

      {result && !loading && (
        <div style={{ 
          padding: '20px', 
          background: '#f9f9f9', 
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '15px' }}>
            결과:
          </h2>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            wordWrap: 'break-word',
            fontSize: '14px',
            background: 'white',
            padding: '15px',
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '600px'
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '20px', background: '#fff3cd', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
          ⚠️ 주의사항
        </h3>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>DB 마이그레이션을 먼저 실행해야 합니다</li>
          <li>Supabase Dashboard → SQL Editor에서 마이그레이션 파일 실행</li>
          <li>파일 위치: <code>supabase/migrations/20260213_extended_schema.sql</code></li>
        </ul>
      </div>

      <div style={{ marginTop: '20px', padding: '20px', background: '#e7f3ff', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
          📚 새로 추가된 기능
        </h3>
        <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
          <li><strong>AI 빅데이터 장소 수집</strong> - Kakao API 통합</li>
          <li><strong>개인화 AI 프로필</strong> - Big Five 성격 분석</li>
          <li><strong>맞춤형 미션 생성</strong> - 역할/장소별 동적 미션</li>
          <li><strong>소셜 공유 기능</strong> - OG 이미지, Kakao 공유</li>
          <li><strong>AI 동행자 가이드</strong> - 위치 기반 실시간 가이드</li>
          <li><strong>패턴 분석 지도</strong> - 90일 데이터 분석</li>
          <li><strong>AI 소셜 매칭</strong> - 모임 생성/참여</li>
          <li><strong>챌린지 메이커</strong> - 주간 챌린지 생성</li>
        </ol>
      </div>
    </div>
  )
}
