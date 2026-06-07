'use client'

import { useEffect, useState } from 'react'
import type { StreamChat as StreamChatClient } from 'stream-chat'

export type StaffPresenceMap = Record<string, boolean>

function buildPresenceMap(
  chatClient: StreamChatClient,
  users: Array<{ id?: string; online?: boolean }>,
  userIds: string[]
): StaffPresenceMap {
  const map: StaffPresenceMap = {}

  for (const user of users) {
    if (!user.id) continue
    const cached = chatClient.state.users[user.id]
    map[user.id] = Boolean(user.online ?? cached?.online)
  }

  for (const userId of userIds) {
    if (map[userId] !== undefined) continue
    const cached = chatClient.state.users[userId]
    if (cached?.online !== undefined) {
      map[userId] = Boolean(cached.online)
    }
  }

  return map
}

export function useStaffPresence(
  chatClient: StreamChatClient | null,
  staffIds: string[],
  currentUserId: string
) {
  const [presence, setPresence] = useState<StaffPresenceMap>({})
  const staffKey = staffIds.filter(id => id !== currentUserId).sort().join(',')

  useEffect(() => {
    if (!chatClient?.userID || !staffKey) {
      setPresence({})
      return
    }

    const otherIds = staffKey.split(',').filter(Boolean)
    let cancelled = false

    async function load() {
      try {
        const result = await chatClient!.queryUsers(
          { id: { $in: otherIds } },
          { last_active: -1 },
          { presence: true }
        )
        if (!cancelled) setPresence(buildPresenceMap(chatClient!, result.users, otherIds))
      } catch {
        if (!cancelled) setPresence({})
      }
    }

    void load()

    const onPresence = (event: { user?: { id?: string; online?: boolean } }) => {
      const user = event.user
      if (!user?.id || !otherIds.includes(user.id)) return
      setPresence(prev => ({ ...prev, [user.id!]: Boolean(user.online) }))
    }

    chatClient.on('user.presence.changed', onPresence)

    return () => {
      cancelled = true
      chatClient.off('user.presence.changed', onPresence)
    }
  }, [chatClient, staffKey])

  return presence
}
