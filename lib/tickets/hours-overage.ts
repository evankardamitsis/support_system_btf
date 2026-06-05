export function requiresHoursOverageNote(
  estimatedHours: number | null | undefined,
  actualHours: number
): boolean {
  if (estimatedHours == null || estimatedHours <= 0 || Number.isNaN(actualHours)) {
    return false
  }
  return actualHours > estimatedHours + 0.01
}

export function resolveHoursOverageNote(
  estimatedHours: number | null | undefined,
  actualHours: number,
  overageNote?: string | null
): string | null {
  if (!requiresHoursOverageNote(estimatedHours, actualHours)) {
    return null
  }
  const trimmed = overageNote?.trim()
  if (!trimmed) {
    throw new Error('Add a note explaining why more hours were needed — the client will see it')
  }
  return trimmed
}
