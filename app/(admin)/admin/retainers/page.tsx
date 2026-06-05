import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { MetricStrip } from '@/components/dashboard/MetricStrip'
import { RetainersList } from '@/components/retainers/RetainersList'
import { isActivePeriod } from '@/lib/retainers/packages'

export default async function AdminRetainersPage() {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) redirect('/admin/tickets')

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
    package_name: (r as { package_name?: string }).package_name ?? 'care',
    period_start: r.period_start,
    period_end: r.period_end,
    hours_total: Number(r.hours_total),
    hours_used: Number(r.hours_used),
    period_cost: Number((r as { period_cost?: number }).period_cost ?? 0),
    isActive: isActivePeriod(r.period_start, r.period_end),
  }))

  const activeRows = rows.filter(r => r.isActive)
  const totalSold = activeRows.reduce((s, r) => s + r.hours_total, 0)
  const totalUsed = activeRows.reduce((s, r) => s + r.hours_used, 0)
  const left = totalSold - totalUsed
  const contractValue = activeRows.reduce((s, r) => s + r.period_cost, 0)
  const careCount = activeRows.filter(r => r.package_name === 'care').length
  const growCount = activeRows.filter(r => r.package_name === 'grow').length
  const atRisk = activeRows.filter(r => {
    const pct = r.hours_total > 0 ? (r.hours_used / r.hours_total) * 100 : 0
    return pct > 85 || r.hours_used > r.hours_total
  }).length

  const now = new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Retainers"
        description={`Care & Grow packages per client · ${now}`}
      />

      <MetricStrip
        items={[
          {
            label: 'Active contract',
            value: new Intl.NumberFormat('en-GB', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            }).format(contractValue),
            hint: 'BTF internal',
          },
          { label: 'Care', value: String(careCount), hint: 'Active periods' },
          { label: 'Grow', value: String(growCount), hint: 'Active periods' },
          { label: 'Sold', value: `${totalSold.toFixed(0)}h`, hint: 'Active periods' },
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
