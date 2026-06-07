import type { StreamStaffMember } from '@/lib/comms/stream-server'

export type CommsMentionSuggestion = {
  id: string
  label: string
  description: string
  insert: string
}

export function parseMentionHead(value: string) {
  const match = value.match(/@([a-zA-Z0-9_]*)$/)
  if (!match) return null
  return match[1]
}

export function filterCommsMentions(
  query: string,
  staff: StreamStaffMember[],
  options: {
    ticketChannel: boolean
    assigneeName?: string | null
    currentUserId: string
  }
): CommsMentionSuggestion[] {
  const normalized = query.trim().toLowerCase()
  const suggestions: CommsMentionSuggestion[] = []

  if (!normalized || 'here'.startsWith(normalized)) {
    suggestions.push({
      id: 'here',
      label: '@here',
      description: 'Notify everyone online in this channel',
      insert: '@here',
    })
  }

  if (
    options.ticketChannel &&
    (!normalized ||
      'assignee'.startsWith(normalized) ||
      (options.assigneeName?.toLowerCase().includes(normalized) ?? false))
  ) {
    suggestions.push({
      id: 'assignee',
      label: '@assignee',
      description: options.assigneeName
        ? `Ticket assignee · ${options.assigneeName}`
        : 'Ticket assignee · unassigned',
      insert: '@assignee',
    })
  }

  for (const member of staff) {
    if (member.id === options.currentUserId) continue
    const nameLower = member.name.toLowerCase()
    if (normalized && !nameLower.includes(normalized)) continue

    suggestions.push({
      id: member.id,
      label: `@${member.name}`,
      description: 'Mention teammate',
      insert: `@${member.name}`,
    })
  }

  return suggestions
}

export function replaceMentionTail(text: string, insert: string) {
  const match = text.match(/@([a-zA-Z0-9_]*)$/)
  if (!match) return `${text}${insert} `
  return `${text.slice(0, -match[0].length)}${insert} `
}
