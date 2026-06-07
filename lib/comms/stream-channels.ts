import { STREAM_TEAM_CHANNEL_ID } from '@/lib/comms/stream-config'

export type CommsChannelKind = 'team' | 'ticket' | 'dm'

export function ticketChannelId(ticketId: string) {
  return `ticket-${ticketId}`
}

function compactUserKey(userId: string) {
  return userId.replace(/-/g, '').slice(0, 16)
}

export function dmChannelId(userIdA: string, userIdB: string) {
  const [a, b] = [userIdA, userIdB].sort()
  // Stream channel ids must be <= 64 chars; full UUID pairs exceed that limit.
  return `dm-${compactUserKey(a)}${compactUserKey(b)}`
}

export function commsChannelKind(
  channelId: string,
  channelData?: Record<string, unknown> | null
): CommsChannelKind {
  const kind = channelData?.channel_kind
  if (kind === 'team' || kind === 'ticket' || kind === 'dm') {
    return kind
  }
  if (channelId === STREAM_TEAM_CHANNEL_ID) return 'team'
  if (channelId.startsWith('ticket-')) return 'ticket'
  if (channelId.startsWith('dm-')) return 'dm'
  return 'dm'
}

export function isTicketChannelId(channelId: string) {
  return channelId.startsWith('ticket-')
}

export function ticketIdFromChannelId(channelId: string) {
  return channelId.startsWith('ticket-') ? channelId.slice('ticket-'.length) : null
}

export function canDeleteCommsChannel(channelId: string) {
  return commsChannelKind(channelId) === 'ticket'
}
