import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { NewTicketForm } from './NewTicketForm'
import { getClientRetainerStatus } from '@/lib/retainers/guards'
import { canUseRetainerHours, retainerStatusMessage } from '@/lib/retainers/status'

export default async function NewTicketPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user.id)
    .single()

  if (!profile?.client_id) redirect('/auth/login')

  const status = await getClientRetainerStatus(supabase, profile.client_id)
  const canSubmit = canUseRetainerHours(status)

  return (
    <div className="space-y-6 w-full max-w-2xl">
      <Link href="/portal/tickets" className="dash-back">
        ← Back to tickets
      </Link>

      <PageHeader
        title="New request"
        description="Send a request for anything — a fix, a change, or a question. It lands directly with BTF."
      />

      {!canSubmit ? (
        <div className="retainer-lifecycle-banner" data-tone="blocked">
          <p className="retainer-lifecycle-banner-title">Requests paused</p>
          <p className="dash-meta leading-relaxed mt-2">{retainerStatusMessage(status)}</p>
        </div>
      ) : (
        <NewTicketForm />
      )}
    </div>
  )
}
