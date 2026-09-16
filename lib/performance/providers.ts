import 'server-only'

import type {
  GoogleCredentials,
  KlaviyoCredentials,
  MetaCredentials,
  PerformanceProvider,
  ProviderCredentials,
  ProviderSyncRow,
  ShopifyCredentials,
} from './types'

type JsonObject = Record<string, unknown>

function number(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function cleanId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '')
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function startOfDay(value: string) {
  return `${value}T00:00:00Z`
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return isoDate(date)
}

async function responseJson(response: Response, provider: string): Promise<JsonObject> {
  const payload = (await response.json().catch(() => ({}))) as JsonObject
  if (!response.ok) {
    const nested = payload.error as JsonObject | undefined
    const errors = payload.errors as Array<{ detail?: string; message?: string; title?: string }> | undefined
    const message =
      (typeof nested?.message === 'string' && nested.message) ||
      (typeof payload.message === 'string' && payload.message) ||
      errors?.[0]?.detail ||
      errors?.[0]?.message ||
      errors?.[0]?.title ||
      `${provider} returned ${response.status}`
    throw new Error(message)
  }
  return payload
}

async function shopifyRows(credentials: ShopifyCredentials, start: string, end: string) {
  const shop = credentials.shop
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
  if (!/^[a-z0-9][a-z0-9.-]*\.myshopify\.com$/i.test(shop)) {
    throw new Error('Use the permanent Shopify domain, for example store.myshopify.com')
  }

  const version = credentials.apiVersion?.trim() || '2026-07'
  const endpoint = `https://${shop}/admin/api/${version}/graphql.json`
  const query = `
    query PerformanceOrders($after: String, $query: String!) {
      shop { name currencyCode }
      orders(first: 250, after: $after, sortKey: CREATED_AT, query: $query) {
        nodes {
          id
          createdAt
          currentTotalPriceSet { shopMoney { amount currencyCode } }
          customer { numberOfOrders }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `

  const byDate = new Map<string, ProviderSyncRow>()
  let after: string | null = null
  let pages = 0

  do {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': credentials.accessToken,
      },
      body: JSON.stringify({
        query,
        variables: {
          after,
          query: `created_at:>=${startOfDay(start)} created_at:<${startOfDay(addDays(end, 1))} status:any test:false`,
        },
      }),
      cache: 'no-store',
    })
    const payload = await responseJson(response, 'Shopify')
    const graphErrors = payload.errors as Array<{ message?: string }> | undefined
    if (graphErrors?.length) throw new Error(graphErrors[0]?.message || 'Shopify GraphQL error')

    const data = payload.data as JsonObject
    const shopData = data.shop as JsonObject
    const orders = data.orders as JsonObject
    const currency = String(shopData.currencyCode || 'EUR')
    for (const rawOrder of (orders.nodes as JsonObject[]) || []) {
      const date = String(rawOrder.createdAt).slice(0, 10)
      const money = ((rawOrder.currentTotalPriceSet as JsonObject)?.shopMoney as JsonObject) || {}
      const customer = (rawOrder.customer as JsonObject | null) || {}
      const current = byDate.get(date) || {
        date,
        revenue: 0,
        spend: 0,
        orders: 0,
        conversions: 0,
        impressions: 0,
        clicks: 0,
        sessions: 0,
        newCustomers: 0,
        currency,
      }
      current.revenue += number(money.amount)
      current.orders += 1
      current.conversions += 1
      if (number(customer.numberOfOrders) === 1) current.newCustomers += 1
      byDate.set(date, current)
    }

    const pageInfo = orders.pageInfo as JsonObject
    after = pageInfo.hasNextPage ? String(pageInfo.endCursor) : null
    pages += 1
  } while (after && pages < 20)

  return [...byDate.values()]
}

function actionValue(items: unknown, names: string[]) {
  const values = ((items as Array<{ action_type?: string; value?: string }>) || [])
    .filter(item => item.action_type && names.includes(item.action_type))
    .map(item => number(item.value))
  return values.length ? Math.max(...values) : 0
}

async function metaRows(credentials: MetaCredentials, start: string, end: string) {
  const account = cleanId(credentials.adAccountId.replace(/^act_/, ''))
  const version = credentials.graphVersion?.trim() || 'v26.0'
  const url = new URL(`https://graph.facebook.com/${version}/act_${account}/insights`)
  url.searchParams.set('level', 'account')
  url.searchParams.set('time_increment', '1')
  url.searchParams.set('limit', '100')
  url.searchParams.set('fields', 'date_start,spend,impressions,clicks,actions,action_values,account_currency')
  url.searchParams.set('time_range', JSON.stringify({ since: start, until: end }))

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${credentials.accessToken}` },
    cache: 'no-store',
  })
  const payload = await responseJson(response, 'Meta')
  const purchaseNames = [
    'purchase',
    'omni_purchase',
    'offsite_conversion.fb_pixel_purchase',
  ]

  return ((payload.data as JsonObject[]) || []).map(row => ({
    date: String(row.date_start),
    revenue: actionValue(row.action_values, purchaseNames),
    spend: number(row.spend),
    orders: 0,
    conversions: actionValue(row.actions, purchaseNames),
    impressions: number(row.impressions),
    clicks: number(row.clicks),
    sessions: 0,
    newCustomers: 0,
    currency: String(row.account_currency || 'EUR'),
    raw: { source: 'account_insights' },
  }))
}

async function googleAccessToken(credentials: GoogleCredentials) {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
    }),
    cache: 'no-store',
  })
  const payload = await responseJson(response, 'Google OAuth')
  if (typeof payload.access_token !== 'string') throw new Error('Google did not return an access token')
  return payload.access_token
}

async function googleRows(credentials: GoogleCredentials, start: string, end: string) {
  const accessToken = await googleAccessToken(credentials)
  const customerId = cleanId(credentials.customerId.replace(/-/g, ''))
  const version = credentials.apiVersion?.trim() || 'v25'
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
  if (credentials.developerToken) headers['developer-token'] = credentials.developerToken
  if (credentials.loginCustomerId) {
    headers['login-customer-id'] = cleanId(credentials.loginCustomerId.replace(/-/g, ''))
  }

  const response = await fetch(
    `https://googleads.googleapis.com/${version}/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: `
          SELECT
            segments.date,
            customer.currency_code,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.conversions_value
          FROM customer
          WHERE segments.date BETWEEN '${start}' AND '${end}'
          ORDER BY segments.date
        `,
      }),
      cache: 'no-store',
    }
  )
  const raw = await responseJson(response, 'Google Ads')
  const chunks = Array.isArray(raw) ? raw : [raw]
  const rows = chunks.flatMap(chunk => ((chunk as JsonObject).results as JsonObject[]) || [])
  return rows.map(row => {
    const segments = (row.segments as JsonObject) || {}
    const metrics = (row.metrics as JsonObject) || {}
    const customer = (row.customer as JsonObject) || {}
    return {
      date: String(segments.date),
      revenue: number(metrics.conversionsValue),
      spend: number(metrics.costMicros) / 1_000_000,
      orders: 0,
      conversions: number(metrics.conversions),
      impressions: number(metrics.impressions),
      clicks: number(metrics.clicks),
      sessions: 0,
      newCustomers: 0,
      currency: String(customer.currencyCode || 'EUR'),
      raw: { source: 'google_ads_search_stream' },
    }
  })
}

async function klaviyoRows(credentials: KlaviyoCredentials, start: string, end: string) {
  const revision = credentials.revision?.trim() || '2026-07-15'
  const headers = {
    Authorization: `Klaviyo-API-Key ${credentials.privateApiKey}`,
    accept: 'application/json',
    'content-type': 'application/json',
    revision,
  }
  const metricUrl = new URL('https://a.klaviyo.com/api/metrics/')
  metricUrl.searchParams.set('filter', 'equals(integration.name,"Shopify")')
  metricUrl.searchParams.set('fields[metric]', 'name,integration')
  const metricPayload = await responseJson(
    await fetch(metricUrl, { headers, cache: 'no-store' }),
    'Klaviyo'
  )
  const metrics = (metricPayload.data as JsonObject[]) || []
  const metric = metrics.find(item => {
    const attrs = item.attributes as JsonObject
    const integration = attrs?.integration as JsonObject
    return attrs?.name === 'Placed Order' && integration?.name === 'Shopify'
  })
  if (!metric?.id) throw new Error('Klaviyo does not expose a Placed Order metric')

  const aggregatePayload = await responseJson(
    await fetch('https://a.klaviyo.com/api/metric-aggregates/', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        data: {
          type: 'metric-aggregate',
          attributes: {
            measurements: ['count', 'sum_value'],
            filter: [
              `greater-or-equal(datetime,${startOfDay(start)})`,
              `less-than(datetime,${startOfDay(addDays(end, 1))})`,
            ],
            metric_id: String(metric.id),
            interval: 'day',
            page_size: 500,
            timezone: credentials.timezone?.trim() || 'Europe/Athens',
          },
        },
      }),
      cache: 'no-store',
    }),
    'Klaviyo'
  )

  const data = aggregatePayload.data as JsonObject
  const attrs = (data?.attributes as JsonObject) || {}
  const dates = (attrs.dates as string[]) || []
  const series = ((attrs.data as JsonObject[]) || [])[0] || {}
  const measurements = (series.measurements as JsonObject) || {}
  const counts = (measurements.count as unknown[]) || []
  const values = (measurements.sum_value as unknown[]) || []

  return dates.map((date, index) => ({
    date: String(date).slice(0, 10),
    revenue: number(values[index]),
    spend: 0,
    orders: 0,
    conversions: number(counts[index]),
    impressions: 0,
    clicks: 0,
    sessions: 0,
    newCustomers: 0,
    currency: 'EUR',
    raw: { metricId: String(metric.id) },
  }))
}

export async function syncProviderMetrics(
  provider: PerformanceProvider,
  credentials: ProviderCredentials,
  start: string,
  end: string
): Promise<ProviderSyncRow[]> {
  switch (provider) {
    case 'shopify':
      return shopifyRows(credentials as ShopifyCredentials, start, end)
    case 'meta':
      return metaRows(credentials as MetaCredentials, start, end)
    case 'google':
      return googleRows(credentials as GoogleCredentials, start, end)
    case 'klaviyo':
      return klaviyoRows(credentials as KlaviyoCredentials, start, end)
  }
}

export async function testProviderConnection(
  provider: PerformanceProvider,
  credentials: ProviderCredentials
) {
  const end = isoDate(new Date())
  const startDate = new Date()
  startDate.setUTCDate(startDate.getUTCDate() - 1)
  await syncProviderMetrics(provider, credentials, isoDate(startDate), end)
}
