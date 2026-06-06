'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { OpsCommsFabIcon } from '@/components/comms/OpsCommsFabIcon'
import { OpsCommsPanel } from '@/components/comms/OpsCommsPanel'
import { useStreamComms } from '@/lib/comms/use-stream-comms'
import { cn } from '@/lib/utils'

export function OpsCommsLauncher() {
  const [available, setAvailable] = useState<boolean | null>(null)
  const [portalReady, setPortalReady] = useState(false)
  const [open, setOpen] = useState(false)
  const shouldConnect = available === true
  const comms = useStreamComms(shouldConnect)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function probe() {
      try {
        const response = await fetch('/api/comms/token', { cache: 'no-store' })
        if (!cancelled) {
          setAvailable(response.status !== 503)
        }
      } catch {
        if (!cancelled) {
          setAvailable(false)
        }
      }
    }

    void probe()

    return () => {
      cancelled = true
    }
  }, [])

  if (available !== true || !portalReady) return null

  const unread = open ? 0 : comms.unreadCount

  const portal = (
    <div data-theme="dashboard" className={cn('ops-comms-portal', open && 'is-open')}>
      <OpsCommsPanel
        open={open}
        onClose={() => setOpen(false)}
        loading={comms.loading}
        error={comms.error}
        onRetry={() => void comms.reconnect()}
        chatClient={comms.chatClient}
        videoClient={comms.videoClient}
        credentials={comms.credentials}
      />

      <button
        type="button"
        className={cn(
          'ops-comms-fab',
          open && 'is-open',
          !open && unread > 0 && 'has-unread'
        )}
        aria-label={open ? 'Close COMMS' : 'Open COMMS'}
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        <span className="ops-comms-fab-glow" aria-hidden />
        <span className="ops-comms-fab-inner">
          {open ? (
            <X className="ops-comms-fab-icon" aria-hidden />
          ) : (
            <OpsCommsFabIcon className="ops-comms-fab-icon" />
          )}
          <span className="ops-comms-fab-label">COMMS</span>
        </span>
        {!open && unread > 0 ? (
          <span className="ops-comms-fab-badge" aria-label={`${unread} unread messages`}>
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>
    </div>
  )

  return createPortal(portal, document.body)
}
