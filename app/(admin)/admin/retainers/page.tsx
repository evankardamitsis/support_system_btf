import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AlertTriangle } from 'lucide-react'

export default async function AdminRetainersPage() {
  const supabase = await createClient()
  const { data: retainers } = await supabase
    .from('retainers')
    .select('*, clients(name)')
    .order('period_start', { ascending: false })

  const totalHoursSold = retainers?.reduce((s, r) => s + Number(r.hours_total), 0) ?? 0
  const totalHoursUsed = retainers?.reduce((s, r) => s + Number(r.hours_used),  0) ?? 0

  const now = new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Retainers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{now}</p>
        </div>
        {/* Summary stats */}
        <div className="hidden md:flex items-center gap-6 text-right">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Hours sold</p>
            <p className="text-xl font-semibold text-gray-900 tabular-nums mt-0.5">{totalHoursSold.toFixed(0)}h</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Hours used</p>
            <p className="text-xl font-semibold text-gray-900 tabular-nums mt-0.5">{totalHoursUsed.toFixed(1)}h</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Remaining</p>
            <p className="text-xl font-semibold tabular-nums mt-0.5" style={{ color: (totalHoursSold - totalHoursUsed) < 5 ? '#dc2626' : '#16a34a' }}>
              {(totalHoursSold - totalHoursUsed).toFixed(1)}h
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {retainers && retainers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Client', 'Period', 'Total', 'Used', 'Left', 'Usage', 'Renews'].map(h => (
                    <th key={h} className={`px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide ${h === 'Client' || h === 'Period' ? 'text-left' : 'text-right'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {retainers.map((r) => {
                  const used      = Number(r.hours_used)
                  const total     = Number(r.hours_total)
                  const remaining = total - used
                  const pct       = total > 0 ? Math.min(100, (used / total) * 100) : 0
                  const isOver    = remaining < 0
                  const isDanger  = pct > 85

                  return (
                    <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${isDanger ? 'bg-red-50/30' : ''}`}>
                      <td className="px-5 py-4">
                        <Link href={`/admin/clients/${r.client_id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors flex items-center gap-1.5">
                          {isDanger && <AlertTriangle size={13} className="text-red-500 shrink-0" />}
                          {(r.clients as unknown as { name: string } | null)?.name}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-400 tabular-nums">
                        {new Date(r.period_start).toLocaleDateString('en-GB')} - {new Date(r.period_end).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-5 py-4 text-sm tabular-nums text-right text-gray-600">{total.toFixed(0)}h</td>
                      <td className="px-5 py-4 text-sm tabular-nums text-right text-gray-600">{used.toFixed(1)}h</td>
                      <td className={`px-5 py-4 text-sm font-semibold tabular-nums text-right ${isOver ? 'text-red-600' : isDanger ? 'text-orange-600' : 'text-green-600'}`}>
                        {isOver ? '-' : ''}{Math.abs(remaining).toFixed(1)}h
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : isDanger ? 'bg-orange-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 tabular-nums w-8 text-right">{Math.round(Math.min(100, pct))}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm tabular-nums text-right text-gray-400">
                        {r.period_end ? new Date(r.period_end).toLocaleDateString('en-GB') : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-sm font-medium text-gray-900">No retainers yet</p>
            <p className="text-sm text-gray-400 mt-1">Retainers are created when you add a client</p>
          </div>
        )}
      </div>
    </div>
  )
}
