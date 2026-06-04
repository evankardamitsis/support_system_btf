import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { StatusPill } from '@/components/ui/StatusPill'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { CommentThread } from '@/components/tickets/CommentThread'
import { ArrowLeft, Clock, User } from 'lucide-react'
import type { TicketStatus, TicketPriority } from '@/lib/types'

function ticketId(id: string) {
  return `TKT-${id.substring(0, 4).toUpperCase()}`
}

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: ticket } = await supabase
    .from('tickets')
    .select('*, clients(name)')
    .eq('id', id)
    .single()
  if (!ticket) notFound()

  const [{ data: comments }, { data: retainers }] = await Promise.all([
    supabase
      .from('ticket_comments')
      .select('id, body, author_id, is_internal, created_at')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('retainers')
      .select('id, period_start, period_end, hours_total, hours_used')
      .eq('client_id', ticket.client_id)
      .order('period_start', { ascending: false }),
  ])

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
      is_internal: formData.get('is_internal') === 'true',
    })
    revalidatePath(`/admin/tickets/${id}`)
  }

  async function updateStatus(formData: FormData) {
    'use server'
    const supabase = await createClient()
    await supabase
      .from('tickets')
      .update({ status: formData.get('status') as TicketStatus })
      .eq('id', id)
    revalidatePath(`/admin/tickets/${id}`)
    revalidatePath('/admin/tickets')
  }

  async function logHours(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')
    await supabase.from('hours_log').insert({
      ticket_id: id,
      retainer_id: formData.get('retainer_id') as string,
      agent_id: user.id,
      minutes: Math.round(parseFloat(formData.get('hours') as string) * 60),
      note: (formData.get('note') as string) || null,
    })
    revalidatePath(`/admin/tickets/${id}`)
    revalidatePath('/admin/retainers')
  }

  const clientName = (ticket.clients as unknown as { name: string } | null)?.name

  return (
    <div className="space-y-6">
      <Link href="/admin/tickets" className="dash-back">
        <ArrowLeft size={14} />
        Back to tickets
      </Link>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6 items-start">
        <div className="space-y-5">
          <div className="dash-panel">
            <div className="dash-card-section px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="dash-ticket-id">{ticketId(ticket.id)}</span>
                    {clientName && (
                      <>
                        <span style={{ color: 'var(--border)' }}>·</span>
                        <Link
                          href={`/admin/clients/${ticket.client_id}`}
                          className="dash-meta hover:opacity-80"
                          style={{ color: 'var(--text-2)' }}
                        >
                          {clientName}
                        </Link>
                      </>
                    )}
                  </div>
                  <h1
                    className="text-xl font-medium leading-snug"
                    style={{ color: 'var(--text-1)', fontFamily: 'var(--font-geist)' }}
                  >
                    {ticket.title}
                  </h1>
                </div>
                <StatusPill status={ticket.status as TicketStatus} />
              </div>
            </div>
            {ticket.description && (
              <div
                className="px-6 py-4 border-b"
                style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
              >
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: 'var(--text-2)', fontFamily: 'var(--font-geist)' }}
                >
                  {ticket.description}
                </p>
              </div>
            )}
            <div className="px-6 py-3 flex flex-wrap items-center gap-5 dash-meta">
              <span className="flex items-center gap-1.5">
                <Clock size={12} />
                Opened {new Date(ticket.created_at).toLocaleDateString('en-GB')}
              </span>
              <span className="flex items-center gap-1.5">
                <User size={12} />
                <PriorityBadge priority={ticket.priority as TicketPriority} />
              </span>
              <span className="capitalize">{ticket.type}</span>
            </div>
          </div>

          <div className="dash-panel">
            <div className="dash-card-section px-6 py-4">
              <h2 className="dash-section-title">Activity</h2>
            </div>
            <div className="px-6 py-4">
              <CommentThread comments={comments ?? []} showInternal={true} />
            </div>
            <div
              className="px-6 pb-5 pt-4"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <form action={addComment} className="space-y-3">
                <textarea
                  name="body"
                  required
                  rows={3}
                  placeholder="Write a reply or internal note…"
                  className="btf-input w-full resize-y"
                  style={{ minHeight: 88 }}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    name="is_internal"
                    value="false"
                    className="dash-btn-primary btn-primary cursor-pointer"
                  >
                    Reply
                  </button>
                  <button
                    type="submit"
                    name="is_internal"
                    value="true"
                    className="dash-btn-secondary cursor-pointer"
                  >
                    Internal note
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="dash-panel">
            <div className="dash-card-section px-4 py-3">
              <h3 className="dash-section-title">Update status</h3>
            </div>
            <div className="p-4">
              <form action={updateStatus} className="flex gap-2">
                <select name="status" defaultValue={ticket.status} className="dash-select flex-1 text-sm">
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_on_client">Waiting on client</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <button type="submit" className="dash-btn-primary btn-primary cursor-pointer shrink-0">
                  Save
                </button>
              </form>
            </div>
          </div>

          <div className="dash-panel">
            <div className="dash-card-section px-4 py-3">
              <h3 className="dash-section-title">Log hours</h3>
            </div>
            <div className="p-4">
              <form action={logHours} className="space-y-2.5">
                <select name="retainer_id" required className="dash-select w-full text-sm">
                  <option value="">Select period…</option>
                  {retainers?.map(r => (
                    <option key={r.id} value={r.id}>
                      {new Date(r.period_start).toLocaleDateString('en-GB')} (
                      {Number(r.hours_used).toFixed(1)}/{Number(r.hours_total).toFixed(1)}h)
                    </option>
                  ))}
                </select>
                <input
                  name="hours"
                  type="number"
                  step="0.25"
                  min="0.25"
                  required
                  placeholder="Hours (e.g. 1.5)"
                  className="btf-input w-full text-sm"
                />
                <input name="note" placeholder="Note (optional)" className="btf-input w-full text-sm" />
                <button
                  type="submit"
                  className="dash-btn-primary btn-primary w-full cursor-pointer justify-center"
                >
                  Log hours
                </button>
              </form>
            </div>
          </div>

          <div className="dash-panel">
            <div className="dash-card-section px-4 py-3">
              <h3 className="dash-section-title">Details</h3>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: 'Client', value: clientName ?? '—' },
                { label: 'Type', value: ticket.type },
                { label: 'Priority', value: ticket.priority },
                { label: 'Opened', value: new Date(ticket.created_at).toLocaleDateString('en-GB') },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm gap-4">
                  <span className="dash-meta">{label}</span>
                  <span
                    className="font-medium capitalize text-right"
                    style={{ color: 'var(--text-1)' }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
