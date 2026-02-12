/**
 * Toast Component
 * Using sonner for toast notifications
 */

'use client'

import { Toaster } from 'sonner'

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: 'white',
          color: '#1f2937',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          padding: '1rem',
          fontSize: '0.875rem',
          fontWeight: '500',
        },
        className: 'toast',
      }}
      richColors
    />
  )
}
