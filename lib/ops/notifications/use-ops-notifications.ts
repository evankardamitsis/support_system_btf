'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/database.types'
import {
  countUnreadOpsNotifications,
  listOpsNotifications,
  mapOpsNotificationRow,
} from '@/lib/ops/notifications/service'
import type { OpsNotificationRecord } from '@/lib/ops/notifications/types'
import { playNotificationChime } from '@/lib/ui/play-notification-chime'

type NotificationRow = Database['public']['Tables']['ops_notifications']['Row']

const LIST_LIMIT = 15
const FALLBACK_POLL_MS = 45_000

function sortNotifications(items: OpsNotificationRecord[]) {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

function upsertNotification(
  items: OpsNotificationRecord[],
  row: OpsNotificationRecord
): OpsNotificationRecord[] {
  const without = items.filter(item => item.id !== row.id)
  return sortNotifications([row, ...without]).slice(0, LIST_LIMIT)
}

function isNotificationRow(value: unknown): value is NotificationRow {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'user_id' in value &&
    'title' in value
  )
}

export function useOpsNotifications() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [items, setItems] = useState<OpsNotificationRecord[]>([])
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const itemsRef = useRef<OpsNotificationRecord[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const hasLoadedOnceRef = useRef(false)

  itemsRef.current = items

  const removeNotification = useCallback((id: string) => {
    setItems(prev => {
      const removed = prev.find(item => item.id === id)
      if (removed && !removed.readAt) {
        setUnreadCount(count => Math.max(0, count - 1))
      }
      return prev.filter(item => item.id !== id)
    })
  }, [])

  const removeAllNotifications = useCallback(() => {
    setItems([])
    setUnreadCount(0)
  }, [])

  const applyInsert = useCallback((row: OpsNotificationRecord) => {
    if (itemsRef.current.some(item => item.id === row.id)) return

    const isNewUnread = !row.readAt

    setItems(prev => upsertNotification(prev, row))

    if (isNewUnread) {
      setUnreadCount(count => count + 1)
      playNotificationChime()
    }
  }, [])

  const refresh = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setUserId(null)
      setUnreadCount(0)
      setItems([])
      setError(null)
      setLoading(false)
      setRealtimeConnected(false)
      return null
    }

    setUserId(user.id)

    try {
      const [count, notifications] = await Promise.all([
        countUnreadOpsNotifications(supabase, user.id),
        listOpsNotifications(supabase, user.id, LIST_LIMIT),
      ])

      const previousIds = new Set(itemsRef.current.map(item => item.id))
      const newUnread = notifications.filter(
        item => !item.readAt && !previousIds.has(item.id)
      )

      setUnreadCount(count)
      setItems(notifications)
      setError(null)

      if (hasLoadedOnceRef.current && newUnread.length > 0) {
        playNotificationChime()
      }
      hasLoadedOnceRef.current = true
    } catch (err) {
      setUnreadCount(0)
      setItems([])
      setError(err instanceof Error ? err.message : 'Could not load notifications')
    } finally {
      setLoading(false)
    }

    return user.id
  }, [])

  useEffect(() => {
    const onFocus = () => {
      void refresh()
    }

    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  useEffect(() => {
    if (realtimeConnected) return

    const interval = window.setInterval(() => {
      void refresh()
    }, FALLBACK_POLL_MS)

    return () => window.clearInterval(interval)
  }, [realtimeConnected, refresh])

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function bindRealtimeAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) return
      await supabase.realtime.setAuth(session.access_token)
    }

    async function setup() {
      const activeUserId = await refresh()
      if (cancelled || !activeUserId) return

      await bindRealtimeAuth()

      const handleInsert = (payload: RealtimePostgresChangesPayload<NotificationRow>) => {
        if (payload.eventType !== 'INSERT' || !isNotificationRow(payload.new)) return
        if (payload.new.user_id !== activeUserId) return
        applyInsert(mapOpsNotificationRow(payload.new))
      }

      const handleUpdate = (payload: RealtimePostgresChangesPayload<NotificationRow>) => {
        if (payload.eventType !== 'UPDATE' || !isNotificationRow(payload.new)) return
        if (payload.new.user_id !== activeUserId) return

        const row = mapOpsNotificationRow(payload.new)
        const existing = itemsRef.current.find(item => item.id === row.id)
        const wasUnread = existing ? !existing.readAt : false

        setItems(prev => upsertNotification(prev, row))

        if (wasUnread && !row.readAt) return
        if (wasUnread && row.readAt) {
          setUnreadCount(count => Math.max(0, count - 1))
        }
      }

      const handleDelete = (payload: RealtimePostgresChangesPayload<NotificationRow>) => {
        if (payload.eventType !== 'DELETE' || !payload.old?.id) return
        removeNotification(payload.old.id)
      }

      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

      const channel = supabase
        .channel(`ops-notifications:${activeUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ops_notifications',
          },
          handleInsert
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'ops_notifications',
          },
          handleUpdate
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'ops_notifications',
          },
          handleDelete
        )
        .subscribe(status => {
          if (cancelled) return
          setRealtimeConnected(status === 'SUBSCRIBED')
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setRealtimeConnected(false)
          }
        })

      channelRef.current = channel
    }

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        void supabase.realtime.setAuth(session.access_token)
      }
    })

    void setup()

    return () => {
      cancelled = true
      authSubscription.unsubscribe()
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setRealtimeConnected(false)
    }
  }, [applyInsert, refresh, removeNotification])

  return {
    userId,
    items,
    unreadCount,
    loading,
    error,
    realtimeConnected,
    refresh,
    removeNotification,
    removeAllNotifications,
  }
}
