export const PHASE_TONE_COUNT = 6

export const PHASE_TONE_COLORS = [
  '#8b5cf6',
  '#3b82f6',
  '#f59e0b',
  '#10b981',
  '#f43f5e',
  '#06b6d4',
] as const

export function normalizePhaseToneIndex(index: number): number {
  return ((index % PHASE_TONE_COUNT) + PHASE_TONE_COUNT) % PHASE_TONE_COUNT
}

export function phaseToneIndexFromPhaseId(
  phaseId: string | null | undefined,
  phases: ReadonlyArray<{ id: string }>
): number {
  if (!phaseId) return normalizePhaseToneIndex(PHASE_TONE_COUNT)
  const index = phases.findIndex(phase => phase.id === phaseId)
  if (index < 0) return 0
  return normalizePhaseToneIndex(index)
}

export function phaseToneRowClass(toneIndex: number): string {
  return `ops-phase-tone-row ops-phase-tone-row--${normalizePhaseToneIndex(toneIndex)}`
}

export function phaseToneLabelClass(toneIndex: number): string {
  return `ops-phase-tone-label ops-phase-tone-label--${normalizePhaseToneIndex(toneIndex)}`
}
