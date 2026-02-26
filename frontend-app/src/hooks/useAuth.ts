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
        toast.success('회원가입 성공! 이메일을 확인해주세요.')
        router.push('/onboarding')
      }

      return { data, error: null }
    } catch (error: any) {
      console.error('Signup error:', error)
      toast.error(error.message || '회원가입에 실패했습니다.')
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
        toast.success('로그인 성공!')
        router.push('/')
        router.refresh()
      }

      return { data, error: null }
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.message || '로그인에 실패했습니다.')
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
      // redirectTo 생략 시 Supabase Site URL로 리다이렉트 (Kakao KOE205 방지). Site URL을 https://도메인/auth/callback 로 설정할 것.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
      })

      if (error) throw error
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
