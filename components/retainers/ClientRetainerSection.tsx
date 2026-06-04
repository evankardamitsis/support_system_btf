import { createClient } from '@/lib/supabase/server'
import { getRetainerForClient } from '@/lib/retainers/active'
import { formatPeriodCost } from '@/lib/retainers/packages'
import { UsageBar } from '@/components/dashboard/UsageBar'
import { StatusFlag } from '@/components/dashboard/StatusFlag'
import { FormPanel } from '@/components/dashboard/FormPanel'
import { PackageChip } from '@/components/retainers/PackageChip'
import { RetainerPeriodForm } from '@/components/retainers/RetainerPeriodForm'

export async function ClientRetainerSection({ clientId }: { clientId: string }) {
  const supabase = await createClient()
  const { data: client } = await supabase
    .from('clients')
    .select('billing_cycle_day')
    .eq('id', clientId)
    .single()

  const r = await getRetainerForClient(supabase, clientId, {
    includeCost: true,
    includePackage: true,
  })

  const hoursUsed = r ? Number(r.hours_used) : 0
  const hoursTotal = r ? Number(r.hours_total) : 0
  const hoursRemaining = hoursTotal - hoursUsed
  const pct = hoursTotal > 0 ? Math.min(100, (hoursUsed / hoursTotal) * 100) : 0
  const isOver = hoursRemaining < 0
  const isDanger = pct > 85
  const tone = isOver ? 'over' : isDanger ? 'warn' : 'ok'
  const billingDay = client?.billing_cycle_day ?? 1

  return (
    <div className="space-y-5 anim-fade-up anim-fade-up-4">
      {r ? (
        <section className="retainer-panel" data-alert={isDanger ? 'true' : undefined}>
          <div className="retainer-panel-head">
            <div className="flex flex-wrap items-center gap-2">
              <p className="retainer-panel-title">Active retainer</p>
              <PackageChip packageName={r.package_name} />
              {isDanger ? (
                <StatusFlag
                  label={isOver ? 'Over capacity' : `${Math.round(pct)}% consumed`}
                  tone={isOver ? 'danger' : 'warn'}
                />
              ) : null}
            </div>
            <p className="retainer-panel-period tabular-nums">
              {new Date(r.period_start).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })}
              {' – '}
              {new Date(r.period_end).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className="retainer-panel-stats">
            <div className="retainer-stat-block">
              <p className="retainer-stat-label">Used</p>
              <p className="retainer-stat-value">{hoursUsed.toFixed(1)}h</p>
            </div>
            <div className="retainer-stat-block">
              <p className="retainer-stat-label">Remaining</p>
              <p className="retainer-stat-value" data-tone={tone}>
                {isOver ? '−' : ''}
                {Math.abs(hoursRemaining).toFixed(1)}h
              </p>
            </div>
            <div className="retainer-stat-block">
              <p className="retainer-stat-label">Monthly hours</p>
              <p className="retainer-stat-value">{hoursTotal.toFixed(0)}h</p>
            </div>
            {r.period_cost != null ? (
              <div className="retainer-stat-block retainer-stat-block--internal">
                <p className="retainer-stat-label">Period cost</p>
                <p className="retainer-stat-value">{formatPeriodCost(Number(r.period_cost))}</p>
                <p className="dash-meta">BTF internal</p>
              </div>
            ) : null}
          </div>

          <div>
            <div className="retainer-usage-head">
              <span>Hours consumed</span>
              <span className="tabular-nums" style={{ color: isDanger ? '#fb923c' : 'var(--text-2)' }}>
                {Math.round(pct)}%
              </span>
            </div>
            <UsageBar percent={pct} tone={tone} height={8} />
          </div>
        </section>
      ) : (
        <div className="retainer-panel dash-empty">
          <p className="dash-empty-title">No retainer period</p>
          <p className="dash-empty-hint">Start a Care or Grow package below.</p>
        </div>
      )}

      <FormPanel title={r ? 'New billing period' : 'Set up retainer'}>
        <RetainerPeriodForm
          clientId={clientId}
          billingCycleDay={billingDay}
          submitLabel={r ? 'Start new period' : 'Create retainer'}
          showCustomDates
        />
      </FormPanel>
    </div>
  )
}
