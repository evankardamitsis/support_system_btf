import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { StatusPill } from '@/components/ui/StatusPill'
import { CommentThread } from '@/components/tickets/CommentThread'
import type { TicketStatus } from '@/lib/types'

function ticketId(id: string) { return `TKT-${id.substring(0, 4).toUpperCase()}` }

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: ticket } = await supabase
    .from('tickets').select('*').eq('id', id).single()
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
    const { data: { user } } = await supabase.auth.getUser()
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
      <Link
        href="/portal/tickets"
        className="text-[10px] tracking-[0.1em] uppercase hover:opacity-70 transition-opacity"
        style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-3)' }}
      >
        ← BACK
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">
        {/* Main */}
        <div className="space-y-5">
          {/* Ticket header */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between gap-4 mb-2">
                <span
                  className="text-[11px]"
                  style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--accent)' }}
                >
                  {ticketId(ticket.id)}
                </span>
                <StatusPill status={ticket.status as TicketStatus} />
              </div>
              <h1
                className="text-lg font-medium leading-snug"
                style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-1)' }}
              >
                {ticket.title}
              </h1>
            </div>
            {ticket.description && (
              <div
                className="px-5 py-4"
                style={{ borderLeft: '2px solid var(--accent)', margin: '1px', background: 'var(--surface-2)' }}
              >
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-2)' }}
                >
                  {ticket.description}
                </p>
              </div>
            )}
          </div>

          {/* Thread */}
          <div className="space-y-3">
            <p
              className="text-[10px] tracking-[0.15em] uppercase"
              style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-3)' }}
            >
              ACTIVITY
            </p>
            <CommentThread comments={comments ?? []} showInternal={false} />
          </div>

          {/* Reply */}
          {ticket.status !== 'closed' && (
            <form action={addComment} className="flex flex-col gap-3">
              <textarea
                name="body"
                required
                rows={4}
                placeholder="Write a reply…"
                className="btf-input w-full px-3 py-2.5 text-sm resize-y"
                style={{ minHeight: 96, fontFamily: 'var(--font-geist)' }}
              />
              <button
                type="submit"
                className="btn-primary self-start px-5 py-2.5 text-[11px] tracking-[0.15em] uppercase cursor-pointer"
                style={{
                  fontFamily: 'var(--font-dm-mono)',
                  background: 'var(--accent)',
                  color: 'var(--bg)',
                  border: 'none',
                  borderRadius: 0,
                }}
              >
                SEND →
              </button>
            </form>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-[9px] tracking-[0.15em] uppercase" style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-3)' }}>
              DETAILS
            </p>
          </div>
          <div className="px-4 py-4 flex flex-col gap-3">
            {[
              { label: 'TYPE',     value: ticket.type.toUpperCase() },
              { label: 'PRIORITY', value: ticket.priority.toUpperCase() },
              { label: 'OPENED',   value: new Date(ticket.created_at).toLocaleDateString('en-GB') },
              { label: 'UPDATED',  value: relativeTime(ticket.updated_at) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-[9px] tracking-[0.12em] uppercase" style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-3)' }}>
                  {label}
                </span>
                <span className="text-[11px]" style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-2)' }}>
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
