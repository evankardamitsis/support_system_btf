import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTicketAttachments } from '@/app/actions/ticket-attachments'
import { StatusPill } from '@/components/ui/StatusPill'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { enrichCommentsWithAuthors } from '@/lib/comments/authors'
import { CommentThread } from '@/components/tickets/CommentThread'
import { EstimateApprovalModal } from '@/components/tickets/EstimateApprovalModal'
import { WorkApprovalModal } from '@/components/tickets/WorkApprovalModal'
import { ExtraHoursApprovalModal } from '@/components/tickets/ExtraHoursApprovalModal'
import { TicketCommentForm } from '@/components/tickets/TicketCommentForm'
import { PortalTicketHoursSummary } from '@/components/portal/PortalTicketHoursSummary'
import { formatDate } from '@/lib/dates'
import { formatDateTimeHuman } from '@/lib/tickets/display'
import { isTicketClosed } from '@/lib/tickets/closed'
import { requirePortalClient } from '@/lib/auth/portal-context'
import { clientUsesHourBilling } from '@/lib/retainers/billing-model'
import { FormattedTicketDescription } from '@/components/tickets/FormattedTicketDescription'
import { isEmptyTicketDescription } from '@/lib/tickets/description-format'
import { ticketUsesHourBilling } from '@/lib/tickets/hours-billing'
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
  const { supabase, clientId } = await requirePortalClient()

  const [{ data: ticket }, clientHourBilling] = await Promise.all([
    supabase.from('tickets').select('*').eq('id', id).single(),
    clientUsesHourBilling(supabase, clientId),
  ])
  if (!ticket) notFound()

  const hoursBilling = ticketUsesHourBilling(clientHourBilling, ticket.no_hours)

  const estimatedHours =
    ticket.estimated_hours != null ? Number(ticket.estimated_hours) : null
  const actualHours = ticket.actual_hours != null ? Number(ticket.actual_hours) : null
  const pendingEstimateApproval = ticket.estimate_status === 'pending_approval'
  const pendingWorkApproval = ticket.completion_status === 'pending_approval'
  const closed = isTicketClosed(ticket.status as TicketStatus)

  const [{ data: comments }, { data: pendingExtraHours }, { data: approvedExtraHours }, attachmentGroups] =
    await Promise.all([
    supabase
    .from('ticket_comments')
    .select('id, body, author_id, is_internal, created_at')
    .eq('ticket_id', id)
    .eq('is_internal', false)
    .order('created_at', { ascending: true }),
    supabase
      .from('ticket_extra_hours')
      .select('id, minutes, note, submitted_at')
      .eq('ticket_id', id)
      .eq('status', 'pending_approval')
      .order('submitted_at', { ascending: true }),
    supabase
      .from('ticket_extra_hours')
      .select('minutes')
      .eq('ticket_id', id)
      .eq('status', 'approved'),
    getTicketAttachments(supabase, id),
  ])

  const enrichedComments = await enrichCommentsWithAuthors(supabase, comments ?? [])
  const attachmentsByComment = new Map(
    attachmentGroups.filter(g => g.commentId !== null).map(g => [g.commentId!, g.items])
  )
  const commentsWithAttachments = enrichedComments.map(c => ({
    ...c,
    attachments: attachmentsByComment.get(c.id) ?? [],
  }))
  const ticketLevelAttachments = attachmentGroups.find(g => g.commentId === null)?.items ?? []
  const approvedExtraMinutes = (approvedExtraHours ?? []).reduce(
    (sum, row) => sum + row.minutes,
    0
  )
  const pendingExtraMinutes = (pendingExtraHours ?? []).reduce(
    (sum, row) => sum + row.minutes,
    0
  )

  return (
    <div className="space-y-6">
      <Link href="/portal/tickets" className="dash-back">
        ← Back to tickets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">
        <div className="space-y-5">
          {hoursBilling && !closed && pendingEstimateApproval && estimatedHours != null && estimatedHours > 0 ? (
            <EstimateApprovalModal
              ticketId={ticket.id}
              ticketTitle={ticket.title}
              estimatedHours={estimatedHours}
              priority={ticket.priority as TicketPriority}
            />
          ) : null}

          {hoursBilling && !closed && pendingWorkApproval ? (
            <WorkApprovalModal ticketId={ticket.id} ticketTitle={ticket.title} />
          ) : null}

          {hoursBilling && closed && (pendingExtraHours?.length ?? 0) > 0 ? (
            <ExtraHoursApprovalModal
              ticketTitle={ticket.title}
              pending={pendingExtraHours ?? []}
            />
          ) : null}

          <div className="dash-panel">
            <div className="dash-card-section px-5 py-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <span className="dash-ticket-id">{ticketId(ticket.id)}</span>
                <div className="portal-ticket-header-badges">
                  <StatusPill status={ticket.status as TicketStatus} />
                  <PriorityBadge priority={ticket.priority as TicketPriority} />
                </div>
              </div>
              <h1
                className="text-lg font-medium leading-snug"
                style={{ color: 'var(--text-1)', fontFamily: 'var(--font-geist)' }}
              >
                {ticket.title}
              </h1>
            </div>
            {hoursBilling ? (
              <PortalTicketHoursSummary
                closed={closed}
                status={ticket.status as TicketStatus}
                estimatedHours={estimatedHours}
                actualHours={actualHours}
                approvedExtraMinutes={approvedExtraMinutes}
                pendingExtraMinutes={pendingExtraMinutes}
                extraHoursActiveAt={ticket.extra_hours_active_at ?? null}
                estimateStatus={ticket.estimate_status ?? null}
                hoursOverageNote={ticket.hours_overage_note}
              />
            ) : null}
            {ticket.description && !isEmptyTicketDescription(ticket.description) ? (
              <section className="portal-ticket-request">
                <h2 className="portal-ticket-request-label">Your request</h2>
                <FormattedTicketDescription
                  content={ticket.description}
                  className="portal-ticket-request-body"
                />
              </section>
            ) : null}
            {ticketLevelAttachments.length > 0 ? (
              <section className="portal-ticket-request">
                <h2 className="portal-ticket-request-label">Attachments</h2>
                <div className="ticket-comment-images" style={{ padding: '0 1.25rem 1rem' }}>
                  {ticketLevelAttachments.map(a => (
                    <a
                      key={a.id}
                      href={`/api/tickets/attachments/${a.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ticket-comment-image-link"
                      title={a.fileName}
                    >
                      <img
                        src={`/api/tickets/attachments/${a.id}`}
                        alt={a.fileName}
                        className="ticket-comment-image"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <div className="dash-panel">
            <div className="dash-card-section px-5 py-3">
              <h2 className="dash-section-title">Activity</h2>
            </div>
            <div className="px-5 py-4">
              <CommentThread comments={commentsWithAttachments} showInternal={false} />
            </div>
            {!closed ? (
              <div className="px-5 pb-5 pt-0" style={{ borderTop: '1px solid var(--border)' }}>
                <TicketCommentForm ticketId={ticket.id} variant="portal" />
              </div>
            ) : (
              <p className="px-5 pb-5 pt-3 dash-meta" style={{ borderTop: '1px solid var(--border)' }}>
                This ticket is resolved.
              </p>
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
              { label: 'Opened', value: formatDate(ticket.created_at) },
              { label: 'Updated', value: relativeTime(ticket.updated_at) },
              ...(ticket.resolved_at &&
              (ticket.status === 'resolved' || ticket.status === 'closed')
                ? [{ label: 'Resolved', value: formatDateTimeHuman(ticket.resolved_at) }]
                : []),
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
