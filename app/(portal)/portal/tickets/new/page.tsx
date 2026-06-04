import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NewTicketForm } from './NewTicketForm'

export default function NewTicketPage() {
  async function createTicket(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: profile } = await supabase
      .from('users').select('client_id').eq('id', user.id).single()

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
    <div className="space-y-6 max-w-xl">
      <div>
        <Link
          href="/portal/tickets"
          className="text-[10px] tracking-[0.1em] uppercase hover:opacity-70 transition-opacity"
          style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-3)' }}
        >
          ← BACK
        </Link>
        <h1
          className="text-base tracking-[0.1em] uppercase mt-4"
          style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-1)' }}
        >
          NEW TICKET
        </h1>
      </div>
      <NewTicketForm createTicket={createTicket} />
    </div>
  )
}
