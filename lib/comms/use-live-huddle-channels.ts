'use client'

import { useEffect, useMemo, useState } from 'react'
import type { StreamVideoClient } from '@stream-io/video-react-sdk'
import type { Channel } from 'stream-chat'
import type { StreamCommsCredentials } from '@/lib/comms/stream-server'
import { huddleCallIdForChannel, huddleEnabledForChannel, probeHuddleLiveCount } from '@/lib/comms/huddle'
import { STREAM_HUDDLE_CALL_TYPE } from '@/lib/comms/stream-config'
import { commsChannelKind } from '@/lib/comms/stream-channels'

export type LiveHuddleChannel = {
  channelId: string
  label: string
  participantCount: number
}

type UseLiveHuddleChannelsOptions = {
  videoClient: StreamVideoClient | null
  credentials: StreamCommsCredentials | null
  channels: Channel[]
  currentUserId: string
  active?: boolean
  pollMs?: number
}

function channelData(channel: Channel) {
  return channel.data as Record<string, unknown> | undefined
}

function channelLabel(channel: Channel, currentUserId: string) {
  const data = channelData(channel)
  const name = typeof data?.name === 'string' ? data.name : channel.id ?? 'Huddle'

  if (commsChannelKind(channel.id ?? '', data) === 'dm') {
    const dmWith = typeof data?.dm_with === 'string' ? data.dm_with : null
    if (dmWith && dmWith !== currentUserId) {
      return name
    }
  }

  if (commsChannelKind(channel.id ?? '', data) === 'team') {
    return 'Team'
  }

  return name
}

export function useLiveHuddleChannels({
  videoClient,
  credentials,
  channels,
  currentUserId,
  active = true,
  pollMs = 12_000,
}: UseLiveHuddleChannelsOptions) {
  const [liveHuddles, setLiveHuddles] = useState<LiveHuddleChannel[]>([])

  const huddleChannels = useMemo(
    () =>
      channels.filter(channel => {
        const channelId = channel.id ?? ''
        return huddleEnabledForChannel(channelId, channelData(channel))
      }),
    [channels]
  )

  useEffect(() => {
    if (!active || !videoClient || !credentials || huddleChannels.length === 0) {
      setLiveHuddles([])
      return
    }

    let cancelled = false

    async function probe() {
      const results = await Promise.all(
        huddleChannels.map(async channel => {
          const channelId = channel.id!
          const call = videoClient!.call(
            STREAM_HUDDLE_CALL_TYPE,
            huddleCallIdForChannel(channelId)
          )
          const count = await probeHuddleLiveCount(videoClient!, credentials!, call)
          if (!count) return null

          return {
            channelId,
            label: channelLabel(channel, currentUserId),
            participantCount: count,
          }
        })
      )

      if (cancelled) return

      setLiveHuddles(
        results.filter((entry): entry is LiveHuddleChannel => entry !== null)
      )
    }

    void probe()
    const interval = window.setInterval(() => {
      void probe()
    }, pollMs)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [
    active,
    credentials,
    currentUserId,
    huddleChannels,
    pollMs,
    videoClient,
  ])

  const liveChannelIds = useMemo(
    () => new Set(liveHuddles.map(entry => entry.channelId)),
    [liveHuddles]
  )

  return { liveHuddles, liveChannelIds }
}
