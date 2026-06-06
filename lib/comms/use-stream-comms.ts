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

function getUnreadCount(chatClient: StreamChatClient) {
  const user = chatClient.user as OwnUserResponse | undefined
  return user?.total_unread_count ?? 0
}

type CommsState = {
  ready: boolean
  loading: boolean
  error: string | null
  credentials: StreamCommsCredentials | null
  chatClient: StreamChatClient | null
  videoClient: StreamVideoClientType | null
  unreadCount: number
}

export function useStreamComms(enabled: boolean) {
  const chatRef = useRef<StreamChatClient | null>(null)
  const videoRef = useRef<StreamVideoClientType | null>(null)
  const [state, setState] = useState<CommsState>({
    ready: false,
    loading: false,
    error: null,
    credentials: null,
    chatClient: null,
    videoClient: null,
    unreadCount: 0,
  })

  const disconnect = useCallback(async () => {
    if (chatRef.current) {
      await chatRef.current.disconnectUser()
      chatRef.current = null
    }
    if (videoRef.current) {
      await videoRef.current.disconnectUser()
      videoRef.current = null
    }
  }, [])

  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch('/api/comms/token', { cache: 'no-store' })
      if (response.status === 503) {
        setState(prev => ({
          ...prev,
          loading: false,
          ready: false,
          error: null,
        }))
        return
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? 'Could not connect to team comms')
      }

      const credentials = (await response.json()) as StreamCommsCredentials
      await disconnect()

      const chatClient = StreamChat.getInstance(credentials.apiKey)
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

      chatRef.current = chatClient
      videoRef.current = videoClient

      setState({
        ready: true,
        loading: false,
        error: null,
        credentials,
        chatClient,
        videoClient,
        unreadCount: getUnreadCount(chatClient),
      })
    } catch (err) {
      setState(prev => ({
        ...prev,
        ready: false,
        loading: false,
        error: err instanceof Error ? err.message : 'Could not connect to team comms',
        credentials: null,
        chatClient: null,
        videoClient: null,
        unreadCount: 0,
      }))
    }
  }, [disconnect])

  useEffect(() => {
    if (!enabled) return
    void connect()
    return () => {
      void disconnect()
    }
  }, [enabled, connect, disconnect])

  useEffect(() => {
    const chatClient = state.chatClient
    if (!chatClient) return

    const syncUnread = () => {
      setState(prev => ({
        ...prev,
        unreadCount: getUnreadCount(chatClient),
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

  return {
    ...state,
    reconnect: connect,
  }
}
