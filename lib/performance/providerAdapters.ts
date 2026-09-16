import 'server-only'

import type {
  GoogleCredentials, KlaviyoCredentials, MetaCredentials, PerformanceProvider,
  ProviderCredentials, ProviderEntitySyncRow, ProviderSyncResult, ProviderSyncRow,
  ShopifyCredentials,
} from './types'

type JsonObject = Record<string, unknown>
const n = (value: unknown) => { const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? parsed : 0 }
const cleanId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '')
const isoDate = (date: Date) => date.toISOString().slice(0, 10)
const startOfDay = (value: string) => `${value}T00:00:00Z`
const endOfDay = (value: string) => `${value}T23:59:59Z`
const addDays = (value: string, days: number) => { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return isoDate(date) }

async function responseJson(response: Response, provider: string): Promise<JsonObject> {
  const payload = (await response.json().catch(() => ({}))) as JsonObject
  if (!response.ok) {
    const nested = payload.error as JsonObject | undefined
    const errors = payload.errors as Array<{ detail?: string; message?: string; title?: string }> | undefined
    throw new Error((typeof nested?.message === 'string' && nested.message) || (typeof payload.message === 'string' && payload.message) || errors?.[0]?.detail || errors?.[0]?.message || errors?.[0]?.title || `${provider} returned ${response.status}`)
  }
  return payload
}

function emptyDaily(date: string, currency: string): ProviderSyncRow {
  return { date, revenue: 0, spend: 0, orders: 0, conversions: 0, impressions: 0, clicks: 0, sessions: 0, newCustomers: 0, currency, raw: {} }
}

function emptyEntity(date: string, currency: string, entityType: ProviderEntitySyncRow['entityType'], entityId: string, entityName: string): ProviderEntitySyncRow {
  return { date, entityType, entityId, entityName, parentId: null, parentName: null, revenue: 0, spend: 0, orders: 0, conversions: 0, impressions: 0, clicks: 0, sessions: 0, delivered: 0, opens: 0, unsubscribes: 0, currency, raw: {} }
}

function mergeEntity(map: Map<string, ProviderEntitySyncRow>, next: ProviderEntitySyncRow) {
  const key = `${next.date}:${next.entityType}:${next.entityId}`
  const current = map.get(key)
  if (!current) { map.set(key, next); return }
  for (const key of ['revenue', 'spend', 'orders', 'conversions', 'impressions', 'clicks', 'sessions', 'delivered', 'opens', 'unsubscribes'] as const) current[key] += next[key]
  current.raw = { ...current.raw, ...next.raw }
}

async function shopifyGraphql(endpoint: string, token: string, query: string, variables: JsonObject) {
  const payload = await responseJson(await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query, variables }), cache: 'no-store' }), 'Shopify')
  const errors = payload.errors as Array<{ message?: string }> | undefined
  if (errors?.length) throw new Error(errors.map(error => error.message).filter(Boolean).join('; ') || 'Shopify GraphQL error')
  return payload.data as JsonObject
}

const SHOPIFYQL_QUERY = `query PerformanceShopifyQL($query: String!) { shopifyqlQuery(query: $query) { tableData { rows } parseErrors } }`

async function shopifyQlRows(endpoint: string, token: string, query: string) {
  const data = await shopifyGraphql(endpoint, token, SHOPIFYQL_QUERY, { query })
  const result = (data.shopifyqlQuery as JsonObject | null) || {}
  const parseErrors = (result.parseErrors as unknown[]) || []
  if (parseErrors.length) {
    throw new Error(parseErrors.map(error => typeof error === 'string' ? error : JSON.stringify(error)).join('; ') || 'ShopifyQL parse error')
  }
  const tableData = (result.tableData as JsonObject | null) || {}
  return ((tableData.rows as JsonObject[]) || [])
}

function shopifyQlValue(row: JsonObject, ...names: string[]) {
  for (const name of names) if (row[name] !== undefined && row[name] !== null) return row[name]
  return null
}

const SHOPIFY_BASE_QUERY = `query PerformanceOrders($after: String, $query: String!) { shop { currencyCode } orders(first: 250, after: $after, sortKey: CREATED_AT, query: $query) { nodes { id createdAt currentTotalPriceSet { shopMoney { amount currencyCode } } customer { numberOfOrders } } pageInfo { hasNextPage endCursor } } }`
const SHOPIFY_DETAIL_QUERY = `query PerformanceOrders($after: String, $query: String!) { shop { currencyCode } orders(first: 100, after: $after, sortKey: CREATED_AT, query: $query) { nodes { id createdAt currentTotalPriceSet { shopMoney { amount currencyCode } } customer { numberOfOrders } customerJourneySummary { firstVisit { landingPage referrerUrl source sourceDescription sourceType utmParameters { campaign content medium source term } } lastVisit { landingPage referrerUrl source sourceDescription sourceType utmParameters { campaign content medium source term } } } lineItems(first: 100) { nodes { id name currentQuantity discountedTotalSet { shopMoney { amount currencyCode } } product { id title handle } } } refunds { refundLineItems(first: 100) { nodes { subtotalSet { shopMoney { amount currencyCode } } lineItem { product { id title handle } } } } } } pageInfo { hasNextPage endCursor } } }`

async function shopifyRows(credentials: ShopifyCredentials, start: string, end: string): Promise<ProviderSyncResult> {
  const shop = credentials.shop.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (!/^[a-z0-9][a-z0-9.-]*\.myshopify\.com$/i.test(shop)) throw new Error('Use the permanent Shopify domain, for example store.myshopify.com')
  const endpoint = `https://${shop}/admin/api/${credentials.apiVersion?.trim() || '2026-07'}/graphql.json`
  const filter = `created_at:>=${startOfDay(start)} created_at:<${startOfDay(addDays(end, 1))} status:any test:false`
  const byDate = new Map<string, ProviderSyncRow>(), entityMap = new Map<string, ProviderEntitySyncRow>(), warnings: string[] = []
  let detailed = true, after: string | null = null, pages = 0
  do {
    let data: JsonObject
    try { data = await shopifyGraphql(endpoint, credentials.accessToken, detailed ? SHOPIFY_DETAIL_QUERY : SHOPIFY_BASE_QUERY, { after, query: filter }) }
    catch (error) {
      if (pages || !detailed) throw error
      detailed = false; after = null
      warnings.push('Product detail needs Shopify read_products permission and app re-authorization.')
      data = await shopifyGraphql(endpoint, credentials.accessToken, SHOPIFY_BASE_QUERY, { after, query: filter })
    }
    const shopData = data.shop as JsonObject, orders = data.orders as JsonObject, currency = String(shopData.currencyCode || 'EUR')
    for (const order of (orders.nodes as JsonObject[]) || []) {
      const date = String(order.createdAt).slice(0, 10), money = ((order.currentTotalPriceSet as JsonObject)?.shopMoney as JsonObject) || {}, customer = (order.customer as JsonObject | null) || {}
      const daily = byDate.get(date) || emptyDaily(date, currency)
      daily.revenue += n(money.amount); daily.orders += 1; daily.conversions += 1; if (n(customer.numberOfOrders) === 1) daily.newCustomers += 1; byDate.set(date, daily)
      if (!detailed) continue

      const refunded = new Map<string, number>()
      for (const refund of (order.refunds as JsonObject[]) || []) for (const line of ((((refund.refundLineItems as JsonObject)?.nodes as JsonObject[]) || []))) {
        const product = ((line.lineItem as JsonObject)?.product as JsonObject | null) || {}, productId = String(product.id || ''), subtotal = ((line.subtotalSet as JsonObject)?.shopMoney as JsonObject) || {}
        if (productId) refunded.set(productId, (refunded.get(productId) || 0) + n(subtotal.amount))
      }
      const seenProducts = new Set<string>()
      for (const line of ((((order.lineItems as JsonObject)?.nodes as JsonObject[]) || []))) {
        const product = (line.product as JsonObject | null) || {}, productId = String(product.id || line.id || line.name), lineMoney = ((line.discountedTotalSet as JsonObject)?.shopMoney as JsonObject) || {}
        const entity = emptyEntity(date, currency, 'product', productId, String(product.title || line.name || 'Deleted product'))
        entity.revenue = Math.max(0, n(lineMoney.amount) - (refunded.get(productId) || 0)); entity.orders = seenProducts.has(productId) ? 0 : 1; entity.conversions = n(line.currentQuantity); entity.raw = { handle: product.handle || null, units: n(line.currentQuantity) }
        seenProducts.add(productId)
        mergeEntity(entityMap, entity); refunded.delete(productId)
      }
    }
    const pageInfo = orders.pageInfo as JsonObject; after = pageInfo.hasNextPage ? String(pageInfo.endCursor) : null; pages += 1
  } while (after && pages < 40)

  const currency = byDate.values().next().value?.currency || 'EUR'
  if (credentials.scopes?.length && !credentials.scopes.includes('read_reports')) {
    warnings.push('Traffic, funnel, and Shopify attribution need read_reports plus Shopify protected customer data Level 2. Reauthorize after approving both.')
  } else {
    try {
      const [funnelRows, sourceRows, attributionRows] = await Promise.all([
        shopifyQlRows(endpoint, credentials.accessToken, `FROM sessions SHOW sessions, online_store_visitors, pageviews, sessions_with_cart_additions, sessions_that_reached_checkout, sessions_that_completed_checkout, conversion_rate WHERE human_or_bot_session = 'human' TIMESERIES day SINCE ${start} UNTIL ${end} ORDER BY day ASC`),
        shopifyQlRows(endpoint, credentials.accessToken, `FROM sessions SHOW sessions, sessions_with_cart_additions, sessions_that_reached_checkout, sessions_that_completed_checkout, conversion_rate WHERE human_or_bot_session = 'human' GROUP BY referrer_source TIMESERIES day SINCE ${start} UNTIL ${end} ORDER BY sessions DESC LIMIT 1000`),
        shopifyQlRows(endpoint, credentials.accessToken, `FROM sales SHOW net_sales AS revenue, orders GROUP BY referring_channel TIMESERIES day WITH FIRST_CLICK_ATTRIBUTION, LAST_CLICK_ATTRIBUTION SINCE ${start} UNTIL ${end} ORDER BY revenue__last_click DESC LIMIT 1000`),
      ])

      for (const row of funnelRows) {
        const date = String(shopifyQlValue(row, 'day') || '').slice(0, 10)
        if (!date) continue
        const daily = byDate.get(date) || emptyDaily(date, currency)
        daily.sessions = n(shopifyQlValue(row, 'sessions'))
        daily.raw = {
          ...daily.raw,
          analyticsSource: 'shopifyql_sessions',
          visitors: n(shopifyQlValue(row, 'online_store_visitors')),
          pageviews: n(shopifyQlValue(row, 'pageviews')),
          cartSessions: n(shopifyQlValue(row, 'sessions_with_cart_additions')),
          checkoutSessions: n(shopifyQlValue(row, 'sessions_that_reached_checkout')),
          purchaseSessions: n(shopifyQlValue(row, 'sessions_that_completed_checkout')),
          sessionConversionRate: n(shopifyQlValue(row, 'conversion_rate')),
        }
        byDate.set(date, daily)
      }

      for (const row of sourceRows) {
        const date = String(shopifyQlValue(row, 'day') || '').slice(0, 10)
        if (!date) continue
        const source = String(shopifyQlValue(row, 'referrer_source') || 'Direct / unknown')
        const entity = emptyEntity(date, currency, 'traffic_source', source.toLowerCase(), source)
        entity.sessions = n(shopifyQlValue(row, 'sessions'))
        entity.conversions = n(shopifyQlValue(row, 'sessions_that_completed_checkout'))
        entity.raw = {
          cartSessions: n(shopifyQlValue(row, 'sessions_with_cart_additions')),
          checkoutSessions: n(shopifyQlValue(row, 'sessions_that_reached_checkout')),
          conversionRate: n(shopifyQlValue(row, 'conversion_rate')),
          attribution: 'session_source',
        }
        mergeEntity(entityMap, entity)
      }

      for (const row of attributionRows) {
        const date = String(shopifyQlValue(row, 'day') || '').slice(0, 10)
        if (!date) continue
        const channel = String(shopifyQlValue(row, 'referring_channel') || 'Direct / unknown')
        const entity = emptyEntity(date, currency, 'marketing_channel', channel.toLowerCase(), channel)
        entity.revenue = n(shopifyQlValue(row, 'revenue__last_click', 'net_sales__last_click'))
        entity.orders = n(shopifyQlValue(row, 'orders__last_click'))
        entity.conversions = entity.orders
        entity.raw = {
          firstClickRevenue: n(shopifyQlValue(row, 'revenue__first_click', 'net_sales__first_click')),
          firstClickOrders: n(shopifyQlValue(row, 'orders__first_click')),
          attribution: 'shopify_last_click',
        }
        mergeEntity(entityMap, entity)
      }
    } catch (cause) {
      warnings.push(`Shopify analytics unavailable: ${cause instanceof Error ? cause.message : 'ShopifyQL query failed'}`)
    }
  }
  return { daily: [...byDate.values()], entities: [...entityMap.values()], warnings }
}

function actionValue(items: unknown, names: string[]) {
  const values = ((items as Array<{ action_type?: string; value?: string }>) || []).filter(item => item.action_type && names.includes(item.action_type)).map(item => n(item.value))
  return values.length ? Math.max(...values) : 0
}

async function metaInsights(credentials: MetaCredentials, start: string, end: string, level: 'account' | 'ad') {
  const account = cleanId(credentials.adAccountId.replace(/^act_/, '')), url = new URL(`https://graph.facebook.com/${credentials.graphVersion?.trim() || 'v26.0'}/act_${account}/insights`)
  url.searchParams.set('level', level); url.searchParams.set('time_increment', '1'); url.searchParams.set('limit', '500')
  url.searchParams.set('fields', level === 'ad' ? 'date_start,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,spend,impressions,clicks,actions,action_values,account_currency' : 'date_start,spend,impressions,clicks,actions,action_values,account_currency')
  url.searchParams.set('time_range', JSON.stringify({ since: start, until: end }))
  const data: JsonObject[] = []
  let next: string | null = url.toString(), pages = 0
  while (next && pages < 20) {
    const payload = await responseJson(await fetch(next, { headers: { Authorization: `Bearer ${credentials.accessToken}` }, cache: 'no-store' }), 'Meta')
    data.push(...((payload.data as JsonObject[]) || []))
    const paging = (payload.paging as JsonObject | undefined) || {}
    next = typeof paging.next === 'string' ? paging.next : null
    pages += 1
  }
  return { data }
}

async function metaRows(credentials: MetaCredentials, start: string, end: string): Promise<ProviderSyncResult> {
  const [accountPayload, adPayload] = await Promise.all([metaInsights(credentials, start, end, 'account'), metaInsights(credentials, start, end, 'ad')]), purchases = ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase']
  return {
    daily: ((accountPayload.data as JsonObject[]) || []).map(row => ({ ...emptyDaily(String(row.date_start), String(row.account_currency || 'EUR')), revenue: actionValue(row.action_values, purchases), spend: n(row.spend), conversions: actionValue(row.actions, purchases), impressions: n(row.impressions), clicks: n(row.clicks), raw: { source: 'account_insights', attribution: 'meta' } })),
    entities: ((adPayload.data as JsonObject[]) || []).map(row => ({ ...emptyEntity(String(row.date_start), String(row.account_currency || 'EUR'), 'ad', String(row.ad_id), String(row.ad_name || row.ad_id)), parentId: String(row.campaign_id || ''), parentName: String(row.campaign_name || ''), revenue: actionValue(row.action_values, purchases), spend: n(row.spend), conversions: actionValue(row.actions, purchases), impressions: n(row.impressions), clicks: n(row.clicks), raw: { adSetId: row.adset_id || null, adSetName: row.adset_name || null, attribution: 'meta' } })),
  }
}

async function googleAccessToken(credentials: GoogleCredentials) {
  const payload = await responseJson(await fetch('https://www.googleapis.com/oauth2/v3/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', client_id: credentials.clientId, client_secret: credentials.clientSecret, refresh_token: credentials.refreshToken }), cache: 'no-store' }), 'Google OAuth')
  if (typeof payload.access_token !== 'string') throw new Error('Google did not return an access token'); return payload.access_token
}

async function googleQuery(credentials: GoogleCredentials, query: string) {
  const headers: Record<string, string> = { Authorization: `Bearer ${await googleAccessToken(credentials)}`, 'Content-Type': 'application/json' }
  if (credentials.developerToken) headers['developer-token'] = credentials.developerToken
  if (credentials.loginCustomerId) headers['login-customer-id'] = cleanId(credentials.loginCustomerId.replace(/-/g, ''))
  const customerId = cleanId(credentials.customerId.replace(/-/g, '')), raw = await responseJson(await fetch(`https://googleads.googleapis.com/${credentials.apiVersion?.trim() || 'v25'}/customers/${customerId}/googleAds:searchStream`, { method: 'POST', headers, body: JSON.stringify({ query }), cache: 'no-store' }), 'Google Ads')
  return (Array.isArray(raw) ? raw : [raw]).flatMap(chunk => ((chunk as JsonObject).results as JsonObject[]) || [])
}

async function googleRows(credentials: GoogleCredentials, start: string, end: string): Promise<ProviderSyncResult> {
  const [dailyRows, adRows] = await Promise.all([
    googleQuery(credentials, `SELECT segments.date, customer.currency_code, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM customer WHERE segments.date BETWEEN '${start}' AND '${end}' ORDER BY segments.date`),
    googleQuery(credentials, `SELECT segments.date, customer.currency_code, campaign.id, campaign.name, ad_group.id, ad_group.name, ad_group_ad.ad.id, ad_group_ad.ad.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM ad_group_ad WHERE segments.date BETWEEN '${start}' AND '${end}'`),
  ])
  return {
    daily: dailyRows.map(row => { const segments = (row.segments as JsonObject) || {}, metrics = (row.metrics as JsonObject) || {}, customer = (row.customer as JsonObject) || {}; return { ...emptyDaily(String(segments.date), String(customer.currencyCode || 'EUR')), revenue: n(metrics.conversionsValue), spend: n(metrics.costMicros) / 1_000_000, conversions: n(metrics.conversions), impressions: n(metrics.impressions), clicks: n(metrics.clicks), raw: { attribution: 'google' } } }),
    entities: adRows.map(row => { const segments = (row.segments as JsonObject) || {}, metrics = (row.metrics as JsonObject) || {}, customer = (row.customer as JsonObject) || {}, campaign = (row.campaign as JsonObject) || {}, adGroup = (row.adGroup as JsonObject) || {}, ad = ((row.adGroupAd as JsonObject)?.ad as JsonObject) || {}; return { ...emptyEntity(String(segments.date), String(customer.currencyCode || 'EUR'), 'ad', String(ad.id), String(ad.name || `Ad ${ad.id}`)), parentId: String(campaign.id || ''), parentName: String(campaign.name || ''), revenue: n(metrics.conversionsValue), spend: n(metrics.costMicros) / 1_000_000, conversions: n(metrics.conversions), impressions: n(metrics.impressions), clicks: n(metrics.clicks), raw: { adGroupId: adGroup.id || null, adGroupName: adGroup.name || null, attribution: 'google' } } }),
  }
}

async function klaviyoReport(headers: Record<string, string>, endpoint: 'campaign' | 'flow', metricId: string, start: string, end: string) {
  const type = `${endpoint}-values-report`, attributes: JsonObject = { statistics: ['recipients', 'delivered', 'opens_unique', 'open_rate', 'clicks_unique', 'click_rate', 'conversions', 'conversion_rate', 'conversion_value', 'revenue_per_recipient', 'unsubscribe_uniques', 'unsubscribe_rate', 'bounce_rate'], timeframe: { start: startOfDay(start), end: endOfDay(end) }, conversion_metric_id: metricId, group_by: endpoint === 'campaign' ? ['campaign_id', 'campaign_message_id', 'campaign_message_name', 'send_channel'] : ['flow_id', 'flow_name', 'flow_message_id', 'flow_message_name', 'send_channel'] }
  if (endpoint === 'campaign') attributes.filter = 'equals(send_channel,"email")'
  return responseJson(await fetch(`https://a.klaviyo.com/api/${endpoint}-values-reports/`, { method: 'POST', headers, body: JSON.stringify({ data: { type, attributes } }), cache: 'no-store' }), `Klaviyo ${endpoint} reporting`)
}

function reportEntities(payload: JsonObject, endpoint: 'campaign' | 'flow', currency: string, date: string): ProviderEntitySyncRow[] {
  const attrs = ((payload.data as JsonObject)?.attributes as JsonObject) || {}, results = (attrs.results as JsonObject[]) || []
  return results.map((result, index) => {
    const group = (result.groupings as JsonObject) || {}, stats = (result.statistics as JsonObject) || {}, id = String(group[`${endpoint}_message_id`] || group[`${endpoint}_id`] || index), name = String(group[`${endpoint}_message_name`] || group[`${endpoint}_name`] || `${endpoint} ${id}`)
    return { ...emptyEntity(date, currency, endpoint === 'campaign' ? 'klaviyo_campaign' : 'klaviyo_flow', id, name), parentId: String(group[`${endpoint}_id`] || '') || null, parentName: String(group[`${endpoint}_name`] || '') || null, revenue: n(stats.conversion_value), conversions: n(stats.conversions), impressions: n(stats.recipients), clicks: n(stats.clicks_unique), delivered: n(stats.delivered), opens: n(stats.opens_unique), unsubscribes: n(stats.unsubscribe_uniques), raw: { ...stats, sendChannel: group.send_channel || 'email', attribution: 'klaviyo', reportingWindow: '30d' } }
  })
}

async function klaviyoRows(credentials: KlaviyoCredentials, start: string, end: string): Promise<ProviderSyncResult> {
  const headers = { Authorization: `Klaviyo-API-Key ${credentials.privateApiKey}`, accept: 'application/json', 'content-type': 'application/json', revision: credentials.revision?.trim() || '2026-07-15' }, metricUrl = new URL('https://a.klaviyo.com/api/metrics/')
  metricUrl.searchParams.set('filter', 'equals(integration.name,"Shopify")'); metricUrl.searchParams.set('fields[metric]', 'name,integration')
  const metricPayload = await responseJson(await fetch(metricUrl, { headers, cache: 'no-store' }), 'Klaviyo'), metric = ((metricPayload.data as JsonObject[]) || []).find(item => { const attrs = item.attributes as JsonObject, integration = attrs?.integration as JsonObject; return attrs?.name === 'Placed Order' && integration?.name === 'Shopify' })
  if (!metric?.id) throw new Error('Klaviyo does not expose a Placed Order metric')
  const aggregate = await responseJson(await fetch('https://a.klaviyo.com/api/metric-aggregates/', { method: 'POST', headers, body: JSON.stringify({ data: { type: 'metric-aggregate', attributes: { measurements: ['count', 'sum_value'], filter: [`greater-or-equal(datetime,${startOfDay(start)})`, `less-than(datetime,${startOfDay(addDays(end, 1))})`], metric_id: String(metric.id), interval: 'day', page_size: 500, timezone: credentials.timezone?.trim() || 'Europe/Athens' } } }), cache: 'no-store' }), 'Klaviyo')
  const attrs = ((aggregate.data as JsonObject)?.attributes as JsonObject) || {}, dates = (attrs.dates as string[]) || [], series = ((attrs.data as JsonObject[]) || [])[0] || {}, measures = (series.measurements as JsonObject) || {}, counts = (measures.count as unknown[]) || [], values = (measures.sum_value as unknown[]) || []
  const daily = dates.map((date, index) => ({ ...emptyDaily(String(date).slice(0, 10), ''), revenue: n(values[index]), conversions: n(counts[index]), raw: { metricId: String(metric.id), attribution: 'klaviyo' } })), entities: ProviderEntitySyncRow[] = [], warnings: string[] = []
  for (const endpoint of ['campaign', 'flow'] as const) {
    try { entities.push(...reportEntities(await klaviyoReport(headers, endpoint, String(metric.id), start, end), endpoint, '', end)) }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Reporting request failed'
      warnings.push(`${endpoint === 'campaign' ? 'Newsletter' : 'Flow'} reporting: ${message}`)
    }
  }
  return { daily, entities, warnings }
}

export async function syncProviderMetrics(provider: PerformanceProvider, credentials: ProviderCredentials, start: string, end: string): Promise<ProviderSyncResult> {
  switch (provider) { case 'shopify': return shopifyRows(credentials as ShopifyCredentials, start, end); case 'meta': return metaRows(credentials as MetaCredentials, start, end); case 'google': return googleRows(credentials as GoogleCredentials, start, end); case 'klaviyo': return klaviyoRows(credentials as KlaviyoCredentials, start, end) }
}

export async function testProviderConnection(provider: PerformanceProvider, credentials: ProviderCredentials) {
  const end = isoDate(new Date()), start = new Date(); start.setUTCDate(start.getUTCDate() - 1); await syncProviderMetrics(provider, credentials, isoDate(start), end)
}
