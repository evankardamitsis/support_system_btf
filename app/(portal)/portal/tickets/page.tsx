import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StatusPill } from '@/components/ui/StatusPill'
import { Plus } from 'lucide-react'
import type { TicketStatus } from '@/lib/types'

function ticketId(id: string) { return `TKT-${id.substring(0, 4).toUpperCase()}` }

const priorityColors: Record<string, string> = {
  critical: 'text-red-600 font-semibold',
  high: 'text-orange-600 font-medium',
  normal: 'text-gray-600',
  low: 'text-gray-400',
}

export default async function PortalTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const filters = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users').select('client_id').eq('id', user!.id).single()

  let query = supabase
    .from('tickets')
    .select('id, title, status, priority, type, created_at, updated_at')
    .eq('client_id', profile!.client_id!)
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status as TicketStatus)

  const { data: tickets } = await query

  const filterTabs = [
    { label: 'All',         value: '' },
    { label: 'Open',        value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Resolved',    value: 'resolved' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Tickets</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {tickets?.length ?? 0} {tickets?.length === 1 ? 'ticket' : 'tickets'}
          </p>
        </div>
        <Link
          href="/portal/tickets/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
        >
          <Plus size={16} />
          New ticket
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {filterTabs.map(({ label, value }) => {
          const active = (filters.status ?? '') === value
          return (
            <Link
              key={value}
              href={value ? `/portal/tickets?status=${value}` : '/portal/tickets'}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                active
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {tickets && tickets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Subject</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Opened</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/portal/tickets/${t.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                        {t.title}
                      </Link>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{ticketId(t.id)}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500 capitalize">{t.type}</td>
                    <td className="px-5 py-4">
                      <span className={`text-sm ${priorityColors[t.priority] ?? 'text-gray-600'} capitalize`}>{t.priority}</span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill status={t.status as TicketStatus} />
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-400 tabular-nums">
                      {new Date(t.created_at).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-sm font-medium text-gray-900">
              {(filters.status) ? 'No tickets match this filter' : 'No tickets yet'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {(filters.status) ? 'Try a different status' : 'Submit a request and we will get on it'}
            </p>
            {!(filters.status) && (
              <Link href="/portal/tickets/new" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
                <Plus size={15} />New ticket
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
