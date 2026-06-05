'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { inviteTeamMember } from '@/app/actions/team'
import { ROLE_LABELS, STAFF_ROLES, type StaffRole } from '@/lib/team/roles'
import { CopyInput } from '@/components/ui/CopyInput'
import { FormPanel } from '@/components/dashboard/FormPanel'

export function InviteTeamForm() {
  const router = useRouter()
  const [role, setRole] = useState<StaffRole>('agent')
  const [link, setLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setError(null)
    setLink(null)
    setPending(true)
    const formData = new FormData(form)
    formData.set('role', role)

    const result = await inviteTeamMember(formData)
    setPending(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setLink(result.url)
    setRole('agent')
    form.reset()
    router.refresh()
  }

  return (
    <FormPanel title="Invite team member">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="dash-label">Role</p>
          <div className="retainer-package-picker" role="group" aria-label="Team role">
            {STAFF_ROLES.map(r => (
              <button
                key={r}
                type="button"
                className={`retainer-package-option ${role === r ? 'is-active' : ''}`}
                data-package={r === 'admin' ? 'grow' : 'care'}
                onClick={() => setRole(r)}
                disabled={pending}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
          <p className="dash-meta mt-2 leading-relaxed">
            <strong>Admin</strong> can invite others and manage clients. <strong>Member</strong>{' '}
            can work tickets and retainers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="dash-label" htmlFor="team-full-name">
              Full name <span className="dash-label-required">*</span>
            </label>
            <input
              id="team-full-name"
              name="full_name"
              required
              className="btf-input w-full"
              placeholder="Alex Smith"
              disabled={pending}
            />
          </div>
          <div>
            <label className="dash-label" htmlFor="team-email">
              Work email <span className="dash-label-required">*</span>
            </label>
            <input
              id="team-email"
              name="email"
              type="email"
              required
              className="btf-input w-full"
              placeholder="alex@belowthefold.gr"
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
          {pending ? 'Creating invite…' : 'Generate invite link'}
        </button>

        {link ? (
          <div className="space-y-2 pt-2 border-t border-border">
            <CopyInput value={link} />
            <p className="dash-meta leading-relaxed">
              Send this link privately. They set a password once; link expires in 7 days. If you
              already invited this email, submitting again reuses the same link.
            </p>
          </div>
        ) : null}
      </form>
    </FormPanel>
  )
}
