export type MentionableStaff = {
  id: string
  name: string
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function parseMentionedUserIds(
  body: string,
  staff: MentionableStaff[]
): string[] {
  const mentioned = new Set<string>()
  const sorted = [...staff].sort((a, b) => b.name.length - a.name.length)

  for (const member of sorted) {
    const pattern = new RegExp(`@${escapeRegex(member.name)}(?=\\s|$|[.,!?;:])`, 'i')
    if (pattern.test(body)) {
      mentioned.add(member.id)
    }
  }

  return [...mentioned]
}

export type CommentBodyPart =
  | { type: 'text'; value: string }
  | { type: 'mention'; value: string }

/** Split comment body into plain text and @mention spans for rendering */
export function splitCommentBody(
  body: string,
  staffNames: string[]
): CommentBodyPart[] {
  if (!staffNames.length) {
    return [{ type: 'text', value: body }]
  }

  const sorted = [...staffNames].sort((a, b) => b.length - a.length)
  const pattern = new RegExp(
    `@(${sorted.map(n => escapeRegex(n)).join('|')})(?=\\s|$|[.,!?;:])`,
    'gi'
  )

  const parts: CommentBodyPart[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(body)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: body.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'mention', value: `@${match[1]}` })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < body.length) {
    parts.push({ type: 'text', value: body.slice(lastIndex) })
  }

  return parts.length ? parts : [{ type: 'text', value: body }]
}
