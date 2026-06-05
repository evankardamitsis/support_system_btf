'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { revokeStaffInvite } from '@/app/actions/team'
import { CopyInput } from '@/components/ui/CopyInput'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { notifyError, notifySuccess } from '@/lib/notify'

export function PendingInviteActions({
  inviteId,
  inviteUrl,
}: {
  inviteId: string
  inviteUrl: string
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function confirmRevoke() {
    setError(null)
    startTransition(async () => {
      const result = await revokeStaffInvite(inviteId)
      if (!result.ok) {
        setError(result.error)
        notifyError(result.error)
        return
      }
      setRevokeOpen(false)
      notifySuccess('Invite revoked')
      router.refresh()
    })
  }

  return (
    <>
      <div className="team-pending-actions">
        <div className="team-pending-copy w-full max-w-xs">
          <CopyInput value={inviteUrl} />
        </div>
        <button
          type="button"
          className="dash-btn-secondary text-xs cursor-pointer team-pending-revoke"
          onClick={() => setRevokeOpen(true)}
          disabled={pending}
        >
          Revoke
        </button>
        {error && !revokeOpen ? (
          <p className="ticket-modal-error text-xs">{error}</p>
        ) : null}
      </div>

      <ConfirmDeleteModal
        open={revokeOpen}
        onClose={() => {
          if (!pending) setRevokeOpen(false)
        }}
        title="Revoke invite?"
        description="The invite link will stop working and any unfinished signup for this email will be cleared so you can invite them again."
        confirmLabel="Revoke invite"
        confirmVariant="danger"
        pendingLabel="Revoking…"
        pending={pending && revokeOpen}
        error={revokeOpen ? error : null}
        onConfirm={confirmRevoke}
      />
    </>
  )
}
