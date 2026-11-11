import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { DashButton } from '@/components/dashboard/DashButton'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { MetricStrip } from '@/components/dashboard/MetricStrip'
import { RetainersList, type RetainerListItem } from '@/components/retainers/RetainersList'
import { Plus } from 'lucide-react'
import { isActivePeriod } from '@/lib/retainers/packages'
import { retainerTracksHours } from '@/lib/retainers/billing-model'
import type { RetainerLifecycleStatus } from '@/lib/retainers/status'

export default async function AdminRetainersPage() {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) redirect('/admin/tickets')

  const supabase = await createClient()
  const { data: retainers, error } = await supabase
    .from('retainers')
    .select('*, clients(name, retainer_status)')
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

  const rows: RetainerListItem[] = (retainers ?? []).map(r => {
    const client = r.clients as unknown as {
      name: string
      retainer_status: string | null
    } | null
    return {
      id: r.id,
      client_id: r.client_id,
      clientName: client?.name ?? null,
      package_name: (r as { package_name?: string }).package_name ?? 'care',
      period_start: r.period_start,
      period_end: r.period_end,
      hours_total: Number(r.hours_total),
      hours_used: Number(r.hours_used),
      period_cost: Number((r as { period_cost?: number }).period_cost ?? 0),
      isActive: isActivePeriod(r.period_start, r.period_end),
      status: (client?.retainer_status ?? 'active') as RetainerLifecycleStatus,
    }
  })

  // One row per client: the period covering today, else the most recent one.
  // Rows arrive sorted by period_start desc, so the first match is the latest.
  const byClient = new Map<string, RetainerListItem>()
  for (const r of rows) {
    const current = byClient.get(r.client_id)
    if (!current || (!current.isActive && r.isActive)) byClient.set(r.client_id, r)
  }
  const clientRows = [...byClient.values()]
  const listedRows = clientRows.filter(r => r.status !== 'canceled')
  const canceledRows = clientRows.filter(r => r.status === 'canceled')

  // Totals: current-period values for non-canceled clients only.
  const activeRows = listedRows.filter(r => r.isActive)
  const hourBasedActive = activeRows.filter(r => retainerTracksHours(r))
  const totalSold = hourBasedActive.reduce((s, r) => s + r.hours_total, 0)
  const totalUsed = hourBasedActive.reduce((s, r) => s + r.hours_used, 0)
  const left = totalSold - totalUsed
  const contractValue = activeRows.reduce((s, r) => s + r.period_cost, 0)
  const careCount = activeRows.filter(r => r.package_name === 'care').length
  const growCount = activeRows.filter(r => r.package_name === 'grow').length
  const fixedCount = activeRows.filter(r => r.package_name === 'fixed').length
  const atRisk = hourBasedActive.filter(r => {
    const pct = r.hours_total > 0 ? (r.hours_used / r.hours_total) * 100 : 0
    return pct > 85 || r.hours_used > r.hours_total
  }).length

  const now = new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Retainers"
        description={`Care, Grow & Fixed packages per client · ${now}`}
        action={
          <DashButton href="/admin/retainers/new">
            <Plus size={14} />
            New retainer
          </DashButton>
        }
      />

      <MetricStrip
        foldLabel="Retainers"
        items={[
          {
            label: 'Active contract',
            value: new Intl.NumberFormat('en-GB', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            }).format(contractValue),
            hint: 'This month',
          },
          { label: 'Care', value: String(careCount), hint: 'Active periods' },
          { label: 'Grow', value: String(growCount), hint: 'Active periods' },
          { label: 'Fixed', value: String(fixedCount), hint: 'Active periods' },
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

      <RetainersList retainers={listedRows} canceled={canceledRows} />
    </div>
  )
}
