'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  StreamChat,
  type OwnUserResponse,
  type StreamChat as StreamChatClient,
} from 'stream-chat'
import {
  StreamVideoClient,
  type StreamVideoClient as StreamVideoClientType,
} from '@stream-io/video-react-sdk'
import type { StreamCommsCredentials } from '@/lib/comms/stream-server'
import { ensureVideoConnected, isVideoConnected } from '@/lib/comms/ensure-video-connected'
import { playNotificationChime } from '@/lib/ui/play-notification-chime'

function getUnreadCount(chatClient: StreamChatClient) {
  const user = chatClient.user as OwnUserResponse | undefined
  return user?.total_unread_count ?? 0
}

function isChatConnected(chatClient: StreamChatClient | null, userId?: string) {
  if (!chatClient?.userID) return false
  return !userId || chatClient.userID === userId
}

export type CommsAvailability =
  | 'checking'
  | 'available'
  | 'unconfigured'
  | 'unauthorized'
  | 'error'

type CommsState = {
  ready: boolean
  loading: boolean
  error: string | null
  credentials: StreamCommsCredentials | null
  chatClient: StreamChatClient | null
  videoClient: StreamVideoClientType | null
  unreadCount: number
}

type ConnectionSnapshot = {
  availability: CommsAvailability
  credentials: StreamCommsCredentials | null
  chatClient: StreamChatClient | null
  videoClient: StreamVideoClientType | null
  unreadCount: number
  error: string | null
}

let sharedChatClient: StreamChatClient | null = null
let sharedVideoClient: StreamVideoClientType | null = null
let sharedCredentials: StreamCommsCredentials | null = null
let connectPromise: Promise<ConnectionSnapshot> | null = null

async function disconnectSharedClients() {
  if (sharedChatClient?.userID) {
    await sharedChatClient.disconnectUser()
  }
  sharedChatClient = null

  if (sharedVideoClient) {
    await sharedVideoClient.disconnectUser()
  }
  sharedVideoClient = null
  sharedCredentials = null
}

async function fetchCommsCredentials() {
  const response = await fetch('/api/comms/token', { cache: 'no-store' })

  if (response.status === 503) {
    return {
      availability: 'unconfigured' as const,
      credentials: null,
      error: null,
    }
  }

  if (response.status === 401 || response.status === 403) {
    return {
      availability: 'unauthorized' as const,
      credentials: null,
      error: null,
    }
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? 'Could not connect to team comms')
  }

  const credentials = (await response.json()) as StreamCommsCredentials
  return {
    availability: 'available' as const,
    credentials,
    error: null,
  }
}

async function connectSharedClients(
  credentials: StreamCommsCredentials,
  force = false
): Promise<ConnectionSnapshot> {
  const chatClient = StreamChat.getInstance(credentials.apiKey)
  const alreadyConnected = isChatConnected(chatClient, credentials.userId)

  if (!force && alreadyConnected) {
    const videoClient = StreamVideoClient.getOrCreateInstance({
      apiKey: credentials.apiKey,
      user: {
        id: credentials.userId,
        name: credentials.userName,
      },
      token: credentials.videoToken,
    })
    await ensureVideoConnected(videoClient, credentials)

    sharedChatClient = chatClient
    sharedVideoClient = videoClient
    sharedCredentials = credentials

    return {
      availability: 'available',
      credentials,
      chatClient,
      videoClient,
      unreadCount: getUnreadCount(chatClient),
      error: null,
    }
  }

  if (chatClient.userID) {
    await chatClient.disconnectUser()
  }

  await chatClient.connectUser(
    {
      id: credentials.userId,
      name: credentials.userName,
    },
    credentials.chatToken
  )

  const videoClient = StreamVideoClient.getOrCreateInstance({
    apiKey: credentials.apiKey,
    user: {
      id: credentials.userId,
      name: credentials.userName,
    },
    token: credentials.videoToken,
  })
  await ensureVideoConnected(videoClient, credentials)

  sharedChatClient = chatClient
  sharedVideoClient = videoClient
  sharedCredentials = credentials

  return {
    availability: 'available',
    credentials,
    chatClient,
    videoClient,
    unreadCount: getUnreadCount(chatClient),
    error: null,
  }
}

async function ensureStreamConnection(force = false): Promise<ConnectionSnapshot> {
  if (
    !force &&
    sharedCredentials &&
    isChatConnected(sharedChatClient, sharedCredentials.userId) &&
    sharedVideoClient &&
    isVideoConnected(sharedVideoClient, sharedCredentials.userId)
  ) {
    return {
      availability: 'available',
      credentials: sharedCredentials,
      chatClient: sharedChatClient,
      videoClient: sharedVideoClient,
      unreadCount: getUnreadCount(sharedChatClient!),
      error: null,
    }
  }

  if (connectPromise) {
    return connectPromise
  }

  connectPromise = (async () => {
    try {
      const tokenResult = await fetchCommsCredentials()

      if (tokenResult.availability !== 'available' || !tokenResult.credentials) {
        return {
          availability: tokenResult.availability,
          credentials: null,
          chatClient: null,
          videoClient: null,
          unreadCount: 0,
          error: tokenResult.error,
        }
      }

      return await connectSharedClients(tokenResult.credentials, force)
    } catch (err) {
      await disconnectSharedClients()
      return {
        availability: 'error' as const,
        credentials: null,
        chatClient: null,
        videoClient: null,
        unreadCount: 0,
        error: err instanceof Error ? err.message : 'Could not connect to team comms',
      }
    }
  })().finally(() => {
    connectPromise = null
  })

  return connectPromise
}

export function useStreamComms() {
  const unreadRef = useRef(0)
  const panelOpenRef = useRef(false)
  const mountedRef = useRef(true)
  const [availability, setAvailability] = useState<CommsAvailability>('checking')
  const [state, setState] = useState<CommsState>({
    ready: false,
    loading: true,
    error: null,
    credentials: null,
    chatClient: null,
    videoClient: null,
    unreadCount: 0,
  })

  const applySnapshot = useCallback((snapshot: ConnectionSnapshot) => {
    if (!mountedRef.current) return

    unreadRef.current = snapshot.unreadCount
    setAvailability(snapshot.availability)
    setState({
      ready: snapshot.availability === 'available' && isChatConnected(snapshot.chatClient),
      loading: false,
      error: snapshot.error,
      credentials: snapshot.credentials,
      chatClient: snapshot.chatClient,
      videoClient: snapshot.videoClient,
      unreadCount: snapshot.unreadCount,
    })
  }, [])

  const connect = useCallback(
    async (force = false) => {
      if (!mountedRef.current) return

      setState(prev => ({ ...prev, loading: true, error: null }))
      setAvailability('checking')

      const snapshot = await ensureStreamConnection(force)
      applySnapshot(snapshot)
    },
    [applySnapshot]
  )

  useEffect(() => {
    mountedRef.current = true
    void connect()

    return () => {
      mountedRef.current = false
    }
  }, [connect])

  useEffect(() => {
    const chatClient = state.chatClient
    if (!chatClient || !isChatConnected(chatClient)) return

    const syncUnread = () => {
      const next = getUnreadCount(chatClient)
      const prev = unreadRef.current
      if (next > prev && !panelOpenRef.current) {
        playNotificationChime()
      }
      unreadRef.current = next
      setState(prevState => ({
        ...prevState,
        unreadCount: next,
      }))
    }

    chatClient.on('notification.message_new', syncUnread)
    chatClient.on('notification.mark_read', syncUnread)
    chatClient.on('notification.thread_message_new', syncUnread)

    return () => {
      chatClient.off('notification.message_new', syncUnread)
      chatClient.off('notification.mark_read', syncUnread)
      chatClient.off('notification.thread_message_new', syncUnread)
    }
  }, [state.chatClient])

  const setPanelOpen = useCallback((open: boolean) => {
    panelOpenRef.current = open
  }, [])

  const markChannelRead = useCallback(async (channelId: string) => {
    if (!channelId) return

    try {
      const snapshot = await ensureStreamConnection()
      const chatClient = snapshot.chatClient
      if (!isChatConnected(chatClient, snapshot.credentials?.userId)) return

      const channel = chatClient!.channel('messaging', channelId)
      await channel.watch()
      await channel.markRead()
      const next = getUnreadCount(chatClient!)
      unreadRef.current = next
      setState(prev => ({ ...prev, unreadCount: next }))
    } catch {
      // Channel may be unavailable while reconnecting.
    }
  }, [])

  const reconnect = useCallback(() => connect(true), [connect])

  return {
    ...state,
    availability,
    reconnect,
    setPanelOpen,
    markChannelRead,
  }
}

export async function disconnectStreamComms() {
  await disconnectSharedClients()
}
