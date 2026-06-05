import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { MetricStrip } from '@/components/dashboard/MetricStrip'
import { UsageBar } from '@/components/dashboard/UsageBar'
import { StatusFlag } from '@/components/dashboard/StatusFlag'
import { PackageChip } from '@/components/retainers/PackageChip'
import { getRetainerForClient } from '@/lib/retainers/active'
import { getClientRetainerStatus } from '@/lib/retainers/guards'
import {
  RETAINER_STATUS_LABELS,
  canUseRetainerHours,
  retainerStatusMessage,
} from '@/lib/retainers/status'

export default async function RetainerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('users').select('client_id').eq('id', user.id).single()
  if (!profile?.client_id) redirect('/auth/login')

  const [retainer, retainerStatus] = await Promise.all([
    getRetainerForClient(supabase, profile.client_id, { includePackage: true }),
    getClientRetainerStatus(supabase, profile.client_id),
  ])

  const lifecycleBlocked = !canUseRetainerHours(retainerStatus)

  const hoursUsed = retainer ? Number(retainer.hours_used) : 0
  const hoursTotal = retainer ? Number(retainer.hours_total) : 0
  const hoursLeft = hoursTotal - hoursUsed
  const pct = hoursTotal > 0 ? Math.min(100, (hoursUsed / hoursTotal) * 100) : 0
  const isOver = hoursLeft < 0
  const isDanger = pct > 85
  const tone = isOver ? 'over' : isDanger ? 'warn' : 'ok'

  return (
    <div className="space-y-6 w-full max-w-4xl">
      <PageHeader
        title="My Plan"
        description={
          retainer
            ? `Current period · ${new Date(retainer.period_start).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} – ${new Date(retainer.period_end).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}`
            : 'Your support plan and included hours'
        }
      />

      {lifecycleBlocked ? (
        <div className="retainer-lifecycle-banner" data-tone="blocked">
          <p className="retainer-lifecycle-banner-title">
            {RETAINER_STATUS_LABELS[retainerStatus]}
          </p>
          <p className="dash-meta leading-relaxed mt-2">{retainerStatusMessage(retainerStatus)}</p>
        </div>
      ) : null}

      {retainer ? (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <PackageChip packageName={retainer.package_name} />
          </div>

          <MetricStrip
            foldLabel="Hours"
            items={[
              { label: 'Used', value: `${hoursUsed.toFixed(1)}h` },
              {
                label: 'Remaining',
                value: `${isOver ? '−' : ''}${Math.abs(hoursLeft).toFixed(1)}h`,
                accent: isOver ? '#f87171' : isDanger ? '#fb923c' : '#4ade80',
                emphasis: isDanger || isOver,
              },
              { label: 'Total', value: `${hoursTotal.toFixed(0)}h` },
            ]}
          />

          <section className="retainer-panel anim-fade-up anim-fade-up-3" data-alert={isDanger ? 'true' : undefined}>
            <div className="retainer-panel-head">
              <div>
                <p className="retainer-panel-title">Usage this period</p>
                {isDanger ? (
                  <StatusFlag
                    label={isOver ? 'Over capacity' : 'Running low'}
                    tone={isOver ? 'danger' : 'warn'}
                  />
                ) : null}
              </div>
              <span className="retainer-panel-period tabular-nums">{Math.round(pct)}% used</span>
            </div>

            <UsageBar percent={pct} tone={tone} height={10} />

            <p className="dash-meta leading-relaxed mt-4">
              {isOver
                ? 'You have used all included hours for this period — your team will be in touch.'
                : isDanger
                  ? 'Running low on hours — consider planning ahead for new work.'
                  : 'Plenty of hours remaining in this period.'}
            </p>
          </section>
        </div>
      ) : (
        <div className="retainer-panel dash-empty">
          <p className="dash-empty-title">No active plan</p>
          <p className="dash-empty-hint">Contact your account manager if you expect plan hours.</p>
        </div>
      )}
    </div>
  )
}
