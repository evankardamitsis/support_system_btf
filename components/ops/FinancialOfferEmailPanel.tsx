'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, X } from 'lucide-react'
import { resendFinancialOfferEmail } from '@/app/actions/financial-offers'
import type { FinancialOfferRecord } from '@/lib/ops/financial-offer/types'
import { notifyError, runWithToast } from '@/lib/notify'

type FinancialOfferEmailPanelProps = {
  offer: FinancialOfferRecord
  onClose: () => void
}

export function FinancialOfferEmailPanel({ offer, onClose }: FinancialOfferEmailPanelProps) {
  const router = useRouter()
  const [email, setEmail] = useState(offer.clientEmail ?? '')
  const [pending, startTransition] = useTransition()

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const to = email.trim()
    if (!to) {
      notifyError('Enter the client email')
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
    <form className="financial-offers-email-panel" onSubmit={handleSend}>
      <p className="financial-offers-email-panel-title">
        Email offer to {offer.clientName}
      </p>
      <div className="financial-offers-email-panel-fields">
        <input
          type="email"
          className="btf-input w-full"
          placeholder="client@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={pending}
          required
          autoFocus
        />
        <button
          type="submit"
          className="dash-btn-primary btn-primary cursor-pointer shrink-0"
          disabled={pending}
        >
          <Mail size={14} />
          {pending ? 'Sending…' : offer.emailedAt ? 'Resend' : 'Send'}
        </button>
        <button
          type="button"
          className="financial-offers-action cursor-pointer shrink-0"
          aria-label="Close"
          disabled={pending}
          onClick={onClose}
        >
          <X size={15} />
        </button>
      </div>
    </form>
  )
}
