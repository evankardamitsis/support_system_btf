'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { inviteClientTeamMember } from '@/app/actions/client-team'
import { CopyInput } from '@/components/ui/CopyInput'
import { FormPanel } from '@/components/dashboard/FormPanel'
import { notifyError, notifySuccess } from '@/lib/notify'

export function InviteClientTeamForm() {
  const router = useRouter()
  const [fallbackLink, setFallbackLink] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const invitedEmail = (form.elements.namedItem('email') as HTMLInputElement)?.value?.trim()
    setError(null)
    setEmailError(null)
    setFallbackLink(null)
    setPending(true)

    const result = await inviteClientTeamMember(new FormData(form))
    setPending(false)

    if (!result.ok) {
      setError(result.error)
      notifyError(result.error)
      return
    }

    if (result.emailSent) {
      notifySuccess(
        invitedEmail ? `Invite sent to ${invitedEmail}` : 'Invite email sent'
      )
    } else {
      setEmailError(result.emailError ?? 'Email could not be sent')
      setFallbackLink(result.url)
      notifyError(result.emailError ?? 'Invite created but email could not be sent')
    }

    form.reset()
    router.refresh()
  }

  return (
    <FormPanel title="Invite teammate">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="dash-meta leading-relaxed">
          Add colleagues who need portal access. We email them an invite link to create their
          account. Ticket notification emails still go only to your main contact address.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="dash-label" htmlFor="client-team-full-name">
              Full name <span className="dash-label-required">*</span>
            </label>
            <input
              id="client-team-full-name"
              name="full_name"
              required
              className="btf-input w-full"
              placeholder="Maria Papadopoulou"
              disabled={pending}
            />
          </div>
          <div>
            <label className="dash-label" htmlFor="client-team-email">
              Work email <span className="dash-label-required">*</span>
            </label>
            <input
              id="client-team-email"
              name="email"
              type="email"
              required
              className="btf-input w-full"
              placeholder="maria@company.com"
              disabled={pending}
            />
          </div>
        </div>

        {error ? <p className="ticket-modal-error">{error}</p> : null}

        <button
          type="submit"
          className="dash-btn-primary btn-primary cursor-pointer"
          disabled={pending}
        >
          {pending ? 'Sending invite…' : 'Send invite'}
        </button>

        {emailError && fallbackLink ? (
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="ticket-modal-error leading-relaxed">{emailError}</p>
            <CopyInput value={fallbackLink} />
            <p className="dash-meta leading-relaxed">
              Copy this link and send it manually. It expires in 7 days.
            </p>
          </div>
        ) : null}
      </form>
    </FormPanel>
  )
}
