import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StatusPill } from '@/components/ui/StatusPill'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { StatsRow } from '@/components/admin/StatsRow'
import { Plus, ArrowUpRight } from 'lucide-react'
import type { TicketStatus, TicketPriority } from '@/lib/types'

function ticketId(id: string) { return `TKT-${id.substring(0, 4).toUpperCase()}` }

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string }>
}) {
  const filters = await searchParams
  const supabase = await createClient()

  // Fetch all for stats
  const { data: allTickets } = await supabase
    .from('tickets')
    .select('id, status, priority, title, type, created_at, updated_at, clients(name)')
    .order('created_at', { ascending: false })

  const stats = {
    open:       allTickets?.filter(t => t.status === 'open').length ?? 0,
    inProgress: allTickets?.filter(t => t.status === 'in_progress').length ?? 0,
    critical:   allTickets?.filter(t => t.priority === 'critical').length ?? 0,
    resolved:   allTickets?.filter(t => t.status === 'resolved').length ?? 0,
  }

  // Apply filters
  let tickets = allTickets ?? []
  if (filters.status)   tickets = tickets.filter(t => t.status === filters.status)
  if (filters.priority) tickets = tickets.filter(t => t.priority === filters.priority)

  const filterCount = [filters.status, filters.priority].filter(Boolean).length

  const statusTabs = [
    { label: 'All',        value: '' },
    { label: 'Open',       value: 'open' },
    { label: 'In Progress',value: 'in_progress' },
    { label: 'Waiting',    value: 'waiting_on_client' },
    { label: 'Resolved',   value: 'resolved' },
  ]

  return (
    <div className="space-y-7">
      {/* Page title */}
      <div className="flex items-center justify-between anim-fade-up anim-fade-up-1">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ticket Queue</h1>
          <p className="text-sm text-gray-400 mt-0.5">{(allTickets?.length ?? 0)} total tickets across all clients</p>
        </div>
        <Link
          href="/admin/tickets/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: '#0f0f0f' }}
        >
          <Plus size={15} />
          New ticket
        </Link>
      </div>

      {/* Stats */}
      <StatsRow
        open={stats.open}
        inProgress={stats.inProgress}
        critical={stats.critical}
        resolved={stats.resolved}
      />

      {/* Filter tabs + table */}
      <div className="anim-fade-up anim-fade-up-5">
        {/* Status tab bar */}
        <div
          className="flex items-center gap-1 px-4 pt-3 pb-0"
          style={{ borderBottom: '1px solid #f0f0ee' }}
        >
          {statusTabs.map(({ label, value }) => {
            const active = (filters.status ?? '') === value
            return (
              <Link
                key={value}
                href={value ? `/admin/tickets?status=${value}` : '/admin/tickets'}
                className={`px-3 py-2 text-sm font-medium rounded-t-md transition-colors relative -mb-px ${
                  active
                    ? 'text-gray-900 bg-white border border-b-white'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                style={active ? { border: '1px solid #f0f0ee', borderBottom: '1px solid #fff' } : {}}
              >
                {label}
                {value === 'open' && stats.open > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-[10px] font-semibold">
                    {stats.open}
                  </span>
                )}
              </Link>
            )
          })}

          {/* Priority filter */}
          <form className="ml-auto pb-2" method="GET">
            {filters.status && <input type="hidden" name="status" value={filters.status} />}
            <select
              name="priority"
              defaultValue={filters.priority ?? ''}
              className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-500 bg-white focus:outline-none focus:ring-1 focus:ring-gray-300 cursor-pointer"
            >
              <option value="">All priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <button type="submit" className="ml-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
              Apply
            </button>
          </form>
        </div>

        {/* Table */}
        <div style={{ border: '1px solid #f0f0ee', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden', background: '#fff' }}>
          {tickets.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #f7f7f5', background: '#fafaf9' }}>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Subject</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Priority</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Updated</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {tickets.map((t, i) => (
                  <tr
                    key={t.id}
                    className="notion-row group"
                    style={{ borderBottom: i < tickets.length - 1 ? '1px solid #f7f7f5' : 'none' }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-1.5 h-8 rounded-full shrink-0"
                          style={{
                            background: t.priority === 'critical' ? '#dc2626'
                              : t.priority === 'high' ? '#ea580c'
                              : t.priority === 'normal' ? '#94a3b8'
                              : '#e2e8f0'
                          }}
                        />
                        <div>
                          <Link
                            href={`/admin/tickets/${t.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                          >
                            {t.title}
                          </Link>
                          <p className="text-xs text-gray-400 mt-0.5 font-mono">{ticketId(t.id)} · {t.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">
                      {(t.clients as unknown as { name: string } | null)?.name}
                    </td>
                    <td className="px-5 py-3.5">
                      <PriorityBadge priority={t.priority as TicketPriority} />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusPill status={t.status as TicketStatus} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400 tabular-nums">
                      {relativeTime(t.updated_at)}
                    </td>
                    <td className="px-3 py-3.5">
                      <Link
                        href={`/admin/tickets/${t.id}`}
                        className="row-actions p-1.5 rounded-md hover:bg-gray-100 text-gray-400 transition-colors inline-flex"
                        title="Open ticket"
                      >
                        <ArrowUpRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center">
              <p className="text-sm font-medium text-gray-500">No tickets found</p>
              <p className="text-xs text-gray-400 mt-1">
                {filterCount > 0 ? 'Try clearing the filters' : 'Create your first ticket'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
