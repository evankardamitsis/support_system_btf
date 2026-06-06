'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type NotificationPopoverItem = {
  id: string
  title: string
  description?: string
  timeLabel: string
  read: boolean
  badge?: string
}

type NotificationItemProps = {
  notification: NotificationPopoverItem
  index: number
  onClick: (id: string) => void
  reducedMotion: boolean
}

function NotificationItem({
  notification,
  index,
  onClick,
  reducedMotion,
}: NotificationItemProps) {
  return (
    <motion.button
      type="button"
      role="menuitem"
      initial={reducedMotion ? false : { opacity: 0, x: 12, filter: 'blur(6px)' }}
      animate={reducedMotion ? undefined : { opacity: 1, x: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.22, delay: reducedMotion ? 0 : index * 0.05 }}
      className={cn(
        'ops-notify-popover-item',
        !notification.read && 'ops-notify-popover-item--unread'
      )}
      onClick={() => onClick(notification.id)}
    >
      <div className="ops-notify-popover-item-head">
        <div className="ops-notify-popover-item-title-row">
          {!notification.read ? (
            <span className="ops-notify-popover-dot" aria-hidden />
          ) : null}
          {notification.badge ? (
            <span className="ops-notify-popover-kind">{notification.badge}</span>
          ) : null}
          <span className="ops-notify-popover-title">{notification.title}</span>
        </div>
        <span className="ops-notify-popover-time">{notification.timeLabel}</span>
      </div>
      {notification.description ? (
        <p className="ops-notify-popover-item-body">{notification.description}</p>
      ) : null}
    </motion.button>
  )
}

export type NotificationPopoverProps = {
  notifications: NotificationPopoverItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onItemClick: (id: string) => void
  onMarkAllRead?: () => void
  unreadCount?: number
  loading?: boolean
  error?: string | null
  emptyLabel?: string
  className?: string
  buttonClassName?: string
  popoverClassName?: string
}

export function NotificationPopover({
  notifications,
  open,
  onOpenChange,
  onItemClick,
  onMarkAllRead,
  unreadCount: unreadCountProp,
  loading = false,
  error = null,
  emptyLabel = 'No notifications yet',
  className,
  buttonClassName,
  popoverClassName,
}: NotificationPopoverProps) {
  const prefersReducedMotion = useReducedMotion()
  const reducedMotion = Boolean(prefersReducedMotion)
  const anchorRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [portalReady, setPortalReady] = useState(false)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})

  const unreadCount =
    unreadCountProp ?? notifications.filter(notification => !notification.read).length
  const showMarkAll = unreadCount > 0 && onMarkAllRead

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return

    function updatePosition() {
      const rect = anchorRef.current!.getBoundingClientRect()
      setPanelStyle({
        position: 'fixed',
        top: rect.bottom + 8,
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

    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (anchorRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      onOpenChange(false)
    }

    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const panel = portalReady ? (
    <div data-theme="dashboard" className="ops-notify-popover-portal">
      <AnimatePresence>
        {open ? (
          <motion.div
            key="ops-notify-popover-panel"
            ref={panelRef}
            role="menu"
            initial={reducedMotion ? false : { opacity: 0, y: 8, scale: 0.97 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className={cn('ops-notify-popover-panel', popoverClassName)}
            style={panelStyle}
          >
          <div className="ops-notify-popover-head">
            <h3 className="ops-notify-popover-head-title">Notifications</h3>
            {showMarkAll ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ops-notify-popover-mark-all"
                onClick={onMarkAllRead}
              >
                Mark all read
              </Button>
            ) : null}
          </div>

          <div className="ops-notify-popover-body">
            {loading ? (
              <p className="ops-notify-popover-status">Loading…</p>
            ) : error ? (
              <p className="ops-notify-popover-status ops-notify-popover-status--error">{error}</p>
            ) : notifications.length === 0 ? (
              <p className="ops-notify-popover-status">{emptyLabel}</p>
            ) : (
              <div className="ops-notify-popover-list">
                {notifications.map((notification, index) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    index={index}
                    onClick={onItemClick}
                    reducedMotion={reducedMotion}
                  />
                ))}
              </div>
            )}
          </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  ) : null

  return (
    <div ref={anchorRef} className={cn('ops-notify-popover-wrap', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn('ops-notify-popover-trigger', buttonClassName)}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => onOpenChange(!open)}
      >
        <Bell size={16} strokeWidth={2} aria-hidden />
        {unreadCount > 0 ? (
          <span className="ops-notify-popover-badge" aria-hidden>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </Button>

      {panel ? createPortal(panel, document.body) : null}
    </div>
  )
}
