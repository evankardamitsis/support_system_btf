import Link from 'next/link'
import { ArrowUpRight, Cable, CircleAlert } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { PERFORMANCE_PROVIDER_CATALOG } from '@/lib/performance/catalog'
import {
  formatPerformanceCurrency,
  formatPerformanceNumber,
  formatPerformancePercent,
  formatPerformanceRatio,
  formatSyncTime,
  metricDelta,
} from '@/lib/performance/display'
import type { PerformanceDashboardData, PerformanceSummary } from '@/lib/performance/types'
import { PerformanceAccountPicker, PerformanceSyncControl } from './PerformanceControls'
import { PerformanceChart } from './PerformanceChart'
import { PerformanceLiveRefresh } from './PerformanceLiveRefresh'

function Delta({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value === null) return <span className="performance-delta is-neutral">First signal</span>
  const positive = inverse ? value <= 0 : value >= 0
  return (
    <span className={`performance-delta ${positive ? 'is-positive' : 'is-negative'}`}>
      {value >= 0 ? '+' : ''}{value.toFixed(1)}% <em>vs prev.</em>
    </span>
  )
}

function MetricCard({
  label,
  value,
  delta,
  signal,
  inverse,
}: {
  label: string
  value: string
  delta: number | null
  signal?: 'lime' | 'cyan' | 'amber' | 'coral'
  inverse?: boolean
}) {
  return (
    <article className={`performance-metric ${signal ? `is-${signal}` : ''}`}>
      <span className="performance-metric-label">{label}</span>
      <strong>{value}</strong>
      <Delta value={delta} inverse={inverse} />
    </article>
  )
}

function providerSummary(data: PerformanceDashboardData, provider: string) {
  const rows = data.daily.filter(row => row.provider === provider)
  return rows.reduce(
    (summary, row) => ({
      revenue: summary.revenue + row.revenue,
      spend: summary.spend + row.spend,
      orders: summary.orders + row.orders,
      conversions: summary.conversions + row.conversions,
      impressions: summary.impressions + row.impressions,
      clicks: summary.clicks + row.clicks,
    }),
    { revenue: 0, spend: 0, orders: 0, conversions: 0, impressions: 0, clicks: 0 }
  )
}

function Funnel({ summary }: { summary: PerformanceSummary }) {
  const steps = [
    { label: 'Impressions', value: summary.impressions, width: 100 },
    { label: 'Clicks', value: summary.clicks, width: 76 },
    { label: 'Ad conversions', value: summary.conversions, width: 52 },
    { label: 'Store orders', value: summary.orders, width: 34 },
  ]
  return (
    <div className="performance-funnel">
      {steps.map((step, index) => (
        <div className="performance-funnel-step" key={step.label} style={{ '--funnel-width': `${step.width}%` } as React.CSSProperties}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <div>
            <em>{step.label}</em>
            <strong>{formatPerformanceNumber(step.value)}</strong>
          </div>
        </div>
      ))}
    </div>
  )
}

export function PerformanceDashboard({ data }: { data: PerformanceDashboardData }) {
  if (!data.account) {
    return (
      <div className="performance-layout">
        <PageHeader
          title="Performance Retainers"
          description="One live operating view across commerce, paid media, and lifecycle marketing."
        />
        <div className="performance-empty-account">
          <Cable size={26} aria-hidden />
          <h2>Create the first performance workspace</h2>
          <p>Start with Sasha Elage, then connect Shopify, Meta, Google Ads, and Klaviyo.</p>
          <Link href="/admin/performance/integrations" className="performance-primary-link">
            Set up integrations <ArrowUpRight size={14} aria-hidden />
          </Link>
        </div>
      </div>
    )
  }

  const { account, summary, previousSummary } = data
  const connectedCount = data.connections.filter(connection => connection.status === 'connected').length
  const errorCount = data.connections.filter(connection => connection.status === 'error').length

  return (
    <div className="performance-layout">
      {!data.isPreview ? <PerformanceLiveRefresh accountId={account.id} /> : null}
      <div className="performance-heading-row">
        <PageHeader
          title="Performance Retainers"
          description="Commerce, acquisition, and lifecycle signals in one live operating view."
        />
        <div className="performance-heading-actions">
          <PerformanceAccountPicker
            accounts={data.accounts.map(item => ({ id: item.id, displayName: item.displayName }))}
            value={account.id}
          />
          <PerformanceSyncControl
            accountId={account.id}
            sources={data.connections.map(connection => PERFORMANCE_PROVIDER_CATALOG.find(provider => provider.id === connection.provider)?.name || connection.provider)}
          />
        </div>
      </div>

      <section className="performance-command-bar" aria-label="Dashboard status">
        <div>
          <span className="performance-live-dot" aria-hidden />
          <strong>{data.isPreview ? 'Preview' : 'Live'}</strong>
          <span>{account.displayName}</span>
        </div>
        <div className="performance-command-meta">
          <span>{connectedCount}/4 sources {data.isPreview ? 'simulated' : 'online'}</span>
          <span>{data.isPreview ? 'Sample signal' : `Updated ${formatSyncTime(data.lastSyncedAt)}`}</span>
          {errorCount ? <span className="is-error"><CircleAlert size={12} /> {errorCount} needs attention</span> : null}
        </div>
      </section>

      <div className="performance-range-tabs" aria-label="Reporting range">
        {[7, 14, 30, 90].map(days => (
          <Link
            key={days}
            href={`/admin/performance?account=${account.id}&range=${days}${data.isPreview ? '&preview=1' : ''}`}
            className={data.rangeDays === days ? 'is-active' : ''}
          >
            {days}D
          </Link>
        ))}
      </div>

      <section className="performance-metric-grid" aria-label="Performance summary">
        <MetricCard
          label="Net revenue"
          value={formatPerformanceCurrency(summary.revenue, account.currency, true)}
          delta={metricDelta(summary.revenue, previousSummary.revenue)}
          signal="lime"
        />
        <MetricCard
          label="Ad spend"
          value={formatPerformanceCurrency(summary.spend, account.currency, true)}
          delta={metricDelta(summary.spend, previousSummary.spend)}
          signal="cyan"
          inverse
        />
        <MetricCard
          label="Blended ROAS"
          value={formatPerformanceRatio(summary.roas)}
          delta={metricDelta(summary.roas || 0, previousSummary.roas || 0)}
          signal="amber"
        />
        <MetricCard
          label="Orders"
          value={formatPerformanceNumber(summary.orders)}
          delta={metricDelta(summary.orders, previousSummary.orders)}
        />
        <MetricCard
          label="Cost / conversion"
          value={summary.cpa === null ? '—' : formatPerformanceCurrency(summary.cpa, account.currency)}
          delta={metricDelta(summary.cpa || 0, previousSummary.cpa || 0)}
          signal="coral"
          inverse
        />
      </section>

      <section className="performance-main-grid">
        <article className="performance-panel performance-trend-panel">
          <header className="performance-panel-head">
            <div>
              <span className="performance-eyebrow">Momentum</span>
              <h2>Revenue against media pressure</h2>
            </div>
            <span className="performance-panel-kpi">{formatPerformanceRatio(summary.roas)} ROAS</span>
          </header>
          <PerformanceChart rows={data.daily} currency={account.currency} />
        </article>

        <article className="performance-panel performance-funnel-panel">
          <header className="performance-panel-head">
            <div>
              <span className="performance-eyebrow">Acquisition path</span>
              <h2>Signal to sale</h2>
            </div>
            <span className="performance-panel-kpi">{formatPerformancePercent(summary.conversionRate)}</span>
          </header>
          <Funnel summary={summary} />
        </article>
      </section>

      <section className="performance-channel-section">
        <div className="performance-section-head">
          <div>
            <span className="performance-eyebrow">Source health</span>
            <h2>Channel pulse</h2>
          </div>
          <Link href={`/admin/performance/integrations?account=${account.id}`}>Manage connections →</Link>
        </div>
        <div className="performance-channel-grid">
          {PERFORMANCE_PROVIDER_CATALOG.map(provider => {
            const connection = data.connections.find(item => item.provider === provider.id)
            const metrics = providerSummary(data, provider.id)
            const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : null
            return (
              <article className="performance-channel-card" key={provider.id} style={{ '--provider-accent': provider.accent } as React.CSSProperties}>
                <header>
                  <div className="performance-provider-mark">{provider.shortName.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <h3>{provider.name}</h3>
                    <span className={`performance-connection-state is-${connection?.status || 'disconnected'}`}>
                      {connection?.status || 'disconnected'}
                    </span>
                  </div>
                </header>
                <div className="performance-channel-values">
                  {provider.id === 'shopify' ? (
                    <><strong>{formatPerformanceCurrency(metrics.revenue, account.currency, true)}</strong><span>{formatPerformanceNumber(metrics.orders)} orders</span></>
                  ) : provider.id === 'klaviyo' ? (
                    <><strong>{formatPerformanceCurrency(metrics.revenue, account.currency, true)}</strong><span>{formatPerformanceNumber(metrics.conversions)} placed orders</span></>
                  ) : (
                    <><strong>{formatPerformanceCurrency(metrics.spend, account.currency, true)}</strong><span>{formatPerformanceRatio(roas)} attributed ROAS</span></>
                  )}
                </div>
                <footer>{connection ? `Synced ${formatSyncTime(connection.lastSyncedAt)}` : 'Awaiting connection'}</footer>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
