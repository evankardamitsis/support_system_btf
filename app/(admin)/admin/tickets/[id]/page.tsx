import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getStaffForMentions } from '@/app/actions/comments'
import { enrichCommentsWithAuthors } from '@/lib/comments/authors'
import { CommentThread } from '@/components/tickets/CommentThread'
import { TicketCommentForm } from '@/components/tickets/TicketCommentForm'
import { TicketDetailLayout } from '@/components/tickets/TicketDetailLayout'
import { getRetainerForClient } from '@/lib/retainers/active'
import { isTicketClosed } from '@/lib/tickets/closed'
import type { TicketStatus, TicketPriority } from '@/lib/types'

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
    : { data: null }
  const isAdmin = profile?.role === 'admin'

  const { data: ticket } = await supabase
    .from('tickets')
    .select('*, clients(name)')
    .eq('id', id)
    .single()
  if (!ticket) notFound()

  const [{ data: comments }, { data: retainers }, { data: hourLog }] = await Promise.all([
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
    supabase.from('hours_log').select('id').eq('ticket_id', id).limit(1).maybeSingle(),
  ])

  const [activeRetainer, enrichedComments, staffForMentions] = await Promise.all([
    getRetainerForClient(supabase, ticket.client_id),
    enrichCommentsWithAuthors(supabase, comments ?? []),
    getStaffForMentions(),
  ])

  const hoursLogged = Boolean(hourLog)
  const estimatedHours =
    ticket.estimated_hours != null ? Number(ticket.estimated_hours) : null
  const actualHours = ticket.actual_hours != null ? Number(ticket.actual_hours) : null
  const clientName = (ticket.clients as unknown as { name: string } | null)?.name ?? null

  const messageCount = enrichedComments.length
  const staffNames = staffForMentions.map(s => s.name)
  const closed = isTicketClosed(ticket.status as TicketStatus)

  return (
    <div className="ticket-detail w-full">
      <Link href="/admin/tickets" className="dash-back anim-fade-up anim-fade-up-1">
        ← Back to tickets
      </Link>

      <TicketDetailLayout
        ticketId={ticket.id}
        title={ticket.title}
        status={ticket.status as TicketStatus}
        priority={ticket.priority as TicketPriority}
        type={ticket.type}
        clientId={ticket.client_id}
        clientName={clientName}
        createdAt={ticket.created_at}
        updatedAt={ticket.updated_at}
        resolvedAt={ticket.resolved_at}
        description={ticket.description}
        estimateStatus={ticket.estimate_status ?? null}
        completionStatus={ticket.completion_status ?? null}
        estimatedHours={estimatedHours}
        actualHours={actualHours}
        hoursLogged={hoursLogged}
        activeRetainer={activeRetainer}
        retainers={retainers ?? []}
        defaultRetainerId={activeRetainer?.id}
        isAdmin={isAdmin}
      >
        <section className="ticket-detail-activity dash-panel">
          <div className="ticket-detail-activity-head">
            <h2 className="dash-section-title">Conversation</h2>
            <span className="dash-meta tabular-nums">
              {messageCount} {messageCount === 1 ? 'message' : 'messages'}
            </span>
          </div>

          <div className="ticket-detail-activity-thread">
            <CommentThread
              comments={enrichedComments}
              showInternal
              staffNames={staffNames}
            />
          </div>

          {closed ? (
            <p className="ticket-detail-reply dash-meta px-5 pb-5">This ticket is resolved.</p>
          ) : (
            <div className="ticket-detail-reply">
              <p className="ticket-detail-reply-label">Add to thread</p>
              <TicketCommentForm
                ticketId={ticket.id}
                variant="admin"
                staffForMentions={staffForMentions}
              />
            </div>
          )}
        </section>
      </TicketDetailLayout>
    </div>
  )
}
