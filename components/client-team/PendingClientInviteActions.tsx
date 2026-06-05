'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { revokeClientInvite } from '@/app/actions/client-team'
import { CopyInput } from '@/components/ui/CopyInput'
import { notifyError, notifySuccess } from '@/lib/notify'

export function PendingClientInviteActions({
  inviteId,
  inviteUrl,
}: {
  inviteId: string
  inviteUrl: string
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function revoke() {
    if (
      !confirm(
        'Revoke this invite? The link will stop working and any unfinished signup for this email will be cleared.'
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await revokeClientInvite(inviteId)
      if (!result.ok) {
        setError(result.error)
        notifyError(result.error)
        return
      }
      notifySuccess('Invite revoked')
      router.refresh()
    })
  }

  return (
    <div className="team-pending-actions">
      <div className="team-pending-copy w-full max-w-xs">
        <CopyInput value={inviteUrl} />
      </div>
      <button
        type="button"
        className="dash-btn-secondary text-xs cursor-pointer team-pending-revoke"
        onClick={revoke}
        disabled={pending}
      >
        Revoke
      </button>
      {error ? <p className="ticket-modal-error text-xs">{error}</p> : null}
    </div>
  )
}
