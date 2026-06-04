import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { NewTicketForm } from './NewTicketForm'

export default function NewTicketPage() {
  async function createTicket(formData: FormData) {
    'use server'
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

    const { data: ticket } = await supabase
      .from('tickets')
      .insert({
        client_id: profile!.client_id!,
        created_by: user.id,
        title: formData.get('title') as string,
        description: (formData.get('description') as string) || null,
        type: formData.get('type') as 'bug' | 'task' | 'request' | 'question',
      })
      .select('id')
      .single()

    if (ticket) redirect(`/portal/tickets/${ticket.id}`)
    redirect('/portal/tickets')
  }

  return (
    <div className="space-y-6 w-full max-w-2xl">
      <Link href="/portal/tickets" className="dash-back">
        ← Back to tickets
      </Link>

      <PageHeader
        title="New request"
        description="Send a request for anything — a fix, a change, or a question. It lands directly with BTF."
      />

      <NewTicketForm createTicket={createTicket} />
    </div>
  )
}
