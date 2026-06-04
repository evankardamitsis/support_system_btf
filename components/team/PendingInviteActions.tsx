'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { revokeStaffInvite } from '@/app/actions/team'
import { CopyInput } from '@/components/ui/CopyInput'

export function PendingInviteActions({
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
    if (!confirm('Revoke this invite? They will not be able to use the link anymore.')) return
    setError(null)
    startTransition(async () => {
      try {
        await revokeStaffInvite(inviteId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not revoke invite')
      }
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
