'use client'

import 'stream-chat-react/dist/css/index.css'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Headphones, PanelLeft, Search, Trash2 } from 'lucide-react'
import type { StreamVideoClient } from '@stream-io/video-react-sdk'
import {
  Channel,
  Chat,
  MessageList,
  Thread,
  Window,
  WithComponents,
} from 'stream-chat-react'
import type { Event, StreamChat as StreamChatClient } from 'stream-chat'
import type { StreamCommsCredentials } from '@/lib/comms/stream-server'
import { STREAM_TEAM_CHANNEL_ID } from '@/lib/comms/stream-config'
import {
  canDeleteCommsChannel,
  commsChannelKind,
  ticketIdFromChannelId,
} from '@/lib/comms/stream-channels'
import { OpsCommsChannelMeta } from '@/components/comms/OpsCommsChannelMeta'
import { OpsCommsChannelSidebar } from '@/components/comms/OpsCommsChannelSidebar'
import { OpsCommsAttachmentSelector } from '@/components/comms/OpsCommsAttachmentSelector'
import { OpsCommsComposerActions } from '@/components/comms/OpsCommsComposerActions'
import { OpsCommsComposerShell } from '@/components/comms/OpsCommsComposerShell'
import { OpsCommsEmptySuggestionList } from '@/components/comms/OpsCommsEmptySuggestionList'
import { createOpsCommsMessageComposerUI } from '@/components/comms/OpsCommsMessageComposerUI'
import { OpsCommsHuddle } from '@/components/comms/OpsCommsHuddle'
import { OpsCommsMessageUI } from '@/components/comms/OpsCommsMessageUI'
import { OpsCommsSearch } from '@/components/comms/OpsCommsSearch'
import { OpsCommsDeleteChatPopover } from '@/components/comms/OpsCommsDeleteChatPopover'
import { OpsCommsModal } from '@/components/comms/OpsCommsModal'
import { readChannelPresence, staffNameMap } from '@/lib/comms/channel-presence'
import { workflowReactionLabel } from '@/lib/comms/reaction-workflow'
import { useCommsSendHandler } from '@/lib/comms/use-comms-send-handler'
import { commsLookupTicket } from '@/app/actions/comms'
import { useComms } from '@/lib/comms/comms-context'
import { useCommsNarrowLayout } from '@/lib/comms/use-comms-narrow-layout'
import { isHuddleStartedLogText } from '@/lib/comms/huddle-chat-log'
import { huddleContextForChannel } from '@/lib/comms/huddle'
import { playHuddleChime } from '@/lib/ui/play-notification-chime'
import { useColorMode } from '@/components/providers/ColorModeProvider'
import { notifyError } from '@/lib/notify'
import { getStreamChatTheme } from '@/lib/ui/stream-chat-theme'
import { cn } from '@/lib/utils'

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
  const kind = commsChannelKind(channelId, channelData)
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
  const { mode } = useColorMode()
  const streamChatTheme = getStreamChatTheme(mode)
  const deleteChatButtonRef = useRef<HTMLButtonElement>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const { huddleAutoOpen, setHuddleAutoOpen } = useComms()
  const [huddleOpen, setHuddleOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [channelPresence, setChannelPresence] = useState<ReturnType<typeof readChannelPresence> | null>(
    null
  )
  const [ticketAssignee, setTicketAssignee] = useState<{
    id: string | null
    name: string | null
  }>({ id: null, name: null })
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const isNarrowLayout = useCommsNarrowLayout()

  useEffect(() => {
    if (!isNarrowLayout) setMobileSidebarOpen(false)
  }, [isNarrowLayout])

  const channel = useMemo(
    () => chatClient.channel('messaging', activeChannelId),
    [chatClient, activeChannelId]
  )
  const ticketId = ticketIdFromChannelId(activeChannelId)
  const canDeleteActive = canDeleteCommsChannel(activeChannelId)
  const channelData = channel.data as Record<string, unknown> | undefined
  const channelShortTitle = getChannelShortTitle(activeChannelId, channelData)
  const huddleContext = useMemo(
    () => huddleContextForChannel(activeChannelId, channelData, channelShortTitle),
    [activeChannelId, channelData, channelShortTitle]
  )
  const staffNames = useMemo(() => staffNameMap(credentials.staff), [credentials.staff])

  useEffect(() => {
    setHuddleOpen(false)
  }, [activeChannelId])

  useEffect(() => {
    if (!huddleAutoOpen || !huddleContext.enabled) return
    setHuddleOpen(true)
    setHuddleAutoOpen(false)
  }, [huddleAutoOpen, huddleContext.enabled, setHuddleAutoOpen])

  const syncChannelPresence = useMemo(
    () => () => {
      setChannelPresence(readChannelPresence(channel, staffNames, credentials.userId))
    },
    [channel, staffNames, credentials.userId]
  )

  const onlineMemberIds = useMemo(
    () => channelPresence?.members.filter(member => member.online).map(member => member.id) ?? [],
    [channelPresence]
  )

  const refreshTicketAssignee = useMemo(() => {
    if (!ticketId) return undefined
    return () => {
      void commsLookupTicket(ticketId).then(result => {
        if (!result) return
        const assignee = result.assignedTo
          ? credentials.staff.find(member => member.id === result.assignedTo) ?? null
          : null
        setTicketAssignee({
          id: result.assignedTo,
          name: assignee?.name ?? null,
        })
      })
    }
  }, [ticketId, credentials.staff])

  const { handleSubmitMessage } = useCommsSendHandler({
    channel,
    staff: credentials.staff,
    currentUserId: credentials.userId,
    currentUserName: credentials.userName,
    channelId: activeChannelId,
    channelLabel: channelShortTitle,
    assigneeId: ticketAssignee.id,
    assigneeName: ticketAssignee.name,
    onlineMemberIds,
    onOpenTicketChannel: onSelectChannel,
    onStartHuddle: () => setHuddleOpen(true),
    huddleEnabled: huddleContext.enabled,
    onAssigneeChanged: refreshTicketAssignee,
  })

  const MessageUIOverride = useMemo(() => {
    function Override(props: React.ComponentProps<typeof OpsCommsMessageUI>) {
      return <OpsCommsMessageUI {...props} ticketId={ticketId} />
    }
    return Override
  }, [ticketId])

  const MessageComposerUIOverride = useMemo(
    () =>
      createOpsCommsMessageComposerUI({
        ticketChannel: Boolean(ticketId),
        huddleChannel: huddleContext.enabled,
        staff: credentials.staff,
        assigneeName: ticketAssignee.name,
        currentUserId: credentials.userId,
      }),
    [
      ticketId,
      huddleContext.enabled,
      credentials.staff,
      credentials.userId,
      ticketAssignee.name,
    ]
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

  useEffect(() => {
    if (!ticketId) {
      setTicketAssignee({ id: null, name: null })
      return
    }

    let cancelled = false
    void commsLookupTicket(ticketId).then(result => {
      if (cancelled || !result) return
      const assignee = result.assignedTo
        ? credentials.staff.find(member => member.id === result.assignedTo) ?? null
        : null
      setTicketAssignee({
        id: result.assignedTo,
        name: assignee?.name ?? null,
      })
    })

    return () => {
      cancelled = true
    }
  }, [ticketId, credentials.staff])

  useEffect(() => {
    function onReaction(event: Event) {
      if (event.type !== 'reaction.new') return
      const reactionType = event.reaction?.type
      const label = reactionType ? workflowReactionLabel(reactionType) : null
      if (!label) return
      const userName = event.reaction?.user?.name ?? 'Someone'
      void channel.sendMessage({
        text: `${userName} ${label}`,
        type: 'system',
      })
    }

    channel.on('reaction.new', onReaction)
    return () => {
      channel.off('reaction.new', onReaction)
    }
  }, [channel])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  function requestDelete(channelId: string, label: string) {
    setDeleteError(null)
    setDeleteTarget({ channelId, label })
  }

  function closeDeleteModal() {
    if (!deletePending) setDeleteTarget(null)
  }

  async function confirmDeleteChat() {
    if (!deleteTarget) return

    const deleteTicketId = ticketIdFromChannelId(deleteTarget.channelId)
    if (!deleteTicketId) return

    setDeletePending(true)
    setDeleteError(null)

    try {
      const response = await fetch(`/api/comms/channels/ticket/${deleteTicketId}`, {
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
    const data = channel.data as Record<string, unknown> | undefined
    const channelName = typeof data?.name === 'string' ? data.name : 'this ticket chat'
    requestDelete(activeChannelId, channelName)
  }

  function handleSelectChannel(channelId: string) {
    onSelectChannel(channelId)
    if (isNarrowLayout) setMobileSidebarOpen(false)
  }

  function handleJoinLiveHuddle(channelId: string) {
    handleSelectChannel(channelId)
    setHuddleOpen(true)
  }

  useEffect(() => {
    function onMessage(event: Event) {
      if (event.type !== 'message.new') return

      const text = event.message?.text?.trim() ?? ''
      if (!isHuddleStartedLogText(text)) return

      const authorId = event.message?.user?.id ?? event.user?.id
      if (authorId === credentials.userId) return

      playHuddleChime()
    }

    chatClient.on('message.new', onMessage)
    return () => {
      chatClient.off('message.new', onMessage)
    }
  }, [chatClient, credentials.userId])

  return (
    <div
      className={cn(
        'ops-comms-chat-layout',
        isNarrowLayout && mobileSidebarOpen && 'is-sidebar-open'
      )}
    >
      {isNarrowLayout && mobileSidebarOpen ? (
        <button
          type="button"
          className="ops-comms-sidebar-backdrop"
          aria-label="Close channels"
          onClick={() => setMobileSidebarOpen(false)}
        />
      ) : null}
      <OpsCommsChannelSidebar
        chatClient={chatClient}
        videoClient={videoClient}
        credentials={credentials}
        activeChannelId={activeChannelId}
        commsActive={active}
        deletingChannelId={deletePending ? deleteTarget?.channelId ?? null : null}
        onSelectChannel={handleSelectChannel}
        onJoinHuddle={handleJoinLiveHuddle}
      />
      <div className="ops-comms-chat">
        <Chat client={chatClient} theme={streamChatTheme}>
          <Channel channel={channel} key={activeChannelId}>
            <WithComponents
              overrides={{
                Modal: OpsCommsModal,
                MessageUI: MessageUIOverride,
                MessageComposerUI: MessageComposerUIOverride,
                AutocompleteSuggestionList: OpsCommsEmptySuggestionList,
                AttachmentSelector: OpsCommsAttachmentSelector,
                AdditionalMessageComposerActions: OpsCommsComposerActions,
              }}
            >
              <Window>
                <div className="ops-comms-chat-channel-head">
                  <div className="ops-comms-chat-channel-head-start">
                    {isNarrowLayout ? (
                      <button
                        type="button"
                        className="ops-comms-icon-action ops-comms-icon-action--channels"
                        title="Channels"
                        aria-label="Show channels"
                        aria-expanded={mobileSidebarOpen}
                        onClick={() => setMobileSidebarOpen(current => !current)}
                      >
                        <PanelLeft aria-hidden />
                      </button>
                    ) : null}
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
                  </div>
                  <div className="ops-comms-chat-channel-actions">
                    <button
                      type="button"
                      className="ops-comms-icon-action"
                      title="Search messages (⌘K)"
                      aria-label="Search messages"
                      onClick={() => setSearchOpen(true)}
                    >
                      <Search aria-hidden />
                    </button>
                    {huddleContext.enabled ? (
                      <button
                        type="button"
                        className="ops-comms-icon-action ops-comms-icon-action--huddle"
                        title={huddleContext.title}
                        aria-label={huddleContext.title}
                        onClick={() => setHuddleOpen(true)}
                      >
                        <Headphones aria-hidden />
                      </button>
                    ) : null}
                    {canDeleteActive ? (
                      <button
                        ref={deleteChatButtonRef}
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
                <MessageList
                  messageActions={['react', 'reply', 'quote', 'pin', 'remindMe', 'delete']}
                />
                <OpsCommsComposerShell onSubmit={handleSubmitMessage} />
              </Window>
              <Thread />
            </WithComponents>
          </Channel>
        </Chat>
        {huddleOpen ? (
          <OpsCommsHuddle
            videoClient={videoClient}
            credentials={credentials}
            context={huddleContext}
            channel={channel}
            channelId={activeChannelId}
            channelLabel={channelShortTitle}
            ticketId={ticketId}
            onClose={() => setHuddleOpen(false)}
          />
        ) : null}
        <OpsCommsSearch
          chatClient={chatClient}
          credentials={credentials}
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          onSelectChannel={onSelectChannel}
        />
      </div>

      <OpsCommsDeleteChatPopover
        open={deleteTarget !== null}
        anchorRef={deleteChatButtonRef}
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
        onClose={closeDeleteModal}
        onConfirm={() => void confirmDeleteChat()}
      />
    </div>
  )
}
