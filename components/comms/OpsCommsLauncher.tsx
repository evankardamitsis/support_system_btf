'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { OpsCommsFabIcon } from '@/components/comms/OpsCommsFabIcon'
import { OpsCommsPanel } from '@/components/comms/OpsCommsPanel'
import { useComms } from '@/lib/comms/comms-context'
import { useStreamComms } from '@/lib/comms/use-stream-comms'
import { cn } from '@/lib/utils'

export function OpsCommsLauncher() {
  const [portalReady, setPortalReady] = useState(false)
  const {
    panelOpen,
    setPanelOpen,
    activeChannelId,
    setActiveChannelId,
    setHuddleAutoOpen,
  } = useComms()
  const comms = useStreamComms()

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    comms.setPanelOpen(panelOpen)
  }, [panelOpen, comms.setPanelOpen])

  useEffect(() => {
    if (!panelOpen || !comms.ready || !comms.chatClient?.userID) return
    void comms.markChannelRead(activeChannelId)
  }, [panelOpen, activeChannelId, comms.ready, comms.chatClient, comms.markChannelRead])

  useEffect(() => {
    if (!comms.ready) return

    const params = new URLSearchParams(window.location.search)
    const channelId = params.get('commsChannel')
    const openHuddle = params.get('huddle') === '1'
    const openComms = params.get('openComms') === '1'

    if (channelId) {
      setActiveChannelId(channelId)
      setPanelOpen(true)
      if (openHuddle) setHuddleAutoOpen(true)
      params.delete('commsChannel')
      params.delete('huddle')
    } else if (openComms) {
      setPanelOpen(true)
      params.delete('openComms')
    } else {
      return
    }
    const query = params.toString()
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}`
    window.history.replaceState({}, '', nextUrl)
  }, [comms.ready, setActiveChannelId, setHuddleAutoOpen, setPanelOpen])

  if (comms.availability !== 'available' || !portalReady) return null

  const unread = comms.unreadCount

  const portal = (
    <div data-theme="dashboard" className={cn('ops-comms-portal', panelOpen && 'is-open')}>
      <OpsCommsPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        loading={comms.loading}
        error={comms.error}
        onRetry={() => void comms.reconnect()}
        chatClient={comms.chatClient}
        videoClient={comms.videoClient}
        credentials={comms.credentials}
        activeChannelId={activeChannelId}
        onSelectChannel={setActiveChannelId}
      />

      <button
        type="button"
        className={cn(
          'ops-comms-fab',
          panelOpen && 'is-open',
          !panelOpen && unread > 0 && 'has-unread'
        )}
        aria-label={panelOpen ? 'Close COMMS' : 'Open COMMS'}
        aria-expanded={panelOpen}
        onClick={() => setPanelOpen(!panelOpen)}
      >
        <span className="ops-comms-fab-glow" aria-hidden />
        <span className="ops-comms-fab-inner">
          {panelOpen ? (
            <X className="ops-comms-fab-icon" aria-hidden />
          ) : (
            <OpsCommsFabIcon className="ops-comms-fab-icon" />
          )}
          <span className="ops-comms-fab-label">COMMS</span>
        </span>
        {!panelOpen && unread > 0 ? (
          <span className="ops-comms-fab-badge" aria-label={`${unread} unread messages`}>
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>
    </div>
  )

  return createPortal(portal, document.body)
}
