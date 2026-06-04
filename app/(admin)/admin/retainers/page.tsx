import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { MetricStrip } from '@/components/dashboard/MetricStrip'
import { RetainersList } from '@/components/retainers/RetainersList'

export default async function AdminRetainersPage() {
  const supabase = await createClient()
  const { data: retainers, error } = await supabase
    .from('retainers')
    .select('*, clients(name)')
    .order('period_start', { ascending: false })

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader title="Retainers" description="Could not load retainer periods." />
        <div className="retainers-table dash-empty">
          <p className="dash-empty-title">Failed to load retainers</p>
          <p className="dash-empty-hint">{error.message}</p>
        </div>
      </div>
    )
  }

  const rows = (retainers ?? []).map(r => ({
    id: r.id,
    client_id: r.client_id,
    clientName: (r.clients as unknown as { name: string } | null)?.name ?? null,
    period_start: r.period_start,
    period_end: r.period_end,
    hours_total: Number(r.hours_total),
    hours_used: Number(r.hours_used),
  }))

  const totalSold = rows.reduce((s, r) => s + r.hours_total, 0)
  const totalUsed = rows.reduce((s, r) => s + r.hours_used, 0)
  const left = totalSold - totalUsed
  const atRisk = rows.filter(r => {
    const pct = r.hours_total > 0 ? (r.hours_used / r.hours_total) * 100 : 0
    return pct > 85 || r.hours_used > r.hours_total
  }).length

  const now = new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Retainers"
        description={`Hour pools across clients · ${now}`}
      />

      <MetricStrip
        items={[
          { label: 'Sold', value: `${totalSold.toFixed(0)}h`, hint: 'All periods' },
          { label: 'Used', value: `${totalUsed.toFixed(1)}h` },
          {
            label: 'Remaining',
            value: `${left.toFixed(1)}h`,
            accent: left < 5 ? '#f87171' : '#4ade80',
            emphasis: left < 5,
          },
          {
            label: 'Needs attention',
            value: String(atRisk),
            hint: '>85% or over',
            accent: atRisk > 0 ? '#fb923c' : undefined,
            emphasis: atRisk > 0,
          },
        ]}
      />

      <RetainersList retainers={rows} />
    </div>
  )
}
