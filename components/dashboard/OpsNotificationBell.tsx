'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  NotificationPopover,
  type NotificationPopoverItem,
} from '@/components/ui/notification-popover'
import { createClient } from '@/lib/supabase/client'
import {
  deleteAllOpsNotifications,
  deleteOpsNotification,
  markAllOpsNotificationsRead,
  markOpsNotificationRead,
} from '@/lib/ops/notifications/service'
import { useOpsNotifications } from '@/lib/ops/notifications/use-ops-notifications'
import type { OpsNotificationRecord } from '@/lib/ops/notifications/types'
import { formatDateTimeHuman } from '@/lib/tickets/display'

const TYPE_LABELS: Record<OpsNotificationRecord['type'], string> = {
  task_assigned: 'Assigned',
  task_due: 'Due soon',
  task_overdue: 'Overdue',
  offer_accepted: 'Offer',
  hosting_renewal: 'Hosting',
  project_completed: 'Project',
  mention: 'Mention',
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
  const {
    userId,
    items,
    unreadCount,
    loading,
    error,
    refresh,
    removeNotification,
    removeAllNotifications,
  } = useOpsNotifications()
  const notifications = useMemo(() => items.map(toPopoverItem), [items])

  async function handleOpenItem(id: string) {
    const item = items.find(row => row.id === id)
    if (!item || !userId) return

    const supabase = createClient()
    if (!item.readAt) {
      try {
        await markOpsNotificationRead(supabase, userId, item.id)
      } catch {
        // Realtime update handles UI; navigation still works if marking read fails.
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
    } catch {
      await refresh()
    }
  }

  async function handleDismissItem(id: string) {
    if (!userId) return
    removeNotification(id)
    const supabase = createClient()
    try {
      await deleteOpsNotification(supabase, userId, id)
    } catch {
      await refresh()
    }
  }

  async function handleClearAll() {
    if (!userId || items.length === 0) return
    removeAllNotifications()
    const supabase = createClient()
    try {
      await deleteAllOpsNotifications(supabase, userId)
    } catch {
      await refresh()
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
      onDismissItem={handleDismissItem}
      onMarkAllRead={handleMarkAllRead}
      onClearAll={handleClearAll}
      unreadCount={unreadCount}
      loading={loading}
      error={error}
    />
  )
}
