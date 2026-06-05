import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { FormPanel } from '@/components/dashboard/FormPanel'
import { AdminNewTicketForm } from '@/components/tickets/AdminNewTicketForm'
import Link from 'next/link'
import { getStaffForMentions } from '@/app/actions/comments'

export default async function AdminNewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const { client: defaultClientId } = await searchParams
  const supabase = await createClient()
  const [{ data: clients }, staff] = await Promise.all([
    supabase.from('clients').select('id, name').order('name'),
    getStaffForMentions(),
  ])

  return (
    <div className="w-full max-w-2xl space-y-6">
      <Link href="/admin/tickets" className="dash-back">
        ← Back to tickets
      </Link>

      <PageHeader title="New ticket" description="Create a ticket on behalf of a client." />

      <FormPanel title="Ticket details">
        <AdminNewTicketForm
          clients={clients ?? []}
          staff={staff}
          defaultClientId={defaultClientId}
        />
      </FormPanel>
    </div>
  )
}
