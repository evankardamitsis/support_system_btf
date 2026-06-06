'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Mail } from 'lucide-react'
import { resendFinancialOfferEmail } from '@/app/actions/financial-offers'
import type { FinancialOfferRecord } from '@/lib/ops/financial-offer/types'
import { isValidEmailAddress, normalizeEmailAddress } from '@/lib/email/addresses'
import { useModalDialog } from '@/lib/ui/use-modal-dialog'
import { notifyError, runWithToast } from '@/lib/notify'

type FinancialOfferEmailPanelProps = {
  offer: FinancialOfferRecord
  open: boolean
  onClose: () => void
}

export function FinancialOfferEmailPanel({ offer, open, onClose }: FinancialOfferEmailPanelProps) {
  const router = useRouter()
  const dialogRef = useModalDialog(open, onClose)
  const [email, setEmail] = useState(offer.clientEmail ?? '')
  const [pending, startTransition] = useTransition()

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const to = normalizeEmailAddress(email)
    if (!to || !isValidEmailAddress(to)) {
      notifyError('Enter a valid client email address')
      return
    }

    startTransition(async () => {
      const ok = await runWithToast(() => resendFinancialOfferEmail(offer.id, to), {
        loading: 'Sending email…',
        success: offer.emailedAt ? 'Offer resent to client' : 'Offer emailed to client',
      })
      if (ok === null) return
      onClose()
      router.refresh()
    })
  }

  return (
    <dialog ref={dialogRef} className="ticket-modal ticket-modal--ops-form">
      {open ? (
        <form className="ticket-modal-inner" onSubmit={handleSend}>
          <h2 className="ticket-modal-title">
            {offer.emailedAt ? 'Resend offer' : 'Email offer'}
          </h2>
          <p className="ticket-modal-sub">
            Send the PDF offer to <strong>{offer.clientName}</strong>.
          </p>
          <div className="financial-offers-email-panel-fields">
            <div>
              <label className="dash-label" htmlFor="financial-offer-email-to">
                Client email
              </label>
              <input
                id="financial-offer-email-to"
                type="email"
                className="btf-input w-full"
                placeholder="client@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={pending}
                required
                autoFocus
              />
            </div>
          </div>
          <div className="ticket-modal-actions">
            <button
              type="button"
              className="dash-btn-secondary cursor-pointer"
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="dash-btn-primary btn-primary cursor-pointer"
              disabled={pending}
            >
              <Mail size={14} />
              {pending ? 'Sending…' : offer.emailedAt ? 'Resend' : 'Send'}
            </button>
          </div>
        </form>
      ) : null}
    </dialog>
  )
}
