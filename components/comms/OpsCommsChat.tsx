'use client'

import 'stream-chat-react/dist/css/index.css'

import { useEffect, useMemo, useState } from 'react'
import { Headphones, Trash2 } from 'lucide-react'
import type { StreamVideoClient } from '@stream-io/video-react-sdk'
import {
  Channel,
  Chat,
  MessageComposer,
  MessageList,
  Thread,
  Window,
} from 'stream-chat-react'
import type { StreamChat as StreamChatClient } from 'stream-chat'
import type { StreamCommsCredentials } from '@/lib/comms/stream-server'
import { STREAM_TEAM_CHANNEL_ID } from '@/lib/comms/stream-config'
import {
  canDeleteCommsChannel,
  commsChannelKind,
  ticketIdFromChannelId,
} from '@/lib/comms/stream-channels'
import { OpsCommsChannelMeta } from '@/components/comms/OpsCommsChannelMeta'
import { OpsCommsChannelSidebar } from '@/components/comms/OpsCommsChannelSidebar'
import { OpsCommsHuddle } from '@/components/comms/OpsCommsHuddle'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { readChannelPresence, staffNameMap } from '@/lib/comms/channel-presence'
import { notifyError } from '@/lib/notify'

type DeleteTarget = {
  channelId: string
  label: string
}

type OpsCommsChatProps = {
  chatClient: StreamChatClient
  videoClient: StreamVideoClient
  credentials: StreamCommsCredentials
  active: boolean
  activeChannelId: string
  onSelectChannel: (channelId: string) => void
}

function getChannelShortTitle(
  channelId: string,
  channelData: Record<string, unknown> | undefined
) {
  const kind = commsChannelKind(channelId)
  if (kind === 'team') return 'Team'

  const name = typeof channelData?.name === 'string' ? channelData.name : channelId

  if (kind === 'dm') {
    return name.length > 26 ? `${name.slice(0, 26)}…` : name
  }

  const separator = name.indexOf(' · ')
  if (separator > 0) {
    const ticketRef = name.slice(0, separator)
    const title = name.slice(separator + 3)
    const shortTitle = title.length > 24 ? `${title.slice(0, 24)}…` : title
    return `${ticketRef} · ${shortTitle}`
  }

  return name.length > 32 ? `${name.slice(0, 32)}…` : name
}

export function OpsCommsChat({
  chatClient,
  videoClient,
  credentials,
  active,
  activeChannelId,
  onSelectChannel,
}: OpsCommsChatProps) {
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [huddleOpen, setHuddleOpen] = useState(false)
  const [channelPresence, setChannelPresence] = useState<ReturnType<typeof readChannelPresence> | null>(
    null
  )

  const channel = useMemo(
    () => chatClient.channel('messaging', activeChannelId),
    [chatClient, activeChannelId]
  )
  const canDeleteActive = canDeleteCommsChannel(activeChannelId)
  const channelData = channel.data as Record<string, unknown> | undefined
  const channelShortTitle = getChannelShortTitle(activeChannelId, channelData)
  const staffNames = useMemo(() => staffNameMap(credentials.staff), [credentials.staff])

  const syncChannelPresence = useMemo(
    () => () => {
      setChannelPresence(readChannelPresence(channel, staffNames, credentials.userId))
    },
    [channel, staffNames, credentials.userId]
  )

  useEffect(() => {
    let cancelled = false

    async function watchActiveChannel() {
      if (!chatClient.userID) return

      try {
        await channel.watch()
        if (cancelled) return
        syncChannelPresence()
        if (active) {
          await channel.markRead()
        }
      } catch {
        // Client may still be reconnecting.
      }
    }

    void watchActiveChannel()

    return () => {
      cancelled = true
    }
  }, [channel, active, chatClient, syncChannelPresence])

  useEffect(() => {
    syncChannelPresence()

    channel.on('user.watching.start', syncChannelPresence)
    channel.on('user.watching.stop', syncChannelPresence)
    chatClient.on('user.presence.changed', syncChannelPresence)

    return () => {
      channel.off('user.watching.start', syncChannelPresence)
      channel.off('user.watching.stop', syncChannelPresence)
      chatClient.off('user.presence.changed', syncChannelPresence)
    }
  }, [channel, chatClient, syncChannelPresence])

  function requestDelete(channelId: string, label: string) {
    setDeleteError(null)
    setDeleteTarget({ channelId, label })
  }

  function closeDeleteModal() {
    if (!deletePending) setDeleteTarget(null)
  }

  async function confirmDeleteChat() {
    if (!deleteTarget) return

    const ticketId = ticketIdFromChannelId(deleteTarget.channelId)
    if (!ticketId) return

    setDeletePending(true)
    setDeleteError(null)

    try {
      const response = await fetch(`/api/comms/channels/ticket/${ticketId}`, {
        method: 'DELETE',
      })
      const body = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        const message = body?.error ?? 'Could not delete ticket chat'
        setDeleteError(message)
        notifyError(message)
        return
      }

      if (activeChannelId === deleteTarget.channelId) {
        onSelectChannel(STREAM_TEAM_CHANNEL_ID)
      }
      setDeleteTarget(null)
    } finally {
      setDeletePending(false)
    }
  }

  function requestDeleteActiveChat() {
    const channelData = channel.data as Record<string, unknown> | undefined
    const channelName =
      typeof channelData?.name === 'string' ? channelData.name : 'this ticket chat'
    requestDelete(activeChannelId, channelName)
  }

  return (
    <div className="ops-comms-chat-layout">
      <OpsCommsChannelSidebar
        chatClient={chatClient}
        credentials={credentials}
        activeChannelId={activeChannelId}
        deletingChannelId={deletePending ? deleteTarget?.channelId ?? null : null}
        onSelectChannel={onSelectChannel}
      />
      <div className="ops-comms-chat">
        <Chat client={chatClient} theme="str-chat__theme-dark">
          <Channel channel={channel} key={activeChannelId}>
            <Window>
              <div className="ops-comms-chat-channel-head">
                <div className="ops-comms-chat-channel-head-text">
                  <span
                    className="ops-comms-chat-channel-title"
                    title={
                      typeof channelData?.name === 'string' ? channelData.name : activeChannelId
                    }
                  >
                    {channelShortTitle}
                  </span>
                  {channelPresence ? <OpsCommsChannelMeta presence={channelPresence} /> : null}
                </div>
                <div className="ops-comms-chat-channel-actions">
                  <button
                    type="button"
                    className="ops-comms-icon-action ops-comms-icon-action--huddle"
                    title="Start team huddle"
                    aria-label="Start team huddle"
                    onClick={() => setHuddleOpen(true)}
                  >
                    <Headphones aria-hidden />
                  </button>
                  {canDeleteActive ? (
                    <button
                      type="button"
                      className="ops-comms-icon-action ops-comms-icon-action--delete"
                      title="Delete ticket chat"
                      aria-label="Delete ticket chat"
                      disabled={deletePending}
                      onClick={requestDeleteActiveChat}
                    >
                      <Trash2 aria-hidden />
                    </button>
                  ) : null}
                </div>
              </div>
              <MessageList />
              <MessageComposer />
            </Window>
            <Thread />
          </Channel>
        </Chat>
        {huddleOpen ? (
          <div className="ops-comms-huddle-overlay">
            <OpsCommsHuddle
              videoClient={videoClient}
              credentials={credentials}
              joinOnOpen
              onClose={() => setHuddleOpen(false)}
            />
          </div>
        ) : null}
      </div>

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={closeDeleteModal}
        className="ops-comms-delete-modal"
        title="Delete ticket chat?"
        description={
          <>
            <strong>{deleteTarget?.label}</strong>
            <br />
            <br />
            All messages in this internal ticket chat will be permanently removed. You can open a
            new chat from the ticket page later.
          </>
        }
        confirmLabel="Delete chat"
        pendingLabel="Deleting…"
        pending={deletePending}
        error={deleteError}
        onConfirm={() => void confirmDeleteChat()}
      />
    </div>
  )
}
