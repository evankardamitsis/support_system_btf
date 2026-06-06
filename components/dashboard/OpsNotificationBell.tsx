'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  NotificationPopover,
  type NotificationPopoverItem,
} from '@/components/ui/notification-popover'
import { createClient } from '@/lib/supabase/client'
import {
  countUnreadOpsNotifications,
  listOpsNotifications,
  markAllOpsNotificationsRead,
  markOpsNotificationRead,
} from '@/lib/ops/notifications/service'
import type { OpsNotificationRecord } from '@/lib/ops/notifications/types'
import { formatDateTimeHuman } from '@/lib/tickets/display'

const TYPE_LABELS: Record<OpsNotificationRecord['type'], string> = {
  task_assigned: 'Assigned',
  task_due: 'Due soon',
  task_overdue: 'Overdue',
  offer_accepted: 'Offer',
  hosting_renewal: 'Hosting',
  project_completed: 'Project',
}

function toPopoverItem(item: OpsNotificationRecord): NotificationPopoverItem {
  return {
    id: item.id,
    title: item.title,
    description: item.body ?? undefined,
    timeLabel: formatDateTimeHuman(item.createdAt),
    read: Boolean(item.readAt),
    badge: TYPE_LABELS[item.type],
  }
}

export function OpsNotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [items, setItems] = useState<OpsNotificationRecord[]>([])

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
      return
    }

    setUserId(user.id)
    try {
      const [count, notifications] = await Promise.all([
        countUnreadOpsNotifications(supabase, user.id),
        listOpsNotifications(supabase, user.id, 15),
      ])
      setUnreadCount(count)
      setItems(notifications)
      setError(null)
    } catch (err) {
      setUnreadCount(0)
      setItems([])
      setError(err instanceof Error ? err.message : 'Could not load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const interval = window.setInterval(() => void refresh(), 60_000)
    return () => window.clearInterval(interval)
  }, [refresh])

  const notifications = useMemo(() => items.map(toPopoverItem), [items])

  async function handleOpenItem(id: string) {
    const item = items.find(row => row.id === id)
    if (!item || !userId) return

    const supabase = createClient()
    if (!item.readAt) {
      try {
        await markOpsNotificationRead(supabase, userId, item.id)
        setUnreadCount(count => Math.max(0, count - 1))
        setItems(rows =>
          rows.map(row => (row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row))
        )
      } catch {
        // Navigation still works if marking read fails.
      }
    }

    setOpen(false)
    router.push(item.href)
  }

  async function handleMarkAllRead() {
    if (!userId || unreadCount === 0) return
    const supabase = createClient()
    try {
      await markAllOpsNotificationsRead(supabase, userId)
      const now = new Date().toISOString()
      setUnreadCount(0)
      setItems(rows => rows.map(row => ({ ...row, readAt: row.readAt ?? now })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark notifications as read')
    }
  }

  return (
    <NotificationPopover
      notifications={notifications}
      open={open}
      onOpenChange={nextOpen => {
        setOpen(nextOpen)
        if (nextOpen) void refresh()
      }}
      onItemClick={handleOpenItem}
      onMarkAllRead={handleMarkAllRead}
      unreadCount={unreadCount}
      loading={loading}
      error={error}
    />
  )
}
