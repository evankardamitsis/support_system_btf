'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { notifyError, notifySuccess } from '@/lib/notify'
import type { RemoveClientTeamMemberResult } from '@/lib/client-team/action-results'

export function ClientTeamMemberActions({
  memberName,
  memberEmail,
  removeAction,
}: {
  memberName: string
  memberEmail: string
  removeAction: () => Promise<RemoveClientTeamMemberResult>
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function confirmRemove() {
    setError(null)
    startTransition(async () => {
      const result = await removeAction()
      if (!result.ok) {
        setError(result.error)
        notifyError(result.error)
        return
      }
      setOpen(false)
      notifySuccess(`${memberName || memberEmail} removed from portal team`)
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        className="dash-btn-secondary text-xs cursor-pointer team-pending-revoke"
        onClick={() => setOpen(true)}
        disabled={pending}
      >
        Remove
      </button>

      <ConfirmDeleteModal
        open={open}
        onClose={() => {
          if (!pending) setOpen(false)
        }}
        title="Remove from portal team?"
        description={`${memberName || memberEmail} will lose access to this client's portal. Their account will be removed and they can be invited again later.`}
        confirmLabel="Remove teammate"
        confirmVariant="danger"
        pendingLabel="Removing…"
        pending={pending && open}
        error={open ? error : null}
        onConfirm={confirmRemove}
      />
    </>
  )
}
