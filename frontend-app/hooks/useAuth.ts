/**
 * useAuth Hook
 * Handles authentication logic
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { LoginCredentials, SignupCredentials } from '@/types/auth'
import { toast } from 'sonner'

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  /**
   * Sign up with email and password
   */
  const signUp = async (credentials: SignupCredentials) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            username: credentials.username,
          },
        },
      })

      if (error) throw error

      if (data.user) {
        toast.success('진드기맨과 이제 여행을 시작한다')
        router.push('/onboarding')
      }

      return { data, error: null }
    } catch (error: any) {
      const msg = error?.message ?? ''
      const userMsg =
        msg.includes('already registered') ? '이미 가입된 이메일입니다. 로그인해 주세요.'
        : msg.includes('Email not confirmed') ? '이메일 인증이 필요합니다. 메일함을 확인해 주세요.'
        : msg || '회원가입에 실패했습니다.'
      toast.error(userMsg)
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Sign in with email and password
   */
  const signIn = async (credentials: LoginCredentials) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) throw error

      if (data.session) {
        toast.success('진드기맨과 이제 여행을 시작한다')
        router.push('/')
        router.refresh()
      }

      return { data, error: null }
    } catch (error: any) {
      const msg = error?.message ?? ''
      const userMsg =
        msg.includes('Invalid login credentials') ? '이메일 또는 비밀번호를 확인해 주세요.'
        : msg.includes('Email not confirmed') ? '이메일 인증이 필요합니다. 메일함을 확인해 주세요.'
        : msg || '로그인에 실패했습니다.'
      toast.error(userMsg)
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Sign in with OAuth (Kakao, Google, etc.)
   */
  const signInWithOAuth = async (provider: 'kakao' | 'google') => {
    setLoading(true)
    try {
      // redirectTo를 넣으면 Supabase가 Kakao 요청에 redirect_uri를 두 번 넣어 KOE205가 날 수 있음.
      // 생략 시 Supabase 대시보드 "Site URL"로 리다이렉트되므로, Site URL을 https://도메인/auth/callback 로 설정할 것.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
      })

      if (error) {
        toast.error(error.message || '소셜 로그인에 실패했습니다.')
        return { data: null, error }
      }
      if (data?.url) {
        window.location.href = data.url
        return { data, error: null }
      }
      return { data, error: null }
    } catch (error: any) {
      console.error('OAuth error:', error)
      toast.error(error.message || '소셜 로그인에 실패했습니다.')
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Sign out
   */
  const signOut = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      toast.success('로그아웃 되었습니다.')
      router.push('/login')
      router.refresh()

      return { error: null }
    } catch (error: any) {
      console.error('Signout error:', error)
      toast.error(error.message || '로그아웃에 실패했습니다.')
      return { error }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Reset password
   */
  const resetPassword = async (email: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      toast.success('비밀번호 재설정 이메일을 전송했습니다.')
      return { error: null }
    } catch (error: any) {
      console.error('Reset password error:', error)
      toast.error(error.message || '비밀번호 재설정에 실패했습니다.')
      return { error }
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    resetPassword,
  }
}
