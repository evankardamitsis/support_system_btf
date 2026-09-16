import Link from 'next/link'
import { ArrowUpRight, Cable, CircleAlert, Crosshair, DatabaseZap, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { PERFORMANCE_PROVIDER_CATALOG } from '@/lib/performance/catalog'
import { formatPerformanceCurrency, formatPerformanceNumber, formatPerformancePercent, formatPerformanceRatio, formatSyncTime, metricDelta } from '@/lib/performance/display'
import type { PerformanceDashboardData, PerformanceEntityMetric, PerformancePageMetric, PerformanceUtmCampaignMetric } from '@/lib/performance/types'
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

function PageLeaderboard({ rows }: { rows: PerformancePageMetric[] }) {
  const map = new Map<string, { path: string; title: string | null; pageviews: number; sessions: number }>()
  for (const row of rows) {
    const current = map.get(row.path) || { path: row.path, title: row.title, pageviews: 0, sessions: 0 }
    current.pageviews += row.pageviews
    current.sessions += row.sessions
    if (row.title) current.title = row.title
    map.set(row.path, current)
  }
  const ranked = [...map.values()].sort((a, b) => b.pageviews - a.pageviews).slice(0, 10)
  return <article className="performance-panel performance-ranking-panel"><header className="performance-panel-head"><div><span className="performance-eyebrow">Content demand · first-party</span><h2>Most visited pages</h2></div><span className="performance-panel-kpi">TOP {ranked.length || '—'}</span></header>{ranked.length ? <div className="performance-table-wrap"><table className="performance-table"><thead><tr><th>Rank / page</th><th>Page views</th><th>Sessions</th><th>Views / session</th></tr></thead><tbody>{ranked.map((row, index) => <tr key={row.path}><td><b>{String(index + 1).padStart(2, '0')}</b><div><strong>{row.title || row.path}</strong><span>{row.path}</span></div></td><td>{formatPerformanceNumber(row.pageviews)}</td><td>{formatPerformanceNumber(row.sessions)}</td><td>{row.sessions ? (row.pageviews / row.sessions).toFixed(2) : '—'}</td></tr>)}</tbody></table></div> : <div className="performance-panel-empty"><DatabaseZap size={20} /><strong>Page collection is ready to activate</strong><span>Install the consent-aware custom pixel shown in Integrations. Rankings begin with the first page view and never depend on an order.</span></div>}</article>
}

function TrafficLeaderboard({ rows, currency, mode }: { rows: Aggregate[]; currency: string; mode: 'traffic' | 'attribution' }) {
  const attribution = mode === 'attribution'
  const ranked = [...rows].sort((a, b) => attribution ? b.revenue - a.revenue : b.sessions - a.sessions).slice(0, 10)
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0)
  return <article className="performance-panel performance-ranking-panel"><header className="performance-panel-head"><div><span className="performance-eyebrow">{attribution ? 'Shopify attribution · last click' : 'Acquisition mix · human sessions'}</span><h2>{attribution ? 'Marketing-attributed sales' : 'Traffic sources'}</h2></div><span className="performance-panel-kpi">TOP {ranked.length || '—'}</span></header>{ranked.length ? <div className="performance-table-wrap"><table className="performance-table"><thead><tr><th>Rank / source</th>{attribution ? <><th>Orders</th><th>Net sales</th><th>Sales share</th></> : <><th>Sessions</th><th>Purchases</th><th>Conv. rate</th></>}</tr></thead><tbody>{ranked.map((row, index) => <tr key={`${row.entityType}-${row.entityId}`}><td><b>{String(index + 1).padStart(2, '0')}</b><div><strong>{row.entityName}</strong><span>{attribution ? 'Last-click credit' : 'Shopify session source'}</span></div></td>{attribution ? <><td>{formatPerformanceNumber(row.orders)}</td><td>{formatPerformanceCurrency(row.revenue, currency, true)}</td><td>{formatPerformancePercent(totalRevenue ? row.revenue / totalRevenue * 100 : null)}</td></> : <><td>{formatPerformanceNumber(row.sessions)}</td><td>{formatPerformanceNumber(row.conversions)}</td><td>{formatPerformancePercent(row.sessions ? row.conversions / row.sessions * 100 : null)}</td></>}</tr>)}</tbody></table></div> : <div className="performance-panel-empty"><DatabaseZap size={20} /><strong>Shopify analytics access required</strong><span>Authorize read_reports and protected customer data Level 2, then sync to populate this breakdown.</span></div>}</article>
}

function UtmCampaignLeaderboard({ rows, currency }: { rows: PerformanceUtmCampaignMetric[]; currency: string }) {
  const map = new Map<string, { campaign: string; source: string | null; medium: string | null; purchases: number; revenue: number }>()
  for (const row of rows) {
    const key = `${row.source || ''}:${row.medium || ''}:${row.campaign}`
    const current = map.get(key) || { campaign: row.campaign, source: row.source, medium: row.medium, purchases: 0, revenue: 0 }
    current.purchases += row.purchases
    current.revenue += row.revenue
    map.set(key, current)
  }
  const ranked = [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10)
  return <article className="performance-panel performance-ranking-panel"><header className="performance-panel-head"><div><span className="performance-eyebrow">Observed UTM · session first touch</span><h2>Campaign-attributed purchases</h2></div><span className="performance-panel-kpi">TOP {ranked.length || '—'}</span></header>{ranked.length ? <div className="performance-table-wrap"><table className="performance-table"><thead><tr><th>Rank / campaign</th><th>Purchases</th><th>Revenue</th><th>AOV</th></tr></thead><tbody>{ranked.map((row, index) => <tr key={`${row.source}-${row.medium}-${row.campaign}`}><td><b>{String(index + 1).padStart(2, '0')}</b><div><strong>{row.campaign}</strong><span>{[row.source, row.medium].filter(Boolean).join(' · ') || 'UTM campaign'}</span></div></td><td>{formatPerformanceNumber(row.purchases)}</td><td>{formatPerformanceCurrency(row.revenue, currency, true)}</td><td>{row.purchases ? formatPerformanceCurrency(row.revenue / row.purchases, currency) : '—'}</td></tr>)}</tbody></table></div> : <div className="performance-panel-empty"><DatabaseZap size={20} /><strong>No tagged purchases yet</strong><span>The first-party pixel will connect checkout completions to the session’s first UTM campaign. Use consistent utm_source, utm_medium, and utm_campaign tags.</span></div>}</article>
}

function ActionQueue({ data }: { data: PerformanceDashboardData }) {
  const { summary, account } = data
  if (!account) return null
  const actions: Array<{ tone: string; title: string; body: string }> = []
  if (summary.spend === 0) actions.push({ tone: 'amber', title: 'Paid media has no delivered activity', body: 'Meta is connected but returned no spend in this range. Verify campaign delivery and reporting dates.' })
  if (account.targetRoas && summary.roas !== null && summary.roas < account.targetRoas) actions.push({ tone: 'coral', title: 'MER is below target', body: `${summary.roas.toFixed(2)}× actual versus ${account.targetRoas.toFixed(2)}× target. Inspect the ad table before scaling.` })
  if (account.targetCpa && summary.cpa !== null && summary.cpa > account.targetCpa) actions.push({ tone: 'coral', title: 'Paid CPA is above target', body: `${formatPerformanceCurrency(summary.cpa, account.currency)} actual versus ${formatPerformanceCurrency(account.targetCpa, account.currency)} target.` })
  if (!data.entities.some(row => row.entityType === 'klaviyo_flow')) actions.push({ tone: 'cyan', title: 'Unlock lifecycle reporting', body: 'Replace the Klaviyo key with campaigns:read and flows:read to rank newsletters and automations.' })
  if (!data.entities.some(row => row.entityType === 'product')) actions.push({ tone: 'cyan', title: 'Unlock product reporting', body: 'Re-authorize Shopify with read_products after releasing the new app version.' })
  if (!data.entities.some(row => row.entityType === 'traffic_source')) actions.push({ tone: 'amber', title: 'Unlock the store funnel and traffic mix', body: 'Add Shopify read_reports and protected customer data Level 2, then reauthorize and sync.' })
  if (!data.pages.length) actions.push({ tone: 'cyan', title: 'Start page-view collection', body: 'Install the consent-aware Shopify custom pixel from Integrations to rank every viewed page.' })
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
  const ads = aggregateEntities(data.entities, 'ad'), products = aggregateEntities(data.entities, 'product'), trafficSources = aggregateEntities(data.entities, 'traffic_source'), marketingChannels = aggregateEntities(data.entities, 'marketing_channel'), campaigns = aggregateEntities(data.entities, 'klaviyo_campaign'), flows = aggregateEntities(data.entities, 'klaviyo_flow')
  const hasLifecycle = campaigns.length + flows.length > 0
  const lifecycle = [...campaigns, ...flows].reduce((sum, row) => ({ delivered: sum.delivered + row.delivered, opens: sum.opens + row.opens, clicks: sum.clicks + row.clicks, conversions: sum.conversions + row.conversions }), { delivered: 0, opens: 0, clicks: 0, conversions: 0 })
  const pixelFunnel = data.webDaily.reduce((sum, row) => ({ sessions: sum.sessions + row.sessions, productViews: sum.productViews + row.productViewSessions, carts: sum.carts + row.cartSessions, checkouts: sum.checkouts + row.checkoutSessions, purchases: sum.purchases + row.purchaseSessions }), { sessions: 0, productViews: 0, carts: 0, checkouts: 0, purchases: 0 })
  const shopifyFunnel = data.daily.filter(row => row.provider === 'shopify').reduce((sum, row) => ({ sessions: sum.sessions + row.sessions, pageviews: sum.pageviews + Number(row.raw.pageviews || 0), carts: sum.carts + Number(row.raw.cartSessions || 0), checkouts: sum.checkouts + Number(row.raw.checkoutSessions || 0), purchases: sum.purchases + Number(row.raw.purchaseSessions || 0) }), { sessions: 0, pageviews: 0, carts: 0, checkouts: 0, purchases: 0 })
  const hasPixelFunnel = pixelFunnel.sessions > 0
  const storeFunnelSteps = hasPixelFunnel
    ? [{ label: 'Sessions', value: pixelFunnel.sessions, note: 'consented sessions' }, { label: 'Product viewers', value: pixelFunnel.productViews, note: formatPerformancePercent(pixelFunnel.sessions ? pixelFunnel.productViews / pixelFunnel.sessions * 100 : null) }, { label: 'Added to cart', value: pixelFunnel.carts, note: formatPerformancePercent(pixelFunnel.sessions ? pixelFunnel.carts / pixelFunnel.sessions * 100 : null) }, { label: 'Reached checkout', value: pixelFunnel.checkouts, note: formatPerformancePercent(pixelFunnel.sessions ? pixelFunnel.checkouts / pixelFunnel.sessions * 100 : null) }, { label: 'Purchased', value: pixelFunnel.purchases, note: formatPerformancePercent(pixelFunnel.sessions ? pixelFunnel.purchases / pixelFunnel.sessions * 100 : null) }]
    : [{ label: 'Sessions', value: shopifyFunnel.sessions, note: 'Shopify human sessions' }, { label: 'Added to cart', value: shopifyFunnel.carts, note: formatPerformancePercent(shopifyFunnel.sessions ? shopifyFunnel.carts / shopifyFunnel.sessions * 100 : null) }, { label: 'Reached checkout', value: shopifyFunnel.checkouts, note: formatPerformancePercent(shopifyFunnel.sessions ? shopifyFunnel.checkouts / shopifyFunnel.sessions * 100 : null) }, { label: 'Purchased', value: shopifyFunnel.purchases, note: formatPerformancePercent(shopifyFunnel.sessions ? shopifyFunnel.purchases / shopifyFunnel.sessions * 100 : null) }]
  return <div className="performance-layout performance-hq">
    {!data.isPreview ? <PerformanceLiveRefresh accountId={account.id} /> : null}
    <div className="performance-heading-row"><PageHeader title="Performance HQ" description="Store truth, paid attribution, lifecycle contribution, and the decisions behind them." /><div className="performance-heading-actions"><PerformanceAccountPicker accounts={data.accounts.map(item => ({ id: item.id, displayName: item.displayName }))} value={account.id} /><PerformanceSyncControl accountId={account.id} /></div></div>
    <section className="performance-command-bar"><div><span className="performance-live-dot" /><strong>{data.isPreview ? 'Preview' : 'Live'}</strong><span>{account.displayName}</span></div><div className="performance-command-meta"><span>{connectedCount}/4 sources {data.isPreview ? 'simulated' : 'online'}</span><span>{data.isPreview ? 'Sample signal' : `Updated ${formatSyncTime(data.lastSyncedAt)}`}</span>{errorCount ? <span className="is-error"><CircleAlert size={12} /> {errorCount} needs attention</span> : null}</div></section>
    <div className="performance-toolbar"><div className="performance-range-tabs">{[7, 14, 30, 90].map(days => <Link key={days} href={`/admin/performance?account=${account.id}&range=${days}${data.isPreview ? '&preview=1' : ''}`} className={data.rangeDays === days ? 'is-active' : ''}>{days}D</Link>)}</div><div className="performance-truth-key"><span><i className="is-store" />Shopify = store truth</span><span><i className="is-paid" />Ads = attributed</span><span><i className="is-email" />Klaviyo = attributed</span></div></div>
    <section className="performance-metric-grid performance-metric-grid-hq">
      <MetricCard label="Store revenue" value={formatPerformanceCurrency(summary.revenue, account.currency, true)} delta={metricDelta(summary.revenue, previousSummary.revenue)} signal="lime" context="Shopify · not blended" />
      <MetricCard label="Paid spend" value={formatPerformanceCurrency(summary.spend, account.currency, true)} delta={metricDelta(summary.spend, previousSummary.spend)} signal="cyan" inverse context="Meta + Google" />
      <MetricCard label="MER" value={formatPerformanceRatio(summary.roas)} delta={metricDelta(summary.roas || 0, previousSummary.roas || 0)} signal="amber" context="Store revenue ÷ total ad spend · blended efficiency. Higher is better." />
      <MetricCard label="Store orders" value={formatPerformanceNumber(summary.orders)} delta={metricDelta(summary.orders, previousSummary.orders)} context="Shopify orders" />
      <MetricCard label="Paid CPA" value={summary.cpa === null ? '—' : formatPerformanceCurrency(summary.cpa, account.currency)} delta={metricDelta(summary.cpa || 0, previousSummary.cpa || 0)} signal="coral" inverse context="Ad spend ÷ platform-attributed conversions · lower is better." />
      <MetricCard label="AOV" value={summary.aov === null ? '—' : formatPerformanceCurrency(summary.aov, account.currency)} delta={metricDelta(summary.aov || 0, previousSummary.aov || 0)} context="Store revenue ÷ orders" />
      <MetricCard label="New customer rate" value={formatPerformancePercent(summary.newCustomerRate)} delta={metricDelta(summary.newCustomerRate || 0, previousSummary.newCustomerRate || 0)} context={`${formatPerformanceNumber(summary.newCustomers)} first orders`} />
      <MetricCard label="Lifecycle revenue*" value={hasLifecycle ? formatPerformanceCurrency(summary.emailRevenue, account.currency, true) : '—'} delta={hasLifecycle && previousSummary.emailRevenue > 0 ? metricDelta(summary.emailRevenue, previousSummary.emailRevenue) : null} signal="cyan" context="Klaviyo attributed · 30D" />
    </section>
    <section className="performance-hq-top"><article className="performance-panel performance-trend-panel"><header className="performance-panel-head"><div><span className="performance-eyebrow">Momentum</span><h2>Revenue against media pressure</h2></div><span className="performance-panel-kpi">{formatPerformanceRatio(summary.roas)} MER</span></header><PerformanceChart rows={data.daily} currency={account.currency} /></article><ActionQueue data={data} /></section>
    <section className="performance-funnel-grid"><article className="performance-panel"><header className="performance-panel-head"><div><span className="performance-eyebrow">Store behavior · {hasPixelFunnel ? 'first-party pixel' : 'Shopify analytics'}</span><h2>Session to purchase</h2></div><span className="performance-panel-kpi">{formatPerformancePercent(storeFunnelSteps[0]?.value ? storeFunnelSteps.at(-1)!.value / storeFunnelSteps[0].value * 100 : null)}</span></header>{storeFunnelSteps[0]?.value ? <StepFunnel steps={storeFunnelSteps} /> : <div className="performance-panel-empty"><DatabaseZap size={20} /><strong>Store funnel is ready to unlock</strong><span>Authorize Shopify reports or install the custom pixel from Integrations.</span></div>}</article><article className="performance-panel"><header className="performance-panel-head"><div><span className="performance-eyebrow">Lifecycle · fixed window</span><h2>Email delivery to conversion</h2></div><span className="performance-panel-kpi">KLAVIYO* · 30D</span></header>{lifecycle.delivered ? <StepFunnel steps={[{ label: 'Delivered', value: lifecycle.delivered, note: 'campaigns + flows' }, { label: 'Unique opens', value: lifecycle.opens, note: formatPerformancePercent(lifecycle.opens / lifecycle.delivered * 100) }, { label: 'Unique clicks', value: lifecycle.clicks, note: formatPerformancePercent(lifecycle.clicks / lifecycle.delivered * 100) }, { label: 'Conversions', value: lifecycle.conversions, note: formatPerformancePercent(lifecycle.conversions / lifecycle.delivered * 100) }]} /> : <div className="performance-panel-empty"><DatabaseZap size={20} /><strong>Lifecycle detail is locked</strong><span>Add campaigns:read and flows:read to the Klaviyo private key.</span></div>}</article></section>
    <div className="performance-coverage-note"><ShieldCheck size={16} /><div><strong>Accuracy contract</strong><span>Shopify owns store revenue, orders, the human-session funnel, traffic sources, and attribution. Most visited pages comes only from consented first-party page-view events. Ad and Klaviyo revenue marked * remains platform-attributed and is never added to store revenue.</span></div></div>
    <section className="performance-ranking-grid"><Leaderboard eyebrow="Paid creative" title="Top ads" rows={ads} kind="ad" currency={account.currency} empty="Sync Meta or connect Google Ads to populate creative performance." /><PageLeaderboard rows={data.pages} /><TrafficLeaderboard rows={trafficSources} currency={account.currency} mode="traffic" /><TrafficLeaderboard rows={marketingChannels} currency={account.currency} mode="attribution" /><UtmCampaignLeaderboard rows={data.utmCampaigns} currency={account.currency} /><Leaderboard eyebrow="Merchandising" title="Top products" rows={products} kind="commerce" currency={account.currency} empty="Re-authorize Shopify with read_products, then sync." /><Leaderboard eyebrow="Automation · 30D" title="Top Klaviyo flows" rows={flows} kind="email" currency={account.currency} empty="Use a Klaviyo key with flows:read, then sync." /><Leaderboard eyebrow="Newsletter · 30D" title="Top campaigns" rows={campaigns} kind="email" currency={account.currency} empty="Use a Klaviyo key with campaigns:read, then sync." /></section>
    <section className="performance-channel-section"><div className="performance-section-head"><div><span className="performance-eyebrow">Source health</span><h2>Connection pulse</h2></div><Link href={`/admin/performance/integrations?account=${account.id}`}>Manage connections →</Link></div><div className="performance-channel-grid">{PERFORMANCE_PROVIDER_CATALOG.map(provider => { const connection = data.connections.find(item => item.provider === provider.id), metrics = providerSummary(data, provider.id), roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : null; return <article className="performance-channel-card" key={provider.id} style={{ '--provider-accent': provider.accent } as React.CSSProperties}><header><div className="performance-provider-mark">{provider.shortName.slice(0, 2).toUpperCase()}</div><div><h3>{provider.name}</h3><span className={`performance-connection-state is-${connection?.status || 'disconnected'}`}>{connection?.status || 'disconnected'}</span></div></header><div className="performance-channel-values">{provider.id === 'shopify' ? <><strong>{formatPerformanceCurrency(metrics.revenue, account.currency, true)}</strong><span>{formatPerformanceNumber(metrics.orders)} orders · source of truth</span></> : provider.id === 'klaviyo' ? <><strong>{formatPerformanceCurrency(metrics.revenue, account.currency, true)}</strong><span>{formatPerformanceNumber(metrics.conversions)} tracked placed orders · not attribution</span></> : <><strong>{formatPerformanceCurrency(metrics.spend, account.currency, true)}</strong><span>{formatPerformanceRatio(roas)} platform ROAS*</span></>}</div><footer>{connection ? `Synced ${formatSyncTime(connection.lastSyncedAt)}` : 'Awaiting connection'}</footer></article> })}</div></section>
  </div>
}
