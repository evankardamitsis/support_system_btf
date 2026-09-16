import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  hashPerformancePixelIdentifier,
  verifyPerformancePixelToken,
} from '@/lib/performance/pixel'

const ALLOWED_EVENTS = new Set([
  'page_viewed',
  'product_viewed',
  'product_added_to_cart',
  'checkout_started',
  'checkout_completed',
])

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}

function response(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS })
}

function text(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function pageDetails(value: string) {
  if (!value) return { url: null, path: null, utmSource: null, utmMedium: null, utmCampaign: null }
  try {
    const url = new URL(value)
    return {
      url: `${url.origin}${url.pathname}`.slice(0, 2048),
      path: (url.pathname || '/').slice(0, 1024),
      utmSource: text(url.searchParams.get('utm_source'), 255) || null,
      utmMedium: text(url.searchParams.get('utm_medium'), 255) || null,
      utmCampaign: text(url.searchParams.get('utm_campaign'), 255) || null,
    }
  } catch {
    return { url: null, path: null, utmSource: null, utmMedium: null, utmCampaign: null }
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  const size = Number(request.headers.get('content-length') || 0)
  if (size > 32_768) return response(413, { ok: false, error: 'Payload too large' })

  try {
    const payload = await request.json() as Record<string, unknown>
    if (payload.analyticsAllowed !== true) return response(202, { ok: true, ignored: true })

    const accountId = verifyPerformancePixelToken(text(payload.token, 512))
    const eventId = text(payload.eventId, 255)
    const eventName = text(payload.eventName, 64)
    const visitorId = text(payload.clientId, 512)
    const sessionId = text(payload.sessionId, 512)
    if (!accountId || !eventId || !ALLOWED_EVENTS.has(eventName) || !visitorId || !sessionId) {
      return response(400, { ok: false, error: 'Invalid analytics event' })
    }

    const timestamp = new Date(text(payload.timestamp, 64))
    const now = Date.now()
    if (!Number.isFinite(timestamp.getTime()) || Math.abs(now - timestamp.getTime()) > 7 * 24 * 60 * 60 * 1000) {
      return response(400, { ok: false, error: 'Invalid event timestamp' })
    }

    const page = pageDetails(text(payload.pageUrl, 4096))
    const numericValue = Number(payload.value)
    const admin = createAdminClient()
    const { error } = await admin.from('performance_web_events').insert({
      account_id: accountId,
      event_id: eventId,
      event_name: eventName as 'page_viewed' | 'product_viewed' | 'product_added_to_cart' | 'checkout_started' | 'checkout_completed',
      occurred_at: timestamp.toISOString(),
      visitor_key: hashPerformancePixelIdentifier(visitorId),
      session_key: hashPerformancePixelIdentifier(sessionId),
      page_url: page.url,
      page_path: page.path,
      page_title: text(payload.pageTitle, 512) || null,
      referrer_url: text(payload.referrerUrl, 2048) || null,
      product_id: text(payload.productId, 255) || null,
      product_title: text(payload.productTitle, 512) || null,
      order_id: text(payload.orderId, 255) || null,
      value: Number.isFinite(numericValue) ? numericValue : null,
      currency: text(payload.currency, 8).toUpperCase() || null,
      utm_source: page.utmSource,
      utm_medium: page.utmMedium,
      utm_campaign: page.utmCampaign,
    })

    if (error && error.code !== '23505') throw new Error(error.message)
    return response(202, { ok: true, duplicate: error?.code === '23505' })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Could not store analytics event'
    return response(500, { ok: false, error: message })
  }
}
