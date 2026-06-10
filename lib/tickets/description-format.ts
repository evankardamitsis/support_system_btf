import sanitizeHtml from 'sanitize-html'

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i

export function isTicketDescriptionHtml(value: string): boolean {
  return HTML_TAG_PATTERN.test(value.trim())
}

export function isEmptyTicketDescription(value: string | null | undefined): boolean {
  if (!value?.trim()) return true
  const text = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
  return !text
}

export function normalizeTicketDescription(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (isEmptyTicketDescription(trimmed)) return null
  return trimmed
}

export function sanitizeTicketDescriptionHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'a',
      'ul',
      'ol',
      'li',
      'h2',
      'h3',
      'blockquote',
      'code',
      'pre',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow' }),
    },
  })
}
