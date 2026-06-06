'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateClientApprovalReminders } from '@/app/actions/clients'
import { FormPanel } from '@/components/dashboard/FormPanel'
import { runWithToast } from '@/lib/notify'

export function ClientApprovalRemindersToggle({
  clientId,
  enabled,
  canManage,
}: {
  clientId: string
  enabled: boolean
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState(enabled)

  function handleChange(next: boolean) {
    setValue(next)
    startTransition(async () => {
      const ok = await runWithToast(
        () => updateClientApprovalReminders(clientId, next),
        {
          loading: 'Saving…',
          success: next ? 'Approval reminders enabled' : 'Approval reminders disabled',
        }
      )
      if (ok === null) {
        setValue(!next)
        return
      }
      router.refresh()
    })
  }

  return (
    <FormPanel title="Ticket approval reminders">
      <label className={`client-reminder-toggle${canManage ? '' : ' client-reminder-toggle--readonly'}`}>
        <input
          type="checkbox"
          className="client-reminder-toggle-input"
          checked={value}
          disabled={!canManage || pending}
          onChange={event => handleChange(event.target.checked)}
        />
        <span className="client-reminder-toggle-track" aria-hidden />
        <span className="client-reminder-toggle-copy">
          <span className="client-reminder-toggle-label">
            {value ? 'Reminders on' : 'Reminders off'}
          </span>
          <span className="dash-meta client-reminder-toggle-desc">
            {value
              ? 'Clients get follow-up emails after 2 days, then again 3 days later if they have not approved an estimate, completed work, or extra hours. Tickets move to on hold the next day after the second reminder.'
              : 'No automated reminder emails or auto on-hold for this client. The initial approval request email still sends when staff submit for approval.'}
          </span>
        </span>
      </label>
    </FormPanel>
  )
}
