import type { Channel } from 'stream-chat'

export const HUDDLE_UNANSWERED_MS = 2 * 60 * 1000
export const HUDDLE_MIN_ALONE_LOG_MS = 30 * 1000

export type HuddleChatLogKind =
  | 'started'
  | 'joined'
  | 'left'
  | 'ended'
  | 'unanswered'

export function formatHuddleDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  if (totalSeconds < 60) return `${totalSeconds}s`

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes < 60) {
    return minutes < 5 && seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

export function isHuddleStartedLogText(text: string) {
  return text.startsWith('Huddle started ·')
}

export function isHuddleOpsNotification(input: {
  dedupeKey?: string | null
  title: string
}) {
  return (
    (input.dedupeKey?.startsWith('comms-huddle:') ?? false) ||
    input.title.startsWith('Huddle started')
  )
}

export function isHuddleChatLogText(text: string) {
  return (
    isHuddleStartedLogText(text) ||
    text.startsWith('Huddle ended ·') ||
    text.startsWith('Unanswered huddle ·') ||
    text.endsWith(' joined the huddle') ||
    text.includes(' left the huddle ·') ||
    text.includes(' ended huddle ·')
  )
}

export async function sendHuddleChatLog(
  channel: Channel,
  text: string,
  _kind: HuddleChatLogKind
) {
  await channel.sendMessage({
    text,
    type: 'system',
    silent: true,
  })
}

export function huddleChannelMemberIds(channel: Channel, excludeUserId: string) {
  return Object.keys(channel.state?.members ?? {}).filter(memberId => memberId !== excludeUserId)
}
