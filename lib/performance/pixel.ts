import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

const TOKEN_VERSION = 'v1'

function signingKey() {
  const key = process.env.PERFORMANCE_CREDENTIALS_KEY?.trim()
  if (!key || key.length < 32) {
    throw new Error('PERFORMANCE_CREDENTIALS_KEY must be configured with at least 32 characters')
  }
  return key
}

function signature(accountId: string) {
  return createHmac('sha256', signingKey())
    .update(`${TOKEN_VERSION}:${accountId}`)
    .digest('base64url')
}

export function createPerformancePixelToken(accountId: string) {
  return `${TOKEN_VERSION}.${accountId}.${signature(accountId)}`
}

export function verifyPerformancePixelToken(token: string) {
  const [version, accountId, received] = token.split('.')
  if (version !== TOKEN_VERSION || !accountId || !received) return null
  const expected = signature(accountId)
  const left = Buffer.from(received)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right) ? accountId : null
}

export function hashPerformancePixelIdentifier(value: string) {
  return createHmac('sha256', signingKey()).update(value).digest('hex')
}

export function createShopifyCustomPixelSnippet(accountId: string, origin: string) {
  const endpoint = new URL('/api/performance/shopify/events', origin).toString()
  const token = createPerformancePixelToken(accountId)

  return `const BTF_ENDPOINT = ${JSON.stringify(endpoint)};
const BTF_TOKEN = ${JSON.stringify(token)};

// Shopify exposes the initial consent state through init in Custom Pixels.
// Require Analytics and Preferences in Customer Events. Preferences covers
// the browser storage used below to keep funnel sessions together.
const btfPrivacy = init.customerPrivacy;

async function btfSessionId(event) {
  const shopifySession = await browser.cookie.get('_shopify_s');
  if (shopifySession) return shopifySession;
  let fallback = await browser.sessionStorage.getItem('btf_performance_session');
  if (!fallback) {
    fallback = event.clientId + ':' + String(Date.now());
    await browser.sessionStorage.setItem('btf_performance_session', fallback);
  }
  return fallback;
}

async function btfTrack(event) {
  if (!btfPrivacy?.analyticsProcessingAllowed || !btfPrivacy?.preferencesProcessingAllowed) return;
  const context = event.context || {};
  const documentContext = context.document || {};
  const location = context.window?.location || {};
  const data = event.data || {};
  const variant = data.productVariant || data.cartLine?.merchandise || null;
  const checkout = data.checkout || null;

  await fetch(BTF_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      token: BTF_TOKEN,
      eventId: event.id,
      eventName: event.name,
      timestamp: event.timestamp,
      clientId: event.clientId,
      sessionId: await btfSessionId(event),
      pageUrl: location.href || null,
      pageTitle: documentContext.title || null,
      referrerUrl: documentContext.referrer || null,
      productId: variant?.product?.id || null,
      productTitle: variant?.product?.title || null,
      orderId: checkout?.order?.id || null,
      value: checkout?.totalPrice?.amount || null,
      currency: checkout?.currencyCode || null,
      analyticsAllowed: true
    })
  });
}

// Shopify's custom-pixel validator detects literal subscribe calls.
analytics.subscribe('page_viewed', btfTrack);
analytics.subscribe('product_viewed', btfTrack);
analytics.subscribe('product_added_to_cart', btfTrack);
analytics.subscribe('checkout_started', btfTrack);
analytics.subscribe('checkout_completed', btfTrack);`
}
