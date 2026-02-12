/**
 * Onboarding Page
 * Multi-step onboarding flow
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { NicknameStep } from '@/components/onboarding/nickname-step'
import { RoleSelectionStep } from '@/components/onboarding/role-selection-step'
import { WelcomeStep } from '@/components/onboarding/welcome-step'
import { useUser } from '@/hooks/useUser'
import type { RoleType } from '@/types/api'
import { toast } from 'sonner'

type OnboardingStep = 'nickname' | 'role' | 'welcome'

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('nickname')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null)
  
  const { completeOnboardingAsync, isCompletingOnboarding } = useUser()
  const router = useRouter()

  const handleNicknameNext = (data: { username: string; displayName: string }) => {
    setUsername(data.username)
    setDisplayName(data.displayName)
    setCurrentStep('role')
  }

  const handleRoleNext = async (role: RoleType) => {
    setSelectedRole(role)
    
    // Complete onboarding
    try {
      await completeOnboardingAsync({
        username,
        display_name: displayName,
        current_role: role,
      })
      
      setCurrentStep('welcome')
    } catch (error: any) {
      console.error('Onboarding error:', error)
      toast.error(error.message || '온보딩 완료에 실패했습니다.')
    }
  }

  const handleRoleBack = () => {
    setCurrentStep('nickname')
  }

  const handleWelcomeBack = () => {
    setCurrentStep('role')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-12">
      <div className="w-full">
        {currentStep === 'nickname' && (
          <div className="flex justify-center">
            <NicknameStep onNext={handleNicknameNext} />
          </div>
        )}

        {currentStep === 'role' && (
          <div className="flex justify-center">
            <RoleSelectionStep
              onNext={handleRoleNext}
              onBack={handleRoleBack}
            />
          </div>
        )}

        {currentStep === 'welcome' && selectedRole && (
          <div className="flex justify-center">
            <WelcomeStep
              displayName={displayName}
              role={selectedRole}
              onBack={handleWelcomeBack}
            />
          </div>
        )}

        {/* Loading overlay */}
        {isCompletingOnboarding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="rounded-2xl bg-white p-8 text-center">
              <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              <p className="text-lg font-medium text-gray-900">
                프로필을 설정하는 중...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
