const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

function parseDateParts(value: string | Date): { day: number; month: number; year: number } | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return {
      day: value.getDate(),
      month: value.getMonth() + 1,
      year: value.getFullYear(),
    }
  }

  const trimmed = value.trim()
  if (!trimmed) return null

  if (DATE_ONLY_RE.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number)
    return { day, month, year }
  }

  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return null
  return {
    day: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  }
}

export function formatDateParts(day: number, month: number, year: number): string {
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
}

function isValidCalendarDate(day: number, month: number, year: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/** Parse DD/MM/YYYY or YYYY-MM-DD into ISO date-only (YYYY-MM-DD). */
export function parseDateInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  if (DATE_ONLY_RE.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number)
    return isValidCalendarDate(day, month, year) ? trimmed : null
  }

  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed)
  if (!slashMatch) return null

  const day = Number(slashMatch[1])
  const month = Number(slashMatch[2])
  const year = Number(slashMatch[3])
  if (!isValidCalendarDate(day, month, year)) return null

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function isIsoDate(value: string | null | undefined): value is string {
  if (!value?.trim()) return false
  return parseDateInput(value) === value.trim()
}

/** Display date as DD/MM/YYYY across the app. */
export function formatDate(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '—'
  const parts = parseDateParts(value)
  if (!parts) return '—'
  return formatDateParts(parts.day, parts.month, parts.year)
}

/** Display timestamp as DD/MM/YYYY, HH:mm. */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const datePart = formatDate(date)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${datePart}, ${hours}:${minutes}`
}

/** Compact table cell: DD/MM/YYYY · HH:mm */
export function formatDateTimeCompact(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const datePart = formatDate(date)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${datePart} · ${hours}:${minutes}`
}

export function formatDateRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined
): string {
  return `${formatDate(start)} – ${formatDate(end)}`
}

export function formatDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date)

  const day = parts.find(part => part.type === 'day')?.value ?? '01'
  const month = parts.find(part => part.type === 'month')?.value ?? '01'
  const year = parts.find(part => part.type === 'year')?.value ?? '1970'
  return `${day}/${month}/${year}`
}
