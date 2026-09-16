import Link from 'next/link'
import { ArrowUpRight, Cable, CircleAlert, Crosshair, DatabaseZap, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { PERFORMANCE_PROVIDER_CATALOG } from '@/lib/performance/catalog'
import { formatPerformanceCurrency, formatPerformanceNumber, formatPerformancePercent, formatPerformanceRatio, formatSyncTime, metricDelta } from '@/lib/performance/display'
import type { PerformanceDashboardData, PerformanceEntityMetric } from '@/lib/performance/types'
import { PerformanceAccountPicker, PerformanceSyncControl } from './PerformanceControls'
import { PerformanceChart } from './PerformanceChart'
import { PerformanceLiveRefresh } from './PerformanceLiveRefresh'

type Aggregate = Omit<PerformanceEntityMetric, 'date' | 'raw'>

function Delta({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value === null) return <span className="performance-delta is-neutral">First signal</span>
  const positive = inverse ? value <= 0 : value >= 0
  return <span className={`performance-delta ${positive ? 'is-positive' : 'is-negative'}`}>{value >= 0 ? '+' : ''}{value.toFixed(1)}% <em>vs prev.</em></span>
}

function MetricCard({ label, value, delta, signal, inverse, context }: { label: string; value: string; delta: number | null; signal?: 'lime' | 'cyan' | 'amber' | 'coral'; inverse?: boolean; context: string }) {
  return <article className={`performance-metric ${signal ? `is-${signal}` : ''}`}><span className="performance-metric-label">{label}</span><strong>{value}</strong><Delta value={delta} inverse={inverse} /><small>{context}</small></article>
}

function providerSummary(data: PerformanceDashboardData, provider: string) {
  return data.daily.filter(row => row.provider === provider).reduce((sum, row) => ({ revenue: sum.revenue + row.revenue, spend: sum.spend + row.spend, orders: sum.orders + row.orders, conversions: sum.conversions + row.conversions, impressions: sum.impressions + row.impressions, clicks: sum.clicks + row.clicks }), { revenue: 0, spend: 0, orders: 0, conversions: 0, impressions: 0, clicks: 0 })
}

function aggregateEntities(rows: PerformanceEntityMetric[], type: PerformanceEntityMetric['entityType']) {
  const map = new Map<string, Aggregate>()
  for (const row of rows.filter(item => item.entityType === type)) {
    const key = `${row.provider}:${row.entityId}`
    const current = map.get(key)
    if (!current) { const { date: _date, raw: _raw, ...aggregate } = row; void _date; void _raw; map.set(key, { ...aggregate }); continue }
    for (const metric of ['revenue', 'spend', 'orders', 'conversions', 'impressions', 'clicks', 'sessions', 'delivered', 'opens', 'unsubscribes'] as const) current[metric] += row[metric]
  }
  return [...map.values()]
}

function StepFunnel({ steps }: { steps: Array<{ label: string; value: number; note: string }> }) {
  const max = Math.max(...steps.map(step => step.value), 1)
  return <div className="performance-funnel">{steps.map((step, index) => <div className="performance-funnel-step" key={step.label} style={{ '--funnel-width': `${Math.max(34, (step.value / max) * 100)}%` } as React.CSSProperties}><span>{String(index + 1).padStart(2, '0')}</span><div><em>{step.label}<small>{step.note}</small></em><strong>{formatPerformanceNumber(step.value)}</strong></div></div>)}</div>
}

function Leaderboard({ title, eyebrow, rows, kind, currency, empty }: { title: string; eyebrow: string; rows: Aggregate[]; kind: 'ad' | 'commerce' | 'email'; currency: string; empty: string }) {
  const ranked = [...rows].sort((a, b) => (kind === 'ad' ? b.spend - a.spend : b.revenue - a.revenue)).slice(0, 6)
  return <article className="performance-panel performance-ranking-panel"><header className="performance-panel-head"><div><span className="performance-eyebrow">{eyebrow}</span><h2>{title}</h2></div><span className="performance-panel-kpi">TOP {ranked.length || '—'}</span></header>{ranked.length ? <div className="performance-table-wrap"><table className="performance-table"><thead><tr><th>Rank / asset</th>{kind === 'ad' ? <><th>Spend</th><th>Revenue*</th><th>ROAS*</th><th>CTR</th></> : kind === 'email' ? <><th>Delivered</th><th>Open</th><th>Click</th><th>Revenue*</th></> : <><th>Orders</th><th>Units / conv.</th><th>Revenue</th><th>AOV</th></>}</tr></thead><tbody>{ranked.map((row, index) => {
    const roas = row.spend > 0 ? row.revenue / row.spend : null, ctr = row.impressions > 0 ? row.clicks / row.impressions * 100 : null, open = row.delivered > 0 ? row.opens / row.delivered * 100 : null, click = row.delivered > 0 ? row.clicks / row.delivered * 100 : null
    return <tr key={`${row.provider}-${row.entityId}`}><td><b>{String(index + 1).padStart(2, '0')}</b><div><strong>{row.entityName}</strong><span>{row.parentName || row.provider}</span></div></td>{kind === 'ad' ? <><td>{formatPerformanceCurrency(row.spend, currency, true)}</td><td>{formatPerformanceCurrency(row.revenue, currency, true)}</td><td>{formatPerformanceRatio(roas)}</td><td>{formatPerformancePercent(ctr)}</td></> : kind === 'email' ? <><td>{formatPerformanceNumber(row.delivered)}</td><td>{formatPerformancePercent(open)}</td><td>{formatPerformancePercent(click)}</td><td>{formatPerformanceCurrency(row.revenue, currency, true)}</td></> : <><td>{formatPerformanceNumber(row.orders)}</td><td>{formatPerformanceNumber(row.conversions)}</td><td>{formatPerformanceCurrency(row.revenue, currency, true)}</td><td>{row.orders ? formatPerformanceCurrency(row.revenue / row.orders, currency) : '—'}</td></>}</tr>
  })}</tbody></table></div> : <div className="performance-panel-empty"><DatabaseZap size={20} /><strong>Awaiting detailed data</strong><span>{empty}</span></div>}</article>
}

function ActionQueue({ data }: { data: PerformanceDashboardData }) {
  const { summary, account } = data
  if (!account) return null
  const actions: Array<{ tone: string; title: string; body: string }> = []
  if (summary.spend === 0) actions.push({ tone: 'amber', title: 'Paid media has no delivered activity', body: 'Meta is connected but returned no spend in this range. Verify campaign delivery and reporting dates.' })
  if (account.targetRoas && summary.roas !== null && summary.roas < account.targetRoas) actions.push({ tone: 'coral', title: 'MER is below target', body: `${summary.roas.toFixed(2)}× actual versus ${account.targetRoas.toFixed(2)}× target. Inspect the ad table before scaling.` })
  if (account.targetCpa && summary.cpa !== null && summary.cpa > account.targetCpa) actions.push({ tone: 'coral', title: 'Paid CPA is above target', body: `${formatPerformanceCurrency(summary.cpa, account.currency)} actual versus ${formatPerformanceCurrency(account.targetCpa, account.currency)} target.` })
  if (!data.entities.some(row => row.entityType === 'klaviyo_flow')) actions.push({ tone: 'cyan', title: 'Unlock lifecycle reporting', body: 'Replace the Klaviyo key with campaigns:read and flows:read to rank newsletters and automations.' })
  if (!data.entities.some(row => row.entityType === 'product')) actions.push({ tone: 'cyan', title: 'Unlock product and page reporting', body: 'Re-authorize Shopify with read_products after releasing the new app version.' })
  if (!actions.length) actions.push({ tone: 'lime', title: 'Core signals are healthy', body: 'No target breach is visible. Review the weakest creative and lifecycle table before the next budget move.' })
  return <article className="performance-panel performance-actions-panel"><header className="performance-panel-head"><div><span className="performance-eyebrow">Operator queue</span><h2>What needs attention</h2></div><Crosshair size={17} /></header><div className="performance-actions-list">{actions.slice(0, 4).map((action, index) => <div className={`performance-action-row is-${action.tone}`} key={action.title}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{action.title}</strong><p>{action.body}</p></div></div>)}</div></article>
}

function EmptyAccount() {
  return <div className="performance-layout"><PageHeader title="Performance Retainers" description="One live operating view across commerce, paid media, and lifecycle marketing." /><div className="performance-empty-account"><Cable size={26} /><h2>Create the first performance workspace</h2><p>Start with Sasha Elage, then connect Shopify, Meta, Google Ads, and Klaviyo.</p><Link href="/admin/performance/integrations" className="performance-primary-link">Set up integrations <ArrowUpRight size={14} /></Link></div></div>
}

export function PerformanceHQ({ data }: { data: PerformanceDashboardData }) {
  if (!data.account) return <EmptyAccount />
  const { account, summary, previousSummary } = data
  const connectedCount = data.connections.filter(connection => connection.status === 'connected').length, errorCount = data.connections.filter(connection => connection.status === 'error').length
  const ads = aggregateEntities(data.entities, 'ad'), products = aggregateEntities(data.entities, 'product'), pages = aggregateEntities(data.entities, 'landing_page'), campaigns = aggregateEntities(data.entities, 'klaviyo_campaign'), flows = aggregateEntities(data.entities, 'klaviyo_flow')
  const hasLifecycle = campaigns.length + flows.length > 0
  const lifecycle = [...campaigns, ...flows].reduce((sum, row) => ({ delivered: sum.delivered + row.delivered, opens: sum.opens + row.opens, clicks: sum.clicks + row.clicks, conversions: sum.conversions + row.conversions }), { delivered: 0, opens: 0, clicks: 0, conversions: 0 })
  return <div className="performance-layout performance-hq">
    {!data.isPreview ? <PerformanceLiveRefresh accountId={account.id} /> : null}
    <div className="performance-heading-row"><PageHeader title="Performance HQ" description="Store truth, paid attribution, lifecycle contribution, and the decisions behind them." /><div className="performance-heading-actions"><PerformanceAccountPicker accounts={data.accounts.map(item => ({ id: item.id, displayName: item.displayName }))} value={account.id} /><PerformanceSyncControl accountId={account.id} /></div></div>
    <section className="performance-command-bar"><div><span className="performance-live-dot" /><strong>{data.isPreview ? 'Preview' : 'Live'}</strong><span>{account.displayName}</span></div><div className="performance-command-meta"><span>{connectedCount}/4 sources {data.isPreview ? 'simulated' : 'online'}</span><span>{data.isPreview ? 'Sample signal' : `Updated ${formatSyncTime(data.lastSyncedAt)}`}</span>{errorCount ? <span className="is-error"><CircleAlert size={12} /> {errorCount} needs attention</span> : null}</div></section>
    <div className="performance-toolbar"><div className="performance-range-tabs">{[7, 14, 30, 90].map(days => <Link key={days} href={`/admin/performance?account=${account.id}&range=${days}${data.isPreview ? '&preview=1' : ''}`} className={data.rangeDays === days ? 'is-active' : ''}>{days}D</Link>)}</div><div className="performance-truth-key"><span><i className="is-store" />Shopify = store truth</span><span><i className="is-paid" />Ads = attributed</span><span><i className="is-email" />Klaviyo = attributed</span></div></div>
    <section className="performance-metric-grid performance-metric-grid-hq">
      <MetricCard label="Store revenue" value={formatPerformanceCurrency(summary.revenue, account.currency, true)} delta={metricDelta(summary.revenue, previousSummary.revenue)} signal="lime" context="Shopify · not blended" />
      <MetricCard label="Paid spend" value={formatPerformanceCurrency(summary.spend, account.currency, true)} delta={metricDelta(summary.spend, previousSummary.spend)} signal="cyan" inverse context="Meta + Google" />
      <MetricCard label="MER" value={formatPerformanceRatio(summary.roas)} delta={metricDelta(summary.roas || 0, previousSummary.roas || 0)} signal="amber" context="Store revenue ÷ spend" />
      <MetricCard label="Store orders" value={formatPerformanceNumber(summary.orders)} delta={metricDelta(summary.orders, previousSummary.orders)} context="Shopify orders" />
      <MetricCard label="Paid CPA" value={summary.cpa === null ? '—' : formatPerformanceCurrency(summary.cpa, account.currency)} delta={metricDelta(summary.cpa || 0, previousSummary.cpa || 0)} signal="coral" inverse context="Spend ÷ attributed conv." />
      <MetricCard label="AOV" value={summary.aov === null ? '—' : formatPerformanceCurrency(summary.aov, account.currency)} delta={metricDelta(summary.aov || 0, previousSummary.aov || 0)} context="Store revenue ÷ orders" />
      <MetricCard label="New customer rate" value={formatPerformancePercent(summary.newCustomerRate)} delta={metricDelta(summary.newCustomerRate || 0, previousSummary.newCustomerRate || 0)} context={`${formatPerformanceNumber(summary.newCustomers)} first orders`} />
      <MetricCard label="Lifecycle revenue*" value={hasLifecycle ? formatPerformanceCurrency(summary.emailRevenue, account.currency, true) : '—'} delta={hasLifecycle && previousSummary.emailRevenue > 0 ? metricDelta(summary.emailRevenue, previousSummary.emailRevenue) : null} signal="cyan" context="Klaviyo attributed · 30D" />
    </section>
    <section className="performance-hq-top"><article className="performance-panel performance-trend-panel"><header className="performance-panel-head"><div><span className="performance-eyebrow">Momentum</span><h2>Revenue against media pressure</h2></div><span className="performance-panel-kpi">{formatPerformanceRatio(summary.roas)} MER</span></header><PerformanceChart rows={data.daily} currency={account.currency} /></article><ActionQueue data={data} /></section>
    <section className="performance-funnel-grid"><article className="performance-panel"><header className="performance-panel-head"><div><span className="performance-eyebrow">Paid acquisition</span><h2>Impression to attributed conversion</h2></div><span className="performance-panel-kpi">{formatPerformancePercent(summary.conversionRate)}</span></header><StepFunnel steps={[{ label: 'Impressions', value: summary.impressions, note: 'paid delivery' }, { label: 'Clicks', value: summary.clicks, note: `${formatPerformancePercent(summary.ctr)} CTR` }, { label: 'Attributed conversions', value: summary.conversions, note: `${summary.cpa ? formatPerformanceCurrency(summary.cpa, account.currency) : '—'} CPA` }, { label: 'Store orders', value: summary.orders, note: 'comparison only' }]} /></article><article className="performance-panel"><header className="performance-panel-head"><div><span className="performance-eyebrow">Lifecycle · fixed window</span><h2>Email delivery to conversion</h2></div><span className="performance-panel-kpi">KLAVIYO* · 30D</span></header>{lifecycle.delivered ? <StepFunnel steps={[{ label: 'Delivered', value: lifecycle.delivered, note: 'campaigns + flows' }, { label: 'Unique opens', value: lifecycle.opens, note: formatPerformancePercent(lifecycle.opens / lifecycle.delivered * 100) }, { label: 'Unique clicks', value: lifecycle.clicks, note: formatPerformancePercent(lifecycle.clicks / lifecycle.delivered * 100) }, { label: 'Conversions', value: lifecycle.conversions, note: formatPerformancePercent(lifecycle.conversions / lifecycle.delivered * 100) }]} /> : <div className="performance-panel-empty"><DatabaseZap size={20} /><strong>Lifecycle detail is locked</strong><span>Add campaigns:read and flows:read to the Klaviyo private key.</span></div>}</article></section>
    <div className="performance-coverage-note"><ShieldCheck size={16} /><div><strong>Accuracy contract</strong><span>Shopify owns revenue, orders, customers, products, and converting landing pages. Ad and Klaviyo revenue marked * remains platform-attributed and is never added to store revenue. Full sessions → product views → cart → checkout requires the upcoming first-party web event collector.</span></div></div>
    <section className="performance-ranking-grid"><Leaderboard eyebrow="Paid creative" title="Top ads" rows={ads} kind="ad" currency={account.currency} empty="Sync Meta or connect Google Ads to populate creative performance." /><Leaderboard eyebrow="Merchandising" title="Top products" rows={products} kind="commerce" currency={account.currency} empty="Re-authorize Shopify with read_products, then sync." /><Leaderboard eyebrow="Conversion entry" title="Converting landing pages" rows={pages} kind="commerce" currency={account.currency} empty="Shopify order journeys will populate after re-authorization." /><Leaderboard eyebrow="Automation · 30D" title="Top Klaviyo flows" rows={flows} kind="email" currency={account.currency} empty="Use a Klaviyo key with flows:read, then sync." /><Leaderboard eyebrow="Newsletter · 30D" title="Top campaigns" rows={campaigns} kind="email" currency={account.currency} empty="Use a Klaviyo key with campaigns:read, then sync." /></section>
    <section className="performance-channel-section"><div className="performance-section-head"><div><span className="performance-eyebrow">Source health</span><h2>Connection pulse</h2></div><Link href={`/admin/performance/integrations?account=${account.id}`}>Manage connections →</Link></div><div className="performance-channel-grid">{PERFORMANCE_PROVIDER_CATALOG.map(provider => { const connection = data.connections.find(item => item.provider === provider.id), metrics = providerSummary(data, provider.id), roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : null; return <article className="performance-channel-card" key={provider.id} style={{ '--provider-accent': provider.accent } as React.CSSProperties}><header><div className="performance-provider-mark">{provider.shortName.slice(0, 2).toUpperCase()}</div><div><h3>{provider.name}</h3><span className={`performance-connection-state is-${connection?.status || 'disconnected'}`}>{connection?.status || 'disconnected'}</span></div></header><div className="performance-channel-values">{provider.id === 'shopify' ? <><strong>{formatPerformanceCurrency(metrics.revenue, account.currency, true)}</strong><span>{formatPerformanceNumber(metrics.orders)} orders · source of truth</span></> : provider.id === 'klaviyo' ? <><strong>{formatPerformanceCurrency(metrics.revenue, account.currency, true)}</strong><span>{formatPerformanceNumber(metrics.conversions)} tracked placed orders · not attribution</span></> : <><strong>{formatPerformanceCurrency(metrics.spend, account.currency, true)}</strong><span>{formatPerformanceRatio(roas)} platform ROAS*</span></>}</div><footer>{connection ? `Synced ${formatSyncTime(connection.lastSyncedAt)}` : 'Awaiting connection'}</footer></article> })}</div></section>
  </div>
}
