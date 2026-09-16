'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Eye, Mail, ShieldCheck, UserPlus } from 'lucide-react'
import { invitePerformanceViewer } from '@/app/actions/performance-access'
import { CopyInput } from '@/components/ui/CopyInput'
import { notifyError, notifySuccess } from '@/lib/notify'
import type { PerformanceAccessDirectory } from '@/lib/performance/access-types'

export function PerformanceAccessPanel({
  accountId,
  accountName,
  directory,
}: {
  accountId: string
  accountName: string
  directory: PerformanceAccessDirectory
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fallbackLink, setFallbackLink] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setPending(true)
    setError(null)
    setFallbackLink(null)
    const result = await invitePerformanceViewer(data)
    setPending(false)

    if (!result.ok) {
      setError(result.error)
      notifyError(result.error)
      return
    }

    if (result.emailSent) {
      notifySuccess(result.existingUser ? 'Dashboard access email sent' : 'Dashboard invitation sent')
    } else {
      setFallbackLink(result.url)
      setError(result.emailError || 'Invite created, but the email could not be sent.')
      notifyError(result.emailError || 'Invite created, but the email could not be sent.')
    }
    form.reset()
    router.refresh()
  }

  return (
    <section className="performance-access-panel">
      <div className="performance-access-intro">
        <div className="performance-access-icon"><ShieldCheck size={20} aria-hidden /></div>
        <span className="performance-eyebrow">Client access · isolated</span>
        <h2>Invite a dashboard viewer</h2>
        <p>Give the client read-only access to <strong>{accountName}</strong>. This invitation cannot open tickets, retainers, team settings, integrations, or any other client dashboard.</p>
        <div className="performance-access-scope">
          <span><Eye size={13} aria-hidden /> This dashboard only</span>
          <span><ShieldCheck size={13} aria-hidden /> Read only</span>
        </div>
      </div>

      <form onSubmit={submit} className="performance-access-form">
        <input type="hidden" name="accountId" value={accountId} />
        <label>
          <span>Client name</span>
          <input name="full_name" required autoComplete="name" defaultValue={accountName} placeholder="Client name" disabled={pending || directory.setupRequired} />
        </label>
        <label>
          <span>Email address</span>
          <input name="email" type="email" required autoComplete="email" placeholder="client@example.com" disabled={pending || directory.setupRequired} />
        </label>
        <button type="submit" className="performance-primary-button" disabled={pending || directory.setupRequired}>
          <UserPlus size={14} aria-hidden />
          {pending ? 'Sending invitation' : 'Send dashboard invite'}
        </button>
        {directory.setupRequired ? <p className="performance-form-message is-error" role="status">Apply database migration 056 to enable isolated dashboard invitations.</p> : null}
        {error ? <p className="performance-form-message is-error" role="alert">{error}</p> : null}
        {fallbackLink ? <div className="performance-access-fallback"><CopyInput value={fallbackLink} /><small>Copy this secure link and send it manually. It expires in 7 days.</small></div> : null}
      </form>

      {(directory.viewers.length || directory.pendingInvites.length) ? (
        <div className="performance-access-directory">
          <div className="performance-access-directory-head">
            <span>People with dashboard access</span>
            <strong>{directory.viewers.length + directory.pendingInvites.length}</strong>
          </div>
          {directory.viewers.map(viewer => (
            <div className="performance-access-person" key={viewer.id}>
              <span className="is-live"><Check size={12} aria-hidden /></span>
              <div><strong>{viewer.fullName || viewer.email}</strong><small>{viewer.email || 'Client viewer'}</small></div>
              <em>Active</em>
            </div>
          ))}
          {directory.pendingInvites.map(invite => (
            <div className="performance-access-person" key={invite.id}>
              <span className="is-pending"><Mail size={12} aria-hidden /></span>
              <div><strong>{invite.fullName}</strong><small>{invite.email}</small></div>
              <em>Invited</em>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
