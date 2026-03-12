'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export type GhostLevel = 'visible' | 'blur' | 'frozen' | 'hidden'

export type MovementStatus = 'stationary' | 'walking' | 'moving' | 'fast'

export const MOVEMENT_LABELS: Record<MovementStatus, string> = {
  stationary: '🟢 정지',
  walking: '🚶 걷는 중',
  moving: '🚗 이동 중',
  fast: '🚀 빠른 이동',
}

export const GHOST_LABELS: Record<GhostLevel, { icon: string; label: string; desc: string }> = {
  visible: { icon: '👁️', label: '위치 공유 중', desc: '친구들에게 정확한 위치가 공유돼요' },
  blur: { icon: '🌫️', label: '위치 흐림', desc: '약 1km 반경으로 흐리게 공유돼요' },
  frozen: { icon: '🧊', label: '위치 고정', desc: '마지막 위치에서 멈춘 것처럼 보여요' },
  hidden: { icon: '👻', label: '고스트 모드', desc: '친구들에게 위치가 보이지 않아요' },
}

export interface FriendLocation {
  user_id: string
  display_name: string
  avatar_url?: string
  lat: number
  lng: number
  speed_kmh?: number
  movement_status: MovementStatus
  ghost_level: GhostLevel
  online_at: string
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function classifySpeed(speedMs: number | null | undefined): MovementStatus {
  if (speedMs == null || speedMs < 0) return 'stationary'
  if (speedMs < 0.5) return 'stationary'
  if (speedMs < 2.0) return 'walking'
  if (speedMs < 10.0) return 'moving'
  return 'fast'
}

function blurCoords(lat: number, lng: number, level: GhostLevel): { lat: number; lng: number } {
  if (level === 'blur') {
    // ~1.1km precision (2 decimal places ≈ 1.11km)
    return { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 }
  }
  return { lat, lng }
}

function getDistM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ────────────────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────────────────

interface UseLocationSharingOptions {
  userId: string
  displayName?: string
  avatarUrl?: string
  ghostLevel: GhostLevel
  enabled: boolean
  proximityAlertMeters?: number
  apiBase: string
}

export function useLocationSharing({
  userId,
  displayName,
  avatarUrl,
  ghostLevel,
  enabled,
  proximityAlertMeters = 500,
  apiBase,
}: UseLocationSharingOptions) {
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [movementStatus, setMovementStatus] = useState<MovementStatus>('stationary')
  const [speedKmh, setSpeedKmh] = useState<number | null>(null)
  const [friendLocations, setFriendLocations] = useState<FriendLocation[]>([])
  const [isConnected, setIsConnected] = useState(false)

  const channelRef = useRef<any>(null)
  const watchIdRef = useRef<number | null>(null)
  const frozenPositionRef = useRef<{ lat: number; lng: number } | null>(null)
  const notifiedRef = useRef<Set<string>>(new Set())
  const myLocationRef = useRef<{ lat: number; lng: number } | null>(null)

  // Keep ref in sync with state for use inside callbacks
  useEffect(() => {
    myLocationRef.current = myLocation
  }, [myLocation])

  // ── Proximity check ──────────────────────────────────────
  const checkProximity = useCallback(
    (friends: FriendLocation[]) => {
      const me = myLocationRef.current
      if (!me) return
      friends.forEach((f) => {
        if (f.ghost_level === 'hidden') return
        const dist = getDistM(me.lat, me.lng, f.lat, f.lng)
        const key = f.user_id
        if (dist < proximityAlertMeters && !notifiedRef.current.has(key)) {
          notifiedRef.current.add(key)
          const distLabel = dist < 100 ? `${Math.round(dist)}m` : `약 ${Math.round(dist / 100) * 100}m`
          toast(`📍 ${f.display_name || '친구'}님이 ${distLabel} 근처에 있어요!`, {
            duration: 6000,
          })
          // Background push (best-effort)
          fetch(`${apiBase}/api/v1/push/notify-proximity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              friend_id: f.user_id,
              friend_name: f.display_name || '친구',
              distance_m: Math.round(dist),
            }),
          }).catch(() => {})
        } else if (dist >= proximityAlertMeters * 1.5) {
          notifiedRef.current.delete(key) // Reset so it can re-notify later
        }
      })
    },
    [userId, proximityAlertMeters, apiBase]
  )

  // ── Supabase Presence subscription ──────────────────────
  useEffect(() => {
    if (!userId || userId === 'user-demo-001') return

    const supabase = createClient()
    if (typeof (supabase as any).channel !== 'function') return

    const channel = (supabase as any).channel('wherehere-locations', {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        try {
          const state = channel.presenceState() as Record<string, any[]>
          const locs: FriendLocation[] = []
          Object.entries(state).forEach(([uid, presences]) => {
            if (uid === userId || !presences.length) return
            const p = presences[presences.length - 1]
            if (!p || p.ghost_level === 'hidden') return
            if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return
            locs.push({
              user_id: uid,
              display_name: p.display_name || uid.slice(0, 8),
              avatar_url: p.avatar_url,
              lat: p.lat,
              lng: p.lng,
              speed_kmh: p.speed_kmh,
              movement_status: p.movement_status || 'stationary',
              ghost_level: p.ghost_level || 'visible',
              online_at: p.online_at || new Date().toISOString(),
            })
          })
          setFriendLocations(locs)
          checkProximity(locs)
        } catch (err) {
          console.warn('[LocationSharing] presence sync error:', err)
        }
      })
      .on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
        if (key === userId) return
        setFriendLocations((prev) => prev.filter((f) => f.user_id !== key))
      })
      .subscribe(async (status: string) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      try {
        ;(supabase as any).removeChannel(channel)
      } catch (_) {}
      channelRef.current = null
      setIsConnected(false)
    }
  }, [userId, checkProximity])

  // ── Broadcast my location ────────────────────────────────
  const broadcastLocation = useCallback(
    async (lat: number, lng: number, speedMs: number | null) => {
      if (!channelRef.current) return
      if (!enabled || ghostLevel === 'hidden') {
        // Untrack when sharing is disabled or fully hidden
        try { channelRef.current.untrack?.() } catch (_) {}
        return
      }
      if (ghostLevel === 'frozen') {
        // Don't update; keep the last tracked position
        return
      }

      const status = classifySpeed(speedMs)
      setMovementStatus(status)
      const kmh = speedMs != null && speedMs >= 0 ? Math.round(speedMs * 3.6 * 10) / 10 : null
      setSpeedKmh(kmh)

      const blurred = blurCoords(lat, lng, ghostLevel)

      try {
        await channelRef.current.track({
          user_id: userId,
          display_name: displayName || userId.slice(0, 8),
          avatar_url: avatarUrl,
          lat: blurred.lat,
          lng: blurred.lng,
          speed_kmh: kmh ?? undefined,
          movement_status: status,
          ghost_level: ghostLevel,
          online_at: new Date().toISOString(),
        })
      } catch (_) {}
    },
    [userId, displayName, avatarUrl, ghostLevel, enabled]
  )

  // ── watchPosition ────────────────────────────────────────
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    if (!enabled || !userId || userId === 'user-demo-001') {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, speed } = pos.coords
        setMyLocation({ lat, lng })

        const status = classifySpeed(speed)
        setMovementStatus(status)

        if (ghostLevel === 'frozen') {
          // Save frozen position once then stop broadcasting new ones
          if (!frozenPositionRef.current) {
            frozenPositionRef.current = { lat, lng }
            broadcastLocation(lat, lng, speed)
          }
        } else {
          frozenPositionRef.current = null
          broadcastLocation(lat, lng, speed)
        }
      },
      (err) => {
        // Non-critical; watchPosition continues
        console.warn('[LocationSharing] watchPosition error:', err.message)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15_000,
        timeout: 30_000,
      }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [enabled, userId, ghostLevel, broadcastLocation])

  // ── When ghost = hidden, untrack immediately ─────────────
  useEffect(() => {
    if (ghostLevel === 'hidden' && channelRef.current) {
      try { channelRef.current.untrack?.() } catch (_) {}
    }
  }, [ghostLevel])

  // ── Untrack on unmount ───────────────────────────────────
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        try { channelRef.current.untrack?.() } catch (_) {}
      }
    }
  }, [])

  return {
    myLocation,
    movementStatus,
    speedKmh,
    friendLocations,
    isConnected,
  }
}
