import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { StatusPill } from '@/components/ui/StatusPill'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { CommentThread } from '@/components/tickets/CommentThread'
import type { TicketStatus, TicketPriority } from '@/lib/types'

function ticketId(id: string) {
  return `TKT-${id.substring(0, 4).toUpperCase()}`
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default async function PortalTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: ticket } = await supabase.from('tickets').select('*').eq('id', id).single()
  if (!ticket) notFound()

  const { data: comments } = await supabase
    .from('ticket_comments')
    .select('id, body, author_id, is_internal, created_at')
    .eq('ticket_id', id)
    .eq('is_internal', false)
    .order('created_at', { ascending: true })

  async function addComment(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')
    await supabase.from('ticket_comments').insert({
      ticket_id: id,
      author_id: user.id,
      body: formData.get('body') as string,
      is_internal: false,
    })
    revalidatePath(`/portal/tickets/${id}`)
  }

  return (
    <div className="space-y-6">
      <Link href="/portal/tickets" className="dash-back">
        ← Back to tickets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">
        <div className="space-y-5">
          <div className="dash-panel">
            <div className="dash-card-section px-5 py-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <span className="dash-ticket-id">{ticketId(ticket.id)}</span>
                <StatusPill status={ticket.status as TicketStatus} />
              </div>
              <h1
                className="text-lg font-medium leading-snug"
                style={{ color: 'var(--text-1)', fontFamily: 'var(--font-geist)' }}
              >
                {ticket.title}
              </h1>
            </div>
            {ticket.description && (
              <div
                className="px-5 py-4"
                style={{
                  borderTop: '1px solid var(--border)',
                  borderLeft: '2px solid var(--accent)',
                  background: 'var(--surface)',
                }}
              >
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: 'var(--text-2)', fontFamily: 'var(--font-geist)' }}
                >
                  {ticket.description}
                </p>
              </div>
            )}
            <div className="px-5 py-3 flex flex-wrap gap-4 dash-meta">
              <span className="capitalize">{ticket.type}</span>
              <PriorityBadge priority={ticket.priority as TicketPriority} />
            </div>
          </div>

          <div className="dash-panel">
            <div className="dash-card-section px-5 py-3">
              <h2 className="dash-section-title">Activity</h2>
            </div>
            <div className="px-5 py-4">
              <CommentThread comments={comments ?? []} showInternal={false} />
            </div>
            {ticket.status !== 'closed' && (
              <div className="px-5 pb-5 pt-0" style={{ borderTop: '1px solid var(--border)' }}>
                <form action={addComment} className="flex flex-col gap-3 pt-4">
                  <textarea
                    name="body"
                    required
                    rows={4}
                    placeholder="Write a reply…"
                    className="btf-input w-full resize-y"
                    style={{ minHeight: 96 }}
                  />
                  <button type="submit" className="dash-btn-primary btn-primary self-start cursor-pointer">
                    Send reply
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        <div className="dash-panel">
          <div className="dash-card-section px-4 py-3">
            <h3 className="dash-section-title">Details</h3>
          </div>
          <div className="px-4 py-4 flex flex-col gap-3">
            {[
              { label: 'Type', value: ticket.type },
              { label: 'Priority', value: ticket.priority },
              { label: 'Opened', value: new Date(ticket.created_at).toLocaleDateString('en-GB') },
              { label: 'Updated', value: relativeTime(ticket.updated_at) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center gap-4 text-sm">
                <span className="dash-meta uppercase">{label}</span>
                <span className="font-mono capitalize" style={{ color: 'var(--text-1)' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
