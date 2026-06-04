import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { MetricStrip } from '@/components/dashboard/MetricStrip'
import { UsageBar } from '@/components/dashboard/UsageBar'
import { StatusFlag } from '@/components/dashboard/StatusFlag'

export default async function RetainerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('users').select('client_id').eq('id', user.id).single()

  const { data: retainer } = await supabase
    .from('retainers')
    .select('*')
    .eq('client_id', profile!.client_id!)
    .order('period_start', { ascending: false })
    .limit(1)
    .single()

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
        title="Retainer"
        description={
          retainer
            ? `Current period · ${new Date(retainer.period_start).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} – ${new Date(retainer.period_end).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}`
            : 'Your billing period'
        }
      />

      {retainer ? (
        <div className="space-y-5">
          <MetricStrip
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
                ? 'You have exceeded your retainer — your team will be in touch.'
                : isDanger
                  ? 'Running low on hours — consider planning ahead for new work.'
                  : 'Plenty of hours remaining in this period.'}
            </p>
          </section>
        </div>
      ) : (
        <div className="retainer-panel dash-empty">
          <p className="dash-empty-title">No active retainer</p>
          <p className="dash-empty-hint">Contact your account manager if you expect retainer hours.</p>
        </div>
      )}
    </div>
  )
}
