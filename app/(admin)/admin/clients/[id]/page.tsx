import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StatusPill } from '@/components/ui/StatusPill'
import { GenerateInviteSection } from './GenerateInviteSection'
import { ArrowLeft, Clock, Shield, User, CalendarDays, AlertTriangle, ArrowUpRight } from 'lucide-react'
import type { TicketStatus } from '@/lib/types'

function ticketId(id: string) { return `TKT-${id.substring(0, 4).toUpperCase()}` }

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients').select('*').eq('id', id).single()
  if (!client) notFound()

  const [{ data: retainers }, { data: tickets }] = await Promise.all([
    supabase.from('retainers').select('*').eq('client_id', id).order('period_start', { ascending: false }),
    supabase.from('tickets').select('id, title, status, priority, created_at')
      .eq('client_id', id).order('created_at', { ascending: false }).limit(20),
  ])

  const r = retainers?.[0]
  const hoursUsed      = r ? Number(r.hours_used)  : 0
  const hoursTotal     = r ? Number(r.hours_total) : 0
  const hoursRemaining = hoursTotal - hoursUsed
  const pct            = hoursTotal > 0 ? Math.min(100, (hoursUsed / hoursTotal) * 100) : 0
  const isOver         = hoursRemaining < 0
  const isDanger       = pct > 85

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Back */}
      <Link href="/admin/clients" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
        <ArrowLeft size={15} />
        Back to clients
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center text-lg font-bold text-white shrink-0">
            {client.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {client.contact_name && <>{client.contact_name} · </>}{client.email}
            </p>
          </div>
        </div>
        <GenerateInviteSection clientId={id} />
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Plan',    value: client.plan_name ?? '—',                                             icon: <Shield size={14} /> },
          { label: 'SLA',     value: `${client.sla_response_hours}h response`,                            icon: <Clock size={14} /> },
          { label: 'Contact', value: client.contact_name ?? '—',                                          icon: <User size={14} /> },
          { label: 'Renewal', value: client.renewal_date ? new Date(client.renewal_date).toLocaleDateString('en-GB') : '—', icon: <CalendarDays size={14} /> },
        ].map(({ label, value, icon }) => (
          <div
            key={label}
            className="bg-white rounded-xl p-4 anim-fade-up"
            style={{ border: '1px solid #f0f0ee', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <div className="flex items-center gap-1.5 text-gray-400 mb-2">
              {icon}
              <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Retainer */}
      {r ? (
        <div
          className="bg-white rounded-xl p-6"
          style={{ border: isDanger ? '1px solid #fecaca' : '1px solid #f0f0ee', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                {isDanger && <AlertTriangle size={14} className="text-red-500" />}
                Active Retainer
              </h2>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">
                {new Date(r.period_start).toLocaleDateString('en-GB')} - {new Date(r.period_end).toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>

          {/* Hours stats */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              { label: 'Used', value: `${hoursUsed.toFixed(1)}h`, color: 'text-gray-900' },
              { label: 'Remaining', value: `${isOver ? '-' : ''}${Math.abs(hoursRemaining).toFixed(1)}h`, color: isOver ? 'text-red-600' : isDanger ? 'text-orange-600' : 'text-green-600' },
              { label: 'Total', value: `${hoursTotal.toFixed(0)}h`, color: 'text-gray-900' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Hours consumed</span>
              <span className={isDanger ? 'text-red-600 font-semibold' : ''}>{Math.round(pct)}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, pct)}%`,
                  background: isOver ? '#dc2626' : isDanger ? '#ea580c' : '#16a34a',
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          className="bg-white rounded-xl p-8 text-center"
          style={{ border: '1px solid #f0f0ee' }}
        >
          <p className="text-sm text-gray-400">No retainer period found for this client.</p>
        </div>
      )}

      {/* Ticket history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Ticket History</h2>
          <Link
            href={`/admin/tickets/new?client=${id}`}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
          >
            New ticket <ArrowUpRight size={12} />
          </Link>
        </div>

        <div
          className="bg-white rounded-xl overflow-hidden"
          style={{ border: '1px solid #f0f0ee', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          {tickets && tickets.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #f7f7f5', background: '#fafaf9' }}>
                  {['Subject', 'Priority', 'Status', 'Date'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickets.map((t, i) => (
                  <tr
                    key={t.id}
                    className="notion-row"
                    style={{ borderBottom: i < tickets.length - 1 ? '1px solid #f7f7f5' : 'none' }}
                  >
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/tickets/${t.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                        {t.title}
                      </Link>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{ticketId(t.id)}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm capitalize text-gray-500">{t.priority}</td>
                    <td className="px-5 py-3.5">
                      <StatusPill status={t.status as TicketStatus} />
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-400 tabular-nums">
                      {new Date(t.created_at).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-400">No tickets yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
