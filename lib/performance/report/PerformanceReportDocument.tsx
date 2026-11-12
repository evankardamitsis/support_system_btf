import { Document, Font, Image as PdfImage, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import {
  formatPerformanceCurrency,
  formatPerformanceNumber,
  formatPerformancePercent,
  formatPerformanceRatio,
  metricDelta,
} from '@/lib/performance/display'
import type {
  PerformanceDashboardData,
  PerformanceEntityMetric,
  PerformanceProvider,
} from '@/lib/performance/types'

/** Providers the one-page report supports, in the order they appear. */
const REPORT_PROVIDERS = ['meta', 'google', 'shopify'] as const
type ReportProvider = (typeof REPORT_PROVIDERS)[number]

const PROVIDER_LABEL: Record<ReportProvider, string> = {
  meta: 'Meta Ads',
  google: 'Google Ads',
  shopify: 'Website · Shopify',
}

const PROVIDER_ACCENT: Record<ReportProvider, string> = {
  meta: '#1877F2',
  google: '#F4B400',
  shopify: '#5E8E3E',
}

// Keep words whole: react-pdf hyphenates long labels by default.
Font.registerHyphenationCallback(word => [word])

const INK = '#161616'
const MUTED = '#6B6862'
const LINE = '#E3E0D9'
const PAPER = '#F6F4EF'

const s = StyleSheet.create({
  page: { paddingTop: 26, paddingBottom: 22, paddingHorizontal: 30, fontSize: 8, fontFamily: 'Helvetica', color: INK, lineHeight: 1.3 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  logo: { width: 132, height: 17, objectFit: 'contain', objectPosition: 'left' },
  headRight: { textAlign: 'right' },
  eyebrow: { fontSize: 6.5, letterSpacing: 1.2, textTransform: 'uppercase', color: MUTED },
  client: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginTop: 3, lineHeight: 1.15 },
  period: { fontSize: 7.5, color: MUTED, marginTop: 3 },
  rule: { height: 2, backgroundColor: INK, marginBottom: 10 },
  kpiRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  kpi: { flex: 1, backgroundColor: PAPER, borderRadius: 4, padding: 7 },
  kpiDark: { backgroundColor: INK },
  kpiLabel: { fontSize: 6.3, letterSpacing: 0.8, textTransform: 'uppercase', color: MUTED },
  kpiValue: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginTop: 4, lineHeight: 1.15 },
  kpiSub: { fontSize: 6.5, color: MUTED, marginTop: 4 },
  up: { color: '#2E7D32' },
  down: { color: '#C62828' },
  grid: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  block: { borderWidth: 1, borderColor: LINE, borderRadius: 4, padding: 8 },
  card: { flex: 1, borderWidth: 1, borderColor: LINE, borderRadius: 4, padding: 8 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  cardTitle: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', lineHeight: 1.15 },
  cardMeta: { fontSize: 7, color: MUTED },
  statRow: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  stat: { flex: 1, backgroundColor: PAPER, borderRadius: 3, paddingVertical: 4, paddingHorizontal: 5 },
  statValue: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', lineHeight: 1.15 },
  statLabel: { fontSize: 5.8, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  th: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: INK, paddingBottom: 2, marginBottom: 1 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: LINE, paddingVertical: 2.5 },
  thText: { fontSize: 6, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 },
  cellName: { flex: 3, paddingRight: 4 },
  cell: { flex: 1, textAlign: 'right' },
  empty: { fontSize: 7, color: MUTED, paddingVertical: 6 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 46, gap: 1.2, marginTop: 2 },
  chartAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  insights: { borderWidth: 1, borderColor: LINE, borderRadius: 4, padding: 8, marginBottom: 8 },
  insightRow: { flexDirection: 'row', gap: 6, marginTop: 3 },
  insightNum: { fontSize: 7, fontFamily: 'Helvetica-Bold', width: 12 },
  insightText: { flex: 1, fontSize: 7.5 },
  footer: { position: 'absolute', bottom: 14, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', fontSize: 6.3, color: MUTED, borderTopWidth: 0.5, borderTopColor: LINE, paddingTop: 4 },
})

type Totals = { spend: number; revenue: number; conversions: number; impressions: number; clicks: number; sessions: number; orders: number }
const zero = (): Totals => ({ spend: 0, revenue: 0, conversions: 0, impressions: 0, clicks: 0, sessions: 0, orders: 0 })

function totalsFor(data: PerformanceDashboardData, provider: PerformanceProvider): Totals {
  return data.daily
    .filter(row => row.provider === provider)
    .reduce((t, row) => ({
      spend: t.spend + row.spend,
      revenue: t.revenue + row.revenue,
      conversions: t.conversions + row.conversions,
      impressions: t.impressions + row.impressions,
      clicks: t.clicks + row.clicks,
      sessions: t.sessions + row.sessions,
      orders: t.orders + row.orders,
    }), zero())
}

type Group = { name: string; sub: string; spend: number; revenue: number; conversions: number; impressions: number; clicks: number; sessions: number }

/** Roll ad-level rows up to campaigns so the table stays short. */
function topCampaigns(entities: PerformanceEntityMetric[], provider: PerformanceProvider, limit = 5): Group[] {
  const map = new Map<string, Group>()
  for (const row of entities) {
    if (row.provider !== provider || row.entityType !== 'ad') continue
    const key = row.parentId || row.parentName || row.entityId
    const g = map.get(key) || { name: row.parentName || row.entityName, sub: '', spend: 0, revenue: 0, conversions: 0, impressions: 0, clicks: 0, sessions: 0 }
    g.spend += row.spend; g.revenue += row.revenue; g.conversions += row.conversions; g.impressions += row.impressions; g.clicks += row.clicks
    map.set(key, g)
  }
  return [...map.values()].sort((a, b) => b.spend - a.spend).slice(0, limit)
}

function topEntities(entities: PerformanceEntityMetric[], type: PerformanceEntityMetric['entityType'], limit = 5): Group[] {
  const map = new Map<string, Group>()
  for (const row of entities) {
    if (row.entityType !== type) continue
    const g = map.get(row.entityId) || { name: row.entityName, sub: '', spend: 0, revenue: 0, conversions: 0, impressions: 0, clicks: 0, sessions: 0 }
    g.sessions += row.sessions; g.conversions += row.conversions; g.revenue += row.revenue
    map.set(row.entityId, g)
  }
  return [...map.values()].sort((a, b) => b.sessions - a.sessions).slice(0, limit)
}

function topPages(data: PerformanceDashboardData, limit = 5) {
  const map = new Map<string, { name: string; views: number; sessions: number }>()
  for (const row of data.pages) {
    const p = map.get(row.path) || { name: row.title || row.path, views: 0, sessions: 0 }
    p.views += row.pageviews; p.sessions += row.sessions
    map.set(row.path, p)
  }
  return [...map.values()].sort((a, b) => b.views - a.views).slice(0, limit)
}

const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : null)
const div = (a: number, b: number) => (b > 0 ? a / b : null)
const trim = (text: string, max = 42) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

function Delta({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value === null || !Number.isFinite(value)) return <Text style={s.kpiSub}>no previous data</Text>
  const good = inverse ? value <= 0 : value >= 0
  return <Text style={[s.kpiSub, good ? s.up : s.down]}>{value >= 0 ? '+' : '-'}{Math.abs(value).toFixed(1)}% vs prev. period</Text>
}

function Kpi({ label, value, sub, delta, inverse, dark }: { label: string; value: string; sub?: string; delta?: number | null; inverse?: boolean; dark?: boolean }) {
  return (
    <View style={[s.kpi, dark ? s.kpiDark : {}]}>
      <Text style={[s.kpiLabel, dark ? { color: '#CFCCC4' } : {}]}>{label}</Text>
      <Text style={[s.kpiValue, dark ? { color: '#FFFFFF' } : {}]}>{value}</Text>
      {delta !== undefined ? <Delta value={delta} inverse={inverse} /> : sub ? <Text style={[s.kpiSub, dark ? { color: '#CFCCC4' } : {}]}>{sub}</Text> : null}
    </View>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <View style={s.stat}><Text style={s.statValue}>{value}</Text><Text style={s.statLabel}>{label}</Text></View>
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <View>
      <View style={s.th}>{head.map((h, i) => <Text key={h} style={[s.thText, i === 0 ? s.cellName : s.cell]}>{h}</Text>)}</View>
      {rows.map((r, ri) => (
        <View key={ri} style={s.tr}>{r.map((c, i) => <Text key={i} style={i === 0 ? s.cellName : s.cell}>{c}</Text>)}</View>
      ))}
    </View>
  )
}

function AdsCard({ data, provider }: { data: PerformanceDashboardData; provider: 'meta' | 'google' }) {
  const currency = data.account!.currency
  const t = totalsFor(data, provider)
  const campaigns = topCampaigns(data.entities, provider)
  const hasRevenue = t.revenue > 0
  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <View style={s.cardTitleRow}><View style={[s.dot, { backgroundColor: PROVIDER_ACCENT[provider] }]} /><Text style={s.cardTitle}>{PROVIDER_LABEL[provider]}</Text></View>
        <Text style={s.cardMeta}>{formatPerformanceCurrency(t.spend, currency)} spent</Text>
      </View>
      <View style={s.statRow}>
        <Stat label="Impressions" value={formatPerformanceNumber(t.impressions)} />
        <Stat label="Clicks" value={formatPerformanceNumber(t.clicks)} />
        <Stat label="CTR" value={formatPerformancePercent(pct(t.clicks, t.impressions), 2)} />
        <Stat label="CPC" value={div(t.spend, t.clicks) === null ? '—' : formatPerformanceCurrency(t.spend / t.clicks, currency)} />
      </View>
      <View style={s.statRow}>
        <Stat label="CPM" value={div(t.spend, t.impressions) === null ? '—' : formatPerformanceCurrency((t.spend / t.impressions) * 1000, currency)} />
        <Stat label="Conversions*" value={formatPerformanceNumber(t.conversions)} />
        <Stat label="Cost / conv.*" value={div(t.spend, t.conversions) === null ? '—' : formatPerformanceCurrency(t.spend / t.conversions, currency)} />
        <Stat label={hasRevenue ? 'ROAS*' : 'Conv. rate*'} value={hasRevenue ? formatPerformanceRatio(div(t.revenue, t.spend)) : formatPerformancePercent(pct(t.conversions, t.clicks))} />
      </View>
      {campaigns.length ? (
        <Table
          head={['Top campaigns', 'Spend', 'Clicks', 'CTR', 'Conv.*']}
          rows={campaigns.map(c => [trim(c.name), formatPerformanceCurrency(c.spend, currency, true), formatPerformanceNumber(c.clicks), formatPerformancePercent(pct(c.clicks, c.impressions), 2), formatPerformanceNumber(c.conversions)])}
        />
      ) : <Text style={s.empty}>No campaign delivery in this period.</Text>}
    </View>
  )
}

function WebsiteCard({ data }: { data: PerformanceDashboardData }) {
  const currency = data.account!.currency
  const t = totalsFor(data, 'shopify')
  const pixelSessions = data.webDaily.reduce((sum, row) => sum + row.sessions, 0)
  const sessions = t.sessions || pixelSessions
  const sources = topEntities(data.entities, 'traffic_source')
  const pages = topPages(data)
  const shopPageviews = data.daily.filter(row => row.provider === 'shopify').reduce((sum, row) => sum + Number(row.raw.pageviews || 0), 0)
  const pageviews = shopPageviews || data.webDaily.reduce((sum, row) => sum + row.pageviews, 0)
  return (
    <View style={[s.block, { marginBottom: 8 }]}>
      <View style={s.cardHead}>
        <View style={s.cardTitleRow}><View style={[s.dot, { backgroundColor: PROVIDER_ACCENT.shopify }]} /><Text style={s.cardTitle}>{PROVIDER_LABEL.shopify}</Text></View>
        <Text style={s.cardMeta}>{formatPerformanceNumber(sessions)} sessions</Text>
      </View>
      {data.account!.hideStoreSales ? (
        <View style={s.statRow}>
          <Stat label="Sessions" value={formatPerformanceNumber(sessions)} />
          <Stat label="Page views" value={pageviews ? formatPerformanceNumber(pageviews) : '—'} />
          <Stat label="Views / session" value={sessions && pageviews ? (pageviews / sessions).toFixed(2) : '—'} />
          <Stat label="Top source" value={sources[0] ? trim(sources[0].name, 16) : '—'} />
        </View>
      ) : (
        <View style={s.statRow}>
          <Stat label="Sessions" value={formatPerformanceNumber(sessions)} />
          <Stat label="Orders" value={formatPerformanceNumber(t.orders)} />
          <Stat label="Store revenue" value={formatPerformanceCurrency(t.revenue, currency, true)} />
          <Stat label="Conv. rate" value={formatPerformancePercent(pct(t.orders, sessions), 2)} />
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          {sources.length ? (
            <Table head={['Traffic sources', 'Sessions', 'Share']} rows={sources.map(r => [trim(r.name, 30), formatPerformanceNumber(r.sessions), formatPerformancePercent(pct(r.sessions, sessions))])} />
          ) : <Text style={s.empty}>Traffic sources appear after the next Shopify sync.</Text>}
        </View>
        <View style={{ flex: 1 }}>
          {pages.length ? (
            <Table head={['Most visited pages', 'Views', 'Sessions']} rows={pages.map(r => [trim(r.name, 30), formatPerformanceNumber(r.views), formatPerformanceNumber(r.sessions)])} />
          ) : <Text style={s.empty}>Page rankings appear once the BTF pixel collects page views.</Text>}
        </View>
      </View>
    </View>
  )
}

function TrendCard({ data, providers }: { data: PerformanceDashboardData; providers: ReportProvider[] }) {
  const currency = data.account!.currency
  const paid = providers.filter(p => p !== 'shopify')
  const useSpend = paid.length > 0
  const byDate = new Map<string, number>()
  for (const row of data.daily) {
    if (!providers.includes(row.provider as ReportProvider)) continue
    if (useSpend && row.provider === 'shopify') continue
    byDate.set(row.date, (byDate.get(row.date) || 0) + (useSpend ? row.spend : row.sessions))
  }
  const dates = [...byDate.keys()].sort()
  const values = dates.map(d => byDate.get(d) || 0)
  const max = Math.max(...values, 1)
  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <Text style={s.cardTitle}>{useSpend ? 'Daily ad spend' : 'Daily sessions'}</Text>
        <Text style={s.cardMeta}>peak {useSpend ? formatPerformanceCurrency(max, currency) : formatPerformanceNumber(max)}</Text>
      </View>
      {values.length ? (
        <>
          <View style={s.chart}>{values.map((v, i) => <View key={dates[i]} style={{ flex: 1, height: `${Math.max(2, (v / max) * 100)}%`, backgroundColor: useSpend ? PROVIDER_ACCENT[paid[0]] : PROVIDER_ACCENT.shopify, borderRadius: 1 }} />)}</View>
          <View style={s.chartAxis}><Text style={s.cardMeta}>{dates[0]}</Text><Text style={s.cardMeta}>{dates.at(-1)}</Text></View>
        </>
      ) : <Text style={s.empty}>No daily data in this period.</Text>}
    </View>
  )
}

function buildInsights(data: PerformanceDashboardData, providers: ReportProvider[]): string[] {
  const currency = data.account!.currency
  const out: string[] = []
  const { summary, previousSummary } = data
  if (providers.some(p => p !== 'shopify')) {
    const spendDelta = metricDelta(summary.spend, previousSummary.spend)
    if (summary.spend > 0) out.push(`Paid media spent ${formatPerformanceCurrency(summary.spend, currency)}${spendDelta !== null ? ` (${spendDelta >= 0 ? '+' : ''}${spendDelta.toFixed(0)}% vs previous period)` : ''}, reaching ${formatPerformanceNumber(summary.impressions)} impressions at ${formatPerformancePercent(pct(summary.clicks, summary.impressions), 2)} CTR.`)
    else out.push('No paid media spend was recorded in this period. Check campaign delivery and budgets.')
    for (const p of providers.filter((x): x is 'meta' | 'google' => x !== 'shopify')) {
      const best = topCampaigns(data.entities, p, 10).filter(c => c.clicks > 0).sort((a, b) => (b.clicks / Math.max(b.impressions, 1)) - (a.clicks / Math.max(a.impressions, 1)))[0]
      if (best) out.push(`${PROVIDER_LABEL[p]}: "${trim(best.name, 50)}" had the strongest engagement at ${formatPerformancePercent(pct(best.clicks, best.impressions), 2)} CTR.`)
    }
    if (summary.cpa !== null && previousSummary.cpa !== null) {
      const d = metricDelta(summary.cpa, previousSummary.cpa)
      if (d !== null) out.push(`Cost per conversion ${d <= 0 ? 'improved' : 'rose'} ${Math.abs(d).toFixed(0)}% to ${formatPerformanceCurrency(summary.cpa, currency)}.`)
    }
  }
  if (providers.includes('shopify')) {
    const src = topEntities(data.entities, 'traffic_source', 1)[0]
    if (src) out.push(`Top traffic source was ${src.name} with ${formatPerformanceNumber(src.sessions)} sessions.`)
  }
  return out.slice(0, 4)
}

export type PerformanceReportProps = { data: PerformanceDashboardData; logoSrc?: string; generatedAt?: Date }

export function connectedReportProviders(data: PerformanceDashboardData): ReportProvider[] {
  return REPORT_PROVIDERS.filter(p => data.connections.some(c => c.provider === p && c.status !== 'disconnected'))
}

export function PerformanceReportDocument({ data, logoSrc, generatedAt = new Date() }: PerformanceReportProps) {
  const account = data.account!
  const currency = account.currency
  const providers = connectedReportProviders(data)
  const paid = providers.filter((p): p is 'meta' | 'google' => p !== 'shopify')
  const hasShop = providers.includes('shopify')
  const { summary, previousSummary } = data
  const dates = data.daily.map(row => row.date).sort()
  const end = new Date(generatedAt)
  const start = new Date(end.getTime() - (data.rangeDays - 1) * 86_400_000)
  const fmt = (d: Date) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
  const period = `${fmt(dates[0] ? new Date(dates[0]) : start)} – ${fmt(end)} · last ${data.rangeDays} days`
  const shopTotals = totalsFor(data, 'shopify')
  const shopSessions = shopTotals.sessions || data.webDaily.reduce((sum, row) => sum + row.sessions, 0)
  const insights = buildInsights(data, providers)

  const kpis: Array<{ label: string; value: string; delta?: number | null; inverse?: boolean; sub?: string }> = []
  if (paid.length) {
    kpis.push({ label: 'Ad spend', value: formatPerformanceCurrency(summary.spend, currency), delta: metricDelta(summary.spend, previousSummary.spend), inverse: true })
    kpis.push({ label: 'Impressions', value: formatPerformanceNumber(summary.impressions), delta: metricDelta(summary.impressions, previousSummary.impressions) })
    kpis.push({ label: 'Clicks', value: formatPerformanceNumber(summary.clicks), delta: metricDelta(summary.clicks, previousSummary.clicks) })
    kpis.push({ label: 'Conversions*', value: formatPerformanceNumber(summary.conversions), delta: metricDelta(summary.conversions, previousSummary.conversions) })
  }
  if (hasShop) {
    kpis.push({ label: 'Website sessions', value: formatPerformanceNumber(shopSessions), sub: 'Shopify · human sessions' })
    if (kpis.length < 5 && !account.hideStoreSales) kpis.push({ label: 'Store revenue', value: formatPerformanceCurrency(summary.revenue, currency, true), delta: metricDelta(summary.revenue, previousSummary.revenue) })
  }

  return (
    <Document title={`${account.displayName} performance report`} author="Below The Fold">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {logoSrc ? <PdfImage src={logoSrc} style={s.logo} /> : <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 12 }}>belowthefold</Text>}
          <View style={s.headRight}>
            <Text style={s.eyebrow}>Performance report</Text>
            <Text style={s.client}>{account.displayName}</Text>
            <Text style={s.period}>{period}</Text>
          </View>
        </View>
        <View style={s.rule} />

        {providers.length === 0 ? (
          <Text style={s.empty}>No data sources are connected for this client yet. Connect Meta, Google Ads or Shopify in Performance integrations.</Text>
        ) : (
          <>
            <View style={s.kpiRow}>{kpis.slice(0, 5).map((k, i) => <Kpi key={k.label} {...k} dark={i === 0} />)}</View>

            {paid.length ? (
              <View style={s.grid}>{paid.map(p => <AdsCard key={p} data={data} provider={p} />)}</View>
            ) : null}

            {hasShop ? <WebsiteCard data={data} /> : null}

            <View style={s.grid}>
              <TrendCard data={data} providers={providers} />
              {insights.length ? (
                <View style={[s.card, { flex: 1.3 }]}>
                  <Text style={[s.cardTitle, { marginBottom: 3 }]}>Highlights</Text>
                  {insights.map((text, i) => (
                    <View key={i} style={s.insightRow}><Text style={s.insightNum}>{String(i + 1).padStart(2, '0')}</Text><Text style={s.insightText}>{text}</Text></View>
                  ))}
                </View>
              ) : null}
            </View>
          </>
        )}

        <View style={s.footer} fixed>
          <Text>Sources: {providers.map(p => PROVIDER_LABEL[p]).join(' · ') || 'none connected'} · * platform-attributed{account.hideStoreSales ? '' : ', not added to store revenue'}</Text>
          <Text>Generated {fmt(generatedAt)} · belowthefold.gr</Text>
        </View>
      </Page>
    </Document>
  )
}
