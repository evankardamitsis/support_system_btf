import { formatDateRange } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'
import { getRetainerForClient } from '@/lib/retainers/active'
import { formatPeriodCost } from '@/lib/retainers/packages'
import { UsageBar } from '@/components/dashboard/UsageBar'
import { StatusFlag } from '@/components/dashboard/StatusFlag'
import { FormPanel } from '@/components/dashboard/FormPanel'
import { PackageChip } from '@/components/retainers/PackageChip'
import { RetainerPeriodForm } from '@/components/retainers/RetainerPeriodForm'
import { RetainerRenewBanner } from '@/components/retainers/RetainerRenewBanner'
import { RetainerStatusControls } from '@/components/retainers/RetainerStatusControls'
import type { RetainerLifecycleStatus } from '@/lib/retainers/status'
import { retainerTracksHours } from '@/lib/retainers/billing-model'

export async function ClientRetainerSection({
  clientId,
  canManageLifecycle = false,
}: {
  clientId: string
  canManageLifecycle?: boolean
}) {
  const supabase = await createClient()
  const { data: client } = await supabase
    .from('clients')
    .select('billing_cycle_day, retainer_status')
    .eq('id', clientId)
    .single()

  const retainerStatus = (client?.retainer_status ?? 'active') as RetainerLifecycleStatus
  const lifecycleBlocked = retainerStatus !== 'active'

  const [{ count: periodCount }, r] = await Promise.all([
    supabase
      .from('retainers')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId),
    getRetainerForClient(supabase, clientId, {
      includeCost: true,
      includePackage: true,
    }),
  ])

  const hasRetainerPeriods = (periodCount ?? 0) > 0

  const hoursBilling = retainerTracksHours(r)
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
      <RetainerStatusControls
        clientId={clientId}
        status={retainerStatus}
        canManage={canManageLifecycle}
        hasRetainerPeriods={hasRetainerPeriods}
      />

      {r ? (
        <>
          <RetainerRenewBanner
            clientId={clientId}
            periodEnd={r.period_end}
            canManage={canManageLifecycle}
          />
          <section className="retainer-panel" data-alert={isDanger ? 'true' : undefined}>
          <div className="retainer-panel-head">
            <div className="flex flex-wrap items-center gap-2">
              <p className="retainer-panel-title">Active retainer</p>
              <PackageChip packageName={r.package_name} />
              {hoursBilling && isDanger ? (
                <StatusFlag
                  label={isOver ? 'Over capacity' : `${Math.round(pct)}% consumed`}
                  tone={isOver ? 'danger' : 'warn'}
                />
              ) : null}
            </div>
            <p className="retainer-panel-period tabular-nums">
              {formatDateRange(r.period_start, r.period_end)}
            </p>
          </div>

          {hoursBilling ? (
            <>
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
                  <span
                    className="tabular-nums"
                    style={{ color: isDanger ? '#fb923c' : 'var(--text-2)' }}
                  >
                    {Math.round(pct)}%
                  </span>
                </div>
                <UsageBar percent={pct} tone={tone} height={8} />
              </div>
            </>
          ) : (
            <div className="retainer-panel-stats">
              <div className="retainer-stat-block">
                <p className="retainer-stat-label">Plan type</p>
                <p className="retainer-stat-value">Fixed monthly</p>
              </div>
              {r.period_cost != null ? (
                <div className="retainer-stat-block retainer-stat-block--internal">
                  <p className="retainer-stat-label">Period cost</p>
                  <p className="retainer-stat-value">{formatPeriodCost(Number(r.period_cost))}</p>
                  <p className="dash-meta">BTF internal</p>
                </div>
              ) : null}
              <p className="dash-meta col-span-full leading-relaxed">
                No hour limits — tickets resolve without time tracking.
              </p>
            </div>
          )}
        </section>
        </>
      ) : (
        <div className="retainer-panel dash-empty">
          <p className="dash-empty-title">No retainer period</p>
          <p className="dash-empty-hint">Start a Care, Grow, or Fixed package below.</p>
        </div>
      )}

      <FormPanel title={r ? 'New billing period' : 'Set up retainer'}>
        {lifecycleBlocked ? (
          <p className="dash-meta leading-relaxed">
            {retainerStatus === 'frozen'
              ? 'Unfreeze the retainer to start a new billing period manually.'
              : 'Resume the retainer to start a new billing period manually.'}
          </p>
        ) : (
          <RetainerPeriodForm
            clientId={clientId}
            billingCycleDay={billingDay}
            submitLabel={r ? 'Start new period' : 'Create retainer'}
            showCustomDates
          />
        )}
      </FormPanel>
    </div>
  )
}
