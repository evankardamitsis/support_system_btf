'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
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

export function OpsNotificationBell() {
  const router = useRouter()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [items, setItems] = useState<OpsNotificationRecord[]>([])
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})

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
    setMounted(true)
    void refresh()
    const interval = window.setInterval(() => void refresh(), 60_000)
    return () => window.clearInterval(interval)
  }, [refresh])

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return

    function updatePosition() {
      const rect = buttonRef.current!.getBoundingClientRect()
      setPanelStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        right: Math.max(8, window.innerWidth - rect.right),
        width: Math.min(320, window.innerWidth - 16),
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node
      if (buttonRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function handleOpenItem(item: OpsNotificationRecord) {
    if (!userId) return
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

  const panel = open && mounted ? (
    <div data-theme="dashboard" className="ops-notify-portal">
      <div
        ref={panelRef}
        className="ops-notify-panel ops-notify-panel--portal anim-fade"
        style={panelStyle}
        role="menu"
      >
      <div className="ops-notify-panel-head">
        <p className="ops-notify-panel-title">Notifications</p>
        {unreadCount > 0 ? (
          <button type="button" className="ops-notify-mark-all" onClick={handleMarkAllRead}>
            Mark all read
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="ops-notify-status">Loading…</p>
      ) : error ? (
        <p className="ops-notify-status ops-notify-status--error">{error}</p>
      ) : items.length === 0 ? (
        <p className="ops-notify-status">No notifications yet</p>
      ) : (
        <ul className="ops-notify-list">
          {items.map(item => (
            <li key={item.id}>
              <button
                type="button"
                role="menuitem"
                className={`ops-notify-item${item.readAt ? '' : ' ops-notify-item--unread'}`}
                onClick={() => handleOpenItem(item)}
              >
                <span className="ops-notify-item-kind">{TYPE_LABELS[item.type]}</span>
                <span className="ops-notify-item-title">{item.title}</span>
                {item.body ? <span className="ops-notify-item-body">{item.body}</span> : null}
                <span className="ops-notify-item-time">{formatDateTimeHuman(item.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  ) : null

  return (
    <div className="ops-notify-wrap">
      <button
        ref={buttonRef}
        type="button"
        className="ops-notify-btn"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          setOpen(value => !value)
          if (!open) void refresh()
        }}
      >
        <Bell size={16} strokeWidth={2} aria-hidden />
        {unreadCount > 0 ? (
          <span className="ops-notify-badge" aria-hidden>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  )
}
