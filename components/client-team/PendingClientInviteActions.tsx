'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { resendClientTeamInvite, revokeClientInvite } from '@/app/actions/client-team'
import { CopyInput } from '@/components/ui/CopyInput'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { notifyError, notifySuccess } from '@/lib/notify'
import type {
  InviteClientTeamMemberResult,
  RevokeClientInviteResult,
} from '@/lib/client-team/action-results'

export function PendingClientInviteActions({
  inviteId,
  inviteUrl,
  resendAction = resendClientTeamInvite,
  revokeAction = revokeClientInvite,
}: {
  inviteId: string
  inviteUrl: string
  resendAction?: (inviteId: string) => Promise<InviteClientTeamMemberResult>
  revokeAction?: (inviteId: string) => Promise<RevokeClientInviteResult>
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [fallbackLink, setFallbackLink] = useState<string | null>(null)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function confirmRevoke() {
    setError(null)
    setFallbackLink(null)
    startTransition(async () => {
      const result = await revokeAction(inviteId)
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

  function resend() {
    setError(null)
    setFallbackLink(null)
    startTransition(async () => {
      const result = await resendAction(inviteId)
      if (!result.ok) {
        setError(result.error)
        notifyError(result.error)
        return
      }
      if (result.emailSent) {
        notifySuccess('Invite email resent')
        router.refresh()
        return
      }
      setError(result.emailError ?? 'Email could not be sent')
      setFallbackLink(result.url)
      notifyError(result.emailError ?? 'Could not resend invite email')
    })
  }

  return (
    <>
      <div className="team-pending-actions">
        <button
          type="button"
          className="dash-btn-secondary text-xs cursor-pointer"
          onClick={resend}
          disabled={pending}
        >
          {pending && !revokeOpen ? 'Sending…' : 'Resend email'}
        </button>
        <button
          type="button"
          className="dash-btn-secondary text-xs cursor-pointer team-pending-revoke"
          onClick={() => setRevokeOpen(true)}
          disabled={pending}
        >
          Revoke
        </button>
        {fallbackLink ? (
          <div className="team-pending-copy w-full max-w-xs">
            <CopyInput value={fallbackLink} />
          </div>
        ) : (
          <details className="team-pending-copy w-full max-w-xs">
            <summary className="dash-meta text-xs cursor-pointer">Copy invite link</summary>
            <div className="mt-2">
              <CopyInput value={inviteUrl} />
            </div>
          </details>
        )}
        {error ? <p className="ticket-modal-error text-xs">{error}</p> : null}
      </div>

      <ConfirmDeleteModal
        open={revokeOpen}
        onClose={() => {
          if (!pending) setRevokeOpen(false)
        }}
        title="Revoke invite?"
        description="The invite link will stop working and any unfinished signup for this email will be cleared. You can send a new invite afterward."
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
