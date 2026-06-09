'use client'

import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { OpsCommsFabIcon } from '@/components/comms/OpsCommsFabIcon'
import { OpsCommsHuddle } from '@/components/comms/OpsCommsHuddle'
import { OpsCommsPanel } from '@/components/comms/OpsCommsPanel'
import { useComms } from '@/lib/comms/comms-context'
import { huddleContextForChannel } from '@/lib/comms/huddle'
import { useStreamComms } from '@/lib/comms/use-stream-comms'
import { cn } from '@/lib/utils'

export function OpsCommsLauncher() {
  const {
    panelOpen,
    setPanelOpen,
    activeChannelId,
    setActiveChannelId,
    huddleAutoOpen,
    setHuddleAutoOpen,
    huddleSession,
    huddleLive,
    setHuddleLive,
    huddleMinimized,
    setHuddleMinimized,
    openHuddle,
    closeHuddle,
  } = useComms()
  const {
    availability,
    setPanelOpen: setStreamPanelOpen,
    markChannelRead,
    ready,
    chatClient,
    unreadCount,
    loading,
    error,
    reconnect,
    videoClient,
    credentials,
  } = useStreamComms()

  const huddleChannel = useMemo(() => {
    if (!chatClient || !huddleSession) return null
    return chatClient.channel('messaging', huddleSession.channelId)
  }, [chatClient, huddleSession])

  const huddleContext = useMemo(() => {
    if (!huddleSession || !huddleChannel) return null
    const channelData = huddleChannel.data as Record<string, unknown> | undefined
    return huddleContextForChannel(
      huddleSession.channelId,
      channelData,
      huddleSession.channelLabel
    )
  }, [huddleChannel, huddleSession])

  useEffect(() => {
    const onToggle = () => setPanelOpen(!panelOpen)
    window.addEventListener('btf-desktop:toggle-comms', onToggle)
    return () => window.removeEventListener('btf-desktop:toggle-comms', onToggle)
  }, [panelOpen, setPanelOpen])

  useEffect(() => {
    setStreamPanelOpen(panelOpen)
  }, [panelOpen, setStreamPanelOpen])

  useEffect(() => {
    if (!panelOpen || !ready || !chatClient?.userID) return
    void markChannelRead(activeChannelId)
  }, [panelOpen, activeChannelId, ready, chatClient, markChannelRead])

  useEffect(() => {
    if (!ready) return

    const params = new URLSearchParams(window.location.search)
    const channelId = params.get('commsChannel')
    const openHuddleParam = params.get('huddle') === '1'
    const openComms = params.get('openComms') === '1'

    if (channelId) {
      setActiveChannelId(channelId)
      setPanelOpen(true)
      if (openHuddleParam) setHuddleAutoOpen(true)
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
  }, [ready, setActiveChannelId, setHuddleAutoOpen, setPanelOpen])

  useEffect(() => {
    if (!huddleAutoOpen || !ready) return

    const channel = chatClient?.channel('messaging', activeChannelId)
    const channelData = channel?.data as Record<string, unknown> | undefined
    const context = huddleContextForChannel(activeChannelId, channelData, activeChannelId)
    if (!context.enabled) {
      setHuddleAutoOpen(false)
      return
    }

    openHuddle({
      channelId: activeChannelId,
      channelLabel: activeChannelId,
      autoMinimizeOnJoin: true,
    })
    setHuddleAutoOpen(false)
  }, [activeChannelId, chatClient, huddleAutoOpen, openHuddle, ready, setHuddleAutoOpen])

  if (availability !== 'available') return null

  const unread = unreadCount

  const portal = (
    <div data-theme="dashboard" className={cn('ops-comms-portal', panelOpen && 'is-open')}>
      <OpsCommsPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        loading={loading}
        error={error}
        onRetry={() => void reconnect()}
        chatClient={chatClient}
        videoClient={videoClient}
        credentials={credentials}
        activeChannelId={activeChannelId}
        onSelectChannel={setActiveChannelId}
      />

      {huddleSession &&
      huddleContext?.enabled &&
      huddleChannel &&
      videoClient &&
      credentials ? (
        <OpsCommsHuddle
          videoClient={videoClient}
          credentials={credentials}
          context={huddleContext}
          channel={huddleChannel}
          channelId={huddleSession.channelId}
          channelLabel={huddleSession.channelLabel}
          ticketId={huddleSession.ticketId}
          minimized={huddleMinimized}
          onMinimizedChange={setHuddleMinimized}
          autoMinimizeOnJoin={huddleSession.autoMinimizeOnJoin}
          onLiveChange={setHuddleLive}
          onClose={closeHuddle}
        />
      ) : null}

      <button
        type="button"
        className={cn(
          'ops-comms-fab',
          panelOpen && 'is-open',
          !panelOpen && unread > 0 && 'has-unread',
          huddleLive && 'has-live-huddle'
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
        {huddleLive && !panelOpen ? (
          <span className="ops-comms-fab-huddle-dot" aria-label="Huddle active" />
        ) : null}
      </button>
    </div>
  )

  return createPortal(portal, document.body)
}
