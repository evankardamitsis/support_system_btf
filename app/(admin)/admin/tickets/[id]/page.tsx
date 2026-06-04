import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { StatusPill } from '@/components/ui/StatusPill'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { CommentThread } from '@/components/tickets/CommentThread'
import { ArrowLeft, Clock, User } from 'lucide-react'
import type { TicketStatus, TicketPriority } from '@/lib/types'

function ticketId(id: string) { return `TKT-${id.substring(0, 4).toUpperCase()}` }

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: ticket } = await supabase
    .from('tickets').select('*, clients(name)').eq('id', id).single()
  if (!ticket) notFound()

  const [{ data: comments }, { data: retainers }] = await Promise.all([
    supabase.from('ticket_comments')
      .select('id, body, author_id, is_internal, created_at')
      .eq('ticket_id', id).order('created_at', { ascending: true }),
    supabase.from('retainers').select('id, period_start, period_end, hours_total, hours_used')
      .eq('client_id', ticket.client_id).order('period_start', { ascending: false }),
  ])

  async function addComment(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')
    await supabase.from('ticket_comments').insert({
      ticket_id: id, author_id: user.id,
      body: formData.get('body') as string,
      is_internal: formData.get('is_internal') === 'true',
    })
    revalidatePath(`/admin/tickets/${id}`)
  }

  async function updateStatus(formData: FormData) {
    'use server'
    const supabase = await createClient()
    await supabase.from('tickets').update({ status: formData.get('status') as TicketStatus }).eq('id', id)
    revalidatePath(`/admin/tickets/${id}`)
    revalidatePath('/admin/tickets')
  }

  async function logHours(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
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
      {/* Back */}
      <Link href="/admin/tickets" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft size={15} />
        Back to tickets
      </Link>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">
        {/* Main column */}
        <div className="space-y-5">
          {/* Ticket header */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-gray-400">{ticketId(ticket.id)}</span>
                    {clientName && (
                      <>
                        <span className="text-gray-200">·</span>
                        <Link href={`/admin/clients/${ticket.client_id}`} className="text-xs text-gray-400 hover:text-blue-600 transition-colors">
                          {clientName}
                        </Link>
                      </>
                    )}
                  </div>
                  <h1 className="text-xl font-semibold text-gray-900 leading-snug">{ticket.title}</h1>
                </div>
                <StatusPill status={ticket.status as TicketStatus} />
              </div>
            </div>
            {ticket.description && (
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
              </div>
            )}
            <div className="px-6 py-3 flex items-center gap-5 text-xs text-gray-400">
              <span className="flex items-center gap-1.5"><Clock size={12} /> Opened {new Date(ticket.created_at).toLocaleDateString('en-GB')}</span>
              <span className="flex items-center gap-1.5"><User size={12} /> <PriorityBadge priority={ticket.priority as TicketPriority} /></span>
              <span className="capitalize">{ticket.type}</span>
            </div>
          </div>

          {/* Activity */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Activity</h2>
            </div>
            <div className="px-6 py-4">
              <CommentThread comments={comments ?? []} showInternal={true} />
            </div>

            {/* Reply */}
            <div className="px-6 pb-5 border-t border-gray-100 pt-4">
              <form action={addComment} className="space-y-3">
                <textarea
                  name="body"
                  required
                  rows={3}
                  placeholder="Write a reply or internal note…"
                  className="w-full px-4 py-3 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent placeholder:text-gray-400"
                  style={{ minHeight: 88 }}
                />
                <div className="flex gap-2">
                  <button
                    type="submit" name="is_internal" value="false"
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    Reply
                  </button>
                  <button
                    type="submit" name="is_internal" value="true"
                    className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 text-sm font-medium rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    Internal note
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Update Status</h3>
            </div>
            <div className="p-4">
              <form action={updateStatus} className="flex gap-2">
                <select
                  name="status"
                  defaultValue={ticket.status}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_on_client">Waiting on client</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <button type="submit" className="px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer">
                  Save
                </button>
              </form>
            </div>
          </div>

          {/* Log hours */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Log Hours</h3>
            </div>
            <div className="p-4">
              <form action={logHours} className="space-y-2.5">
                <select
                  name="retainer_id" required
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                >
                  <option value="">Select period…</option>
                  {retainers?.map(r => (
                    <option key={r.id} value={r.id}>
                      {new Date(r.period_start).toLocaleDateString('en-GB')} ({Number(r.hours_used).toFixed(1)}/{Number(r.hours_total).toFixed(1)}h)
                    </option>
                  ))}
                </select>
                <input
                  name="hours" type="number" step="0.25" min="0.25" required
                  placeholder="Hours (e.g. 1.5)"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
                />
                <input
                  name="note"
                  placeholder="Note (optional)"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
                />
                <button type="submit" className="w-full py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer">
                  Log hours
                </button>
              </form>
            </div>
          </div>

          {/* Details */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</h3>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: 'Client', value: clientName ?? '—' },
                { label: 'Type',   value: ticket.type },
                { label: 'Priority', value: ticket.priority },
                { label: 'Opened', value: new Date(ticket.created_at).toLocaleDateString('en-GB') },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-400">{label}</span>
                  <span className="text-gray-900 font-medium capitalize">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
