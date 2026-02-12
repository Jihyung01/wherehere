/**
 * useUser Hook
 * Manages user session and profile data
 */

'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { userAPI } from '@/lib/api-client'
import type { User } from '@supabase/supabase-js'
import type { UserProfile, OnboardingData } from '@/types/api'
import { toast } from 'sonner'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const queryClient = useQueryClient()

  // Listen to auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  // Fetch user profile from backend
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: () => userAPI.getProfile(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<UserProfile>) => userAPI.updateProfile(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['user-profile', user?.id], data)
      toast.success('프로필이 업데이트되었습니다.')
    },
    onError: (error: any) => {
      toast.error(error.message || '프로필 업데이트에 실패했습니다.')
    },
  })

  // Complete onboarding mutation
  const completeOnboardingMutation = useMutation({
    mutationFn: (data: OnboardingData) => userAPI.completeOnboarding(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['user-profile', user?.id], data)
      toast.success('환영합니다! 🎉')
    },
    onError: (error: any) => {
      toast.error(error.message || '온보딩 완료에 실패했습니다.')
    },
  })

  // Fetch user stats
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: () => userAPI.getStats(),
    enabled: !!user && !!profile?.is_onboarded,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  return {
    // Auth state
    user,
    loading: loading || profileLoading,
    isAuthenticated: !!user,
    
    // Profile data
    profile,
    profileError,
    refetchProfile,
    
    // Stats
    stats,
    statsLoading,
    refetchStats,
    
    // Mutations
    updateProfile: updateProfileMutation.mutate,
    updateProfileAsync: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
    
    completeOnboarding: completeOnboardingMutation.mutate,
    completeOnboardingAsync: completeOnboardingMutation.mutateAsync,
    isCompletingOnboarding: completeOnboardingMutation.isPending,
  }
}
