import type { StreamStaffMember } from '@/lib/comms/stream-server'

export type MentionEnrichment = {
  text: string
  mentionedUserIds: string[]
  notifyAllOnline: boolean
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findStaffByName(staff: StreamStaffMember[], name: string) {
  const query = name.trim().toLowerCase()
  if (!query) return null

  const exact = staff.find(member => member.name.toLowerCase() === query)
  if (exact) return exact

  const partial = staff.filter(member => member.name.toLowerCase().includes(query))
  return partial.length === 1 ? partial[0] : null
}

export function enrichCommsMentions(
  text: string,
  staff: StreamStaffMember[],
  options: {
    assigneeId?: string | null
    assigneeName?: string | null
    currentUserId: string
  }
): MentionEnrichment {
  let output = text
  const mentioned = new Set<string>()
  let notifyAllOnline = false

  if (/\B@here\b/i.test(output)) {
    notifyAllOnline = true
    output = output.replace(/\B@here\b/gi, '@here')
  }

  if (/\B@assignee\b/i.test(output) && options.assigneeName) {
    output = output.replace(/\B@assignee\b/gi, `@${options.assigneeName}`)
    if (options.assigneeId) mentioned.add(options.assigneeId)
  } else if (/\B@assignee\b/i.test(output)) {
    output = output.replace(/\B@assignee\b/gi, '@assignee (unassigned)')
  }

  const sorted = [...staff].sort((a, b) => b.name.length - a.name.length)
  for (const member of sorted) {
    const pattern = new RegExp(`@${escapeRegex(member.name)}(?=\\s|$|[.,!?;:])`, 'gi')
    if (pattern.test(output)) {
      mentioned.add(member.id)
    }
  }

  mentioned.delete(options.currentUserId)

  return {
    text: output,
    mentionedUserIds: [...mentioned],
    notifyAllOnline,
  }
}

export function resolveAssigneeFromArg(
  arg: string,
  staff: StreamStaffMember[]
): StreamStaffMember | null {
  if (!arg.trim()) return null
  const byId = staff.find(member => member.id === arg.trim())
  if (byId) return byId
  return findStaffByName(staff, arg.replace(/^@/, ''))
}
