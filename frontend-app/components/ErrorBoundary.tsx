'use client'

import React from 'react'

type Props = {
  children: React.ReactNode
  fallback?: React.ReactNode
}

type State = {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: '#0f1722',
            color: '#f3f7fb',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            일시적인 오류가 발생했어요
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(243,247,251,0.7)', marginBottom: 24, maxWidth: 320 }}>
            새로고침하거나 잠시 후 다시 시도해 주세요.
          </p>
          <button
            type="button"
            onClick={this.retry}
            style={{
              padding: '12px 24px',
              borderRadius: 12,
              border: 'none',
              background: '#E8740C',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 12,
              padding: '10px 20px',
              borderRadius: 12,
              border: '1px solid rgba(243,247,251,0.3)',
              background: 'transparent',
              color: 'rgba(243,247,251,0.9)',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            페이지 새로고침
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
