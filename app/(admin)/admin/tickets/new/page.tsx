import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { FormPanel } from '@/components/dashboard/FormPanel'
import { AdminNewTicketForm } from '@/components/tickets/AdminNewTicketForm'
import Link from 'next/link'

export default async function AdminNewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const { client: defaultClientId } = await searchParams
  const supabase = await createClient()
  const { data: clients } = await supabase.from('clients').select('id, name').order('name')

  return (
    <div className="w-full max-w-2xl space-y-6">
      <Link href="/admin/tickets" className="dash-back">
        ← Back to tickets
      </Link>

      <PageHeader title="New ticket" description="Create a ticket on behalf of a client." />

      <FormPanel title="Ticket details">
        <AdminNewTicketForm clients={clients ?? []} defaultClientId={defaultClientId} />
      </FormPanel>
    </div>
  )
}
