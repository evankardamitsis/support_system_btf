'use client'

import { requiresHoursOverageNote } from '@/lib/tickets/hours-overage'

export function ResolveOverageNoteField({
  estimatedHours,
  actualHoursInput,
  value,
  onChange,
  id,
}: {
  estimatedHours: number | null
  actualHoursInput: string
  value: string
  onChange: (value: string) => void
  id: string
}) {
  const actualHours = parseFloat(actualHoursInput)
  if (!requiresHoursOverageNote(estimatedHours, actualHours)) {
    return null
  }

  return (
    <div className="resolve-overage-note">
      <label className="dash-label" htmlFor={id}>
        Why more hours were needed
      </label>
      <textarea
        id={id}
        required
        rows={3}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="btf-input w-full text-sm resize-y min-h-[4.5rem]"
        placeholder="e.g. Additional scope discovered during implementation…"
      />
      <p className="dash-meta mt-2">The client will see this on the ticket details page.</p>
    </div>
  )
}
