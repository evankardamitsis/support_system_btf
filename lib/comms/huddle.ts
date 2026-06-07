import type { Call } from '@stream-io/video-react-sdk'
import type { StreamVideoClient } from '@stream-io/video-react-sdk'
import {
  STREAM_HUDDLE_CALL_ID,
  STREAM_HUDDLE_CALL_TYPE,
  STREAM_TEAM_CHANNEL_ID,
} from '@/lib/comms/stream-config'
import { commsChannelKind } from '@/lib/comms/stream-channels'
import { ensureVideoConnected } from '@/lib/comms/ensure-video-connected'
import type { StreamCommsCredentials } from '@/lib/comms/stream-server'

export type HuddleContext = {
  callType: string
  callId: string
  title: string
  prejoinIdle: string
  prejoinLive: (count: number) => string
  enabled: boolean
}

export function huddleCallIdForChannel(channelId: string) {
  if (channelId === STREAM_TEAM_CHANNEL_ID) return STREAM_HUDDLE_CALL_ID
  return `huddle-${channelId}`
}

export function huddleEnabledForChannel(
  channelId: string,
  channelData?: Record<string, unknown> | null
) {
  const kind = commsChannelKind(channelId, channelData)
  return kind === 'team' || kind === 'dm'
}

export function huddleContextForChannel(
  channelId: string,
  channelData?: Record<string, unknown> | null,
  channelLabel?: string
): HuddleContext {
  const callId = huddleCallIdForChannel(channelId)
  const callType = STREAM_HUDDLE_CALL_TYPE
  const kind = commsChannelKind(channelId, channelData)

  if (kind === 'team') {
    return {
      callType,
      callId,
      title: 'Team huddle',
      prejoinIdle: 'Start a voice huddle with the team.',
      prejoinLive: count =>
        `${count} teammate${count === 1 ? '' : 's'} in the huddle.`,
      enabled: true,
    }
  }

  if (kind === 'dm') {
    const name = channelLabel?.trim() || 'Teammate'
    return {
      callType,
      callId,
      title: `Huddle · ${name}`,
      prejoinIdle: `Start a voice huddle with ${name}.`,
      prejoinLive: () => `${name} is in the huddle.`,
      enabled: true,
    }
  }

  return {
    callType,
    callId,
    title: 'Huddle',
    prejoinIdle: '',
    prejoinLive: () => '',
    enabled: false,
  }
}

export async function probeHuddleLiveCount(
  videoClient: StreamVideoClient,
  credentials: Pick<StreamCommsCredentials, 'userId' | 'userName' | 'videoToken'>,
  call: Call
): Promise<number | null> {
  try {
    await ensureVideoConnected(videoClient, credentials)
    const state = await call.getOrCreate()
    const count = state.call.session?.participants?.length ?? 0
    return count > 0 ? count : null
  } catch {
    return null
  }
}
