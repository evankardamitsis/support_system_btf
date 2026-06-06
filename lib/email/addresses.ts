const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Trim and lowercase for ZeptoMail / SMTP delivery. */
export function normalizeEmailAddress(raw: string): string | null {
  const email = raw.trim().toLowerCase()
  return email || null
}

export function isValidEmailAddress(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254
}

export function resolveRecipientAddresses(to: string | string[]): string[] | null {
  const addresses = (Array.isArray(to) ? to : [to])
    .map(value => normalizeEmailAddress(value))
    .filter((value): value is string => value !== null && isValidEmailAddress(value))

  return addresses.length > 0 ? addresses : null
}
