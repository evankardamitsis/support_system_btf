'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Headphones, MessageCircle, Ticket, Users } from 'lucide-react'
import type { StreamVideoClient } from '@stream-io/video-react-sdk'
import type { Channel } from 'stream-chat'
import type { StreamChat as StreamChatClient } from 'stream-chat'
import type { StreamCommsCredentials } from '@/lib/comms/stream-server'
import { commsChannelKind } from '@/lib/comms/stream-channels'
import { useLiveHuddleChannels } from '@/lib/comms/use-live-huddle-channels'
import { useStaffPresence } from '@/lib/comms/use-staff-presence'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'

type OpsCommsChannelSidebarProps = {
  chatClient: StreamChatClient
  videoClient: StreamVideoClient
  credentials: StreamCommsCredentials
  activeChannelId: string
  commsActive?: boolean
  deletingChannelId?: string | null
  onSelectChannel: (channelId: string) => void
  onJoinHuddle: (channelId: string) => void
}

function channelData(channel: Channel) {
  return channel.data as Record<string, unknown> | undefined
}

function channelLabel(channel: Channel, currentUserId: string) {
  const data = channelData(channel)
  const name = typeof data?.name === 'string' ? data.name : channel.id

  if (commsChannelKind(channel.id!, channelData(channel)) === 'dm') {
    const dmWith = typeof data?.dm_with === 'string' ? data.dm_with : null
    if (dmWith && dmWith !== currentUserId) {
      return name
    }
  }

  return name
}

function channelUnread(channel: Channel) {
  return channel.countUnread()
}

export function OpsCommsChannelSidebar({
  chatClient,
  videoClient,
  credentials,
  activeChannelId,
  commsActive = true,
  deletingChannelId = null,
  onSelectChannel,
  onJoinHuddle,
}: OpsCommsChannelSidebarProps) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [dmOpen, setDmOpen] = useState(false)
  const [dmLoading, setDmLoading] = useState<string | null>(null)
  const dmSectionRef = useRef<HTMLDivElement>(null)
  const staffIds = useMemo(() => credentials.staff.map(member => member.id), [credentials.staff])
  const staffPresence = useStaffPresence(chatClient, staffIds, credentials.userId)
  const { liveHuddles, liveChannelIds } = useLiveHuddleChannels({
    videoClient,
    credentials,
    channels,
    currentUserId: credentials.userId,
    active: commsActive,
  })

  useEffect(() => {
    let cancelled = false

    async function loadChannels() {
      if (!chatClient.userID) return

      try {
        const result = await chatClient.queryChannels(
          {
            type: 'messaging',
            members: { $in: [credentials.userId] },
          },
          { last_message_at: -1 },
          { limit: 50, state: true, watch: false }
        )
        if (!cancelled) setChannels(result)
      } catch {
        if (!cancelled) setChannels([])
      }
    }

    void loadChannels()

    const refresh = () => {
      void loadChannels()
    }

    chatClient.on('notification.message_new', refresh)
    chatClient.on('notification.mark_read', refresh)
    chatClient.on('channel.updated', refresh)
    chatClient.on('channel.deleted', refresh)

    return () => {
      cancelled = true
      chatClient.off('notification.message_new', refresh)
      chatClient.off('notification.mark_read', refresh)
      chatClient.off('channel.updated', refresh)
      chatClient.off('channel.deleted', refresh)
    }
  }, [chatClient, credentials.userId])

  const grouped = useMemo(() => {
    const team: Channel[] = []
    const tickets: Channel[] = []
    const dms: Channel[] = []

    for (const channel of channels) {
      const id = channel.id ?? ''
      const kind = commsChannelKind(id, channelData(channel))
      if (kind === 'team') team.push(channel)
      else if (kind === 'ticket') tickets.push(channel)
      else dms.push(channel)
    }

    return { team, tickets, dms }
  }, [channels])

  const otherStaff = useMemo(() => {
    return credentials.staff
      .filter(member => member.id !== credentials.userId)
      .sort((a, b) => {
        const aOnline = staffPresence[a.id] ? 1 : 0
        const bOnline = staffPresence[b.id] ? 1 : 0
        return bOnline - aOnline || a.name.localeCompare(b.name)
      })
  }, [credentials.staff, credentials.userId, staffPresence])

  useEffect(() => {
    if (!dmOpen) return

    function handlePointer(event: MouseEvent) {
      if (dmSectionRef.current && !dmSectionRef.current.contains(event.target as Node)) {
        setDmOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointer)
    return () => document.removeEventListener('mousedown', handlePointer)
  }, [dmOpen])

  async function startDm(userId: string) {
    setDmLoading(userId)
    try {
      const response = await fetch(`/api/comms/channels/dm/${userId}`, { method: 'POST' })
      const body = (await response.json().catch(() => null)) as
        | { channelId?: string; error?: string }
        | null
      if (!response.ok || !body?.channelId) {
        notifyError(body?.error ?? 'Could not open direct message')
        return
      }
      onSelectChannel(body.channelId)
      setDmOpen(false)
    } finally {
      setDmLoading(null)
    }
  }

  function renderChannel(channel: Channel) {
    const id = channel.id!
    const unreadCount = channelUnread(channel)
    const unread = unreadCount > 0
    const isDeleting = deletingChannelId === id
    const label = channelLabel(channel, credentials.userId) ?? id
    const isLive = liveChannelIds.has(id)

    return (
      <button
        key={id}
        type="button"
        className={cn(
          'ops-comms-channel-pill',
          activeChannelId === id && 'is-active',
          unread && 'has-unread',
          isLive && 'has-live-huddle',
          isDeleting && 'is-deleting'
        )}
        disabled={isDeleting}
        title={label}
        onClick={() => onSelectChannel(id)}
      >
        <span className="ops-comms-channel-pill-label">{label}</span>
        {isLive ? (
          <span className="ops-comms-channel-pill-live" aria-label="Live huddle">
            LIVE
          </span>
        ) : null}
        {unread ? (
          <span className="ops-comms-channel-pill-unread" aria-label={`${unreadCount} unread`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>
    )
  }

  function renderSection(title: string, icon: React.ReactNode, sectionChannels: Channel[]) {
    if (sectionChannels.length === 0) return null

    return (
      <div className="ops-comms-channel-section">
        <span className="ops-comms-channel-section-label" title={title}>
          {icon}
          <span className="ops-comms-channel-section-text">{title}</span>
        </span>
        <div className="ops-comms-channel-list">{sectionChannels.map(renderChannel)}</div>
      </div>
    )
  }

  return (
    <aside className="ops-comms-channel-sidebar" aria-label="Chat channels">
      {liveHuddles.length > 0 ? (
        <div className="ops-comms-huddle-banner" role="status" aria-live="polite">
          {liveHuddles.map(huddle => (
            <button
              key={huddle.channelId}
              type="button"
              className="ops-comms-huddle-banner-item"
              onClick={() => onJoinHuddle(huddle.channelId)}
            >
              <span className="ops-comms-huddle-banner-icon" aria-hidden>
                <Headphones />
              </span>
              <span className="ops-comms-huddle-banner-copy">
                <span className="ops-comms-huddle-banner-title">Live huddle · {huddle.label}</span>
                <span className="ops-comms-huddle-banner-meta">
                  {huddle.participantCount} in call · Join
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="ops-comms-channel-scroll">
        {renderSection('Team', <Users className="ops-comms-channel-section-icon" aria-hidden />, grouped.team)}
        {grouped.team.length > 0 && grouped.tickets.length > 0 ? (
          <div className="ops-comms-channel-divider" role="separator" aria-label="Ticket chats" />
        ) : null}
        {renderSection(
          'Tickets',
          <Ticket className="ops-comms-channel-section-icon" aria-hidden />,
          grouped.tickets
        )}
        {grouped.tickets.length > 0 && grouped.dms.length > 0 ? (
          <div className="ops-comms-channel-divider" role="separator" aria-label="Direct messages" />
        ) : null}
        {grouped.dms.length > 0
          ? renderSection(
              'Direct',
              <MessageCircle className="ops-comms-channel-section-icon" aria-hidden />,
              grouped.dms
            )
          : null}
      </div>

      <div
        ref={dmSectionRef}
        className="ops-comms-channel-section ops-comms-channel-section--dm"
      >
        <button
          type="button"
          className="ops-comms-channel-dm-toggle"
          aria-expanded={dmOpen}
          title="Message teammate"
          aria-label="Message teammate"
          onClick={() => setDmOpen(current => !current)}
        >
          <MessageCircle className="ops-comms-channel-section-icon" aria-hidden />
          <span className="ops-comms-channel-dm-toggle-label">DM</span>
          <ChevronDown
            className={cn('ops-comms-channel-dm-chevron', dmOpen && 'is-open')}
            aria-hidden
          />
        </button>
        {dmOpen ? (
          <div className="ops-comms-channel-dm-picker">
            {otherStaff.map(member => (
              <button
                key={member.id}
                type="button"
                className="ops-comms-channel-dm-option"
                disabled={dmLoading === member.id}
                title={staffPresence[member.id] ? `${member.name} (online)` : `${member.name} (offline)`}
                onClick={() => void startDm(member.id)}
              >
                <span
                  className={cn(
                    'ops-comms-presence-dot',
                    staffPresence[member.id] && 'is-online'
                  )}
                  aria-hidden
                />
                <span className="ops-comms-channel-dm-option-label">{member.name}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  )
}
