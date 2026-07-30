import { formatDateInTimeZone } from '@/lib/dates'
import type {
  FinancialOfferComputed,
  FinancialOfferInput,
  FinancialOfferLineItem,
  HostingMaintenancePeriod,
} from './types'

export const DEFAULT_UPFRONT_PERCENT = 30

export function formatOfferCurrency(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  if (Number.isInteger(rounded)) return `${rounded} €`
  return `${rounded.toFixed(2).replace(/\.?0+$/, '')} €`
}

export function sumLineItems(lineItems: FinancialOfferLineItem[]): number {
  return lineItems.reduce((sum, row) => sum + (Number(row.cost) || 0), 0)
}

/** Parses the leading amount from strings like `150 € / year`. */
export function parseHostingAmountFromMaintenance(
  hostingMaintenance: string | null | undefined
): number | null {
  if (!hostingMaintenance?.trim()) return null
  const match = hostingMaintenance.trim().match(/^([\d]+(?:[.,]\d{1,2})?)\s*€/)
  if (!match) return null
  const amount = Number(match[1].replace(',', '.'))
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

/** Parses the period from strings like `150 € / 3 months`. */
export function parseHostingPeriodFromMaintenance(
  hostingMaintenance: string | null | undefined
): HostingMaintenancePeriod {
  if (!hostingMaintenance?.trim()) return 'year'
  const value = hostingMaintenance.toLowerCase()
  if (value.includes('/ month') || value.includes('/month')) return 'month'
  if (value.includes('3 month')) return '3month'
  if (value.includes('6 month')) return '6month'
  return 'year'
}

/**
 * Project/work total for display and upfront — excludes hosting & maintenance
 * (stored separately on the offer).
 */
export function getOfferProjectTotal(offer: {
  lineItems: FinancialOfferLineItem[]
  totalAmount?: number
  hostingMaintenance?: string | null
}): number {
  const fromLineItems = sumLineItems(offer.lineItems)
  const hosting = parseHostingAmountFromMaintenance(offer.hostingMaintenance)

  if (!hosting || offer.totalAmount == null) {
    return fromLineItems
  }

  // Legacy rows may have included hosting in total_amount — subtract when detected.
  if (Math.abs(offer.totalAmount - fromLineItems - hosting) < 0.02) {
    return fromLineItems
  }

  return fromLineItems
}

export function getOfferProjectUpfront(offer: {
  lineItems: FinancialOfferLineItem[]
  upfrontPercent: number
}): number {
  return computeFinancialOffer({
    lineItems: offer.lineItems,
    upfrontPercent: offer.upfrontPercent,
  }).upfrontAmount
}

export function computeFinancialOffer(input: {
  lineItems: FinancialOfferLineItem[]
  upfrontPercent?: number
}): FinancialOfferComputed {
  const total = sumLineItems(input.lineItems)
  const upfrontPercent = input.upfrontPercent ?? DEFAULT_UPFRONT_PERCENT
  const upfrontAmount = Math.round(total * (upfrontPercent / 100) * 100) / 100
  return { total, upfrontAmount, upfrontPercent }
}

export function parseFinancialOfferInput(raw: unknown): FinancialOfferInput {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid offer data')

  const body = raw as Record<string, unknown>
  const clientName = typeof body.clientName === 'string' ? body.clientName.trim() : ''
  if (!clientName) throw new Error('Client name is required')

  const lineItems = Array.isArray(body.lineItems)
    ? body.lineItems
        .map(row => {
          if (!row || typeof row !== 'object') return null
          const item = row as Record<string, unknown>
          const work = typeof item.work === 'string' ? item.work.trim() : ''
          const cost = Number(item.cost)
          if (!work || !Number.isFinite(cost) || cost < 0) return null
          return { work, cost }
        })
        .filter((row): row is { work: string; cost: number } => row !== null)
    : []
  if (lineItems.length === 0) throw new Error('Add at least one work item with a cost')

  const ibans = Array.isArray(body.ibans)
    ? body.ibans
        .map(row => {
          if (!row || typeof row !== 'object') return null
          const item = row as Record<string, unknown>
          const bankName = typeof item.bankName === 'string' ? item.bankName.trim() : ''
          const iban = typeof item.iban === 'string' ? item.iban.trim() : ''
          const swiftBic = typeof item.swiftBic === 'string' ? item.swiftBic.trim() : ''
          if (!bankName || !iban || !swiftBic) return null
          return { bankName, iban, swiftBic }
        })
        .filter((row): row is { bankName: string; iban: string; swiftBic: string } => row !== null)
    : []
  if (ibans.length === 0) throw new Error('Add at least one complete bank account (IBAN)')

  const hostingMaintenance = parseHostingMaintenanceInput(body)

  const upfrontPercent =
    body.upfrontPercent != null ? Number(body.upfrontPercent) : DEFAULT_UPFRONT_PERCENT
  if (!Number.isFinite(upfrontPercent) || upfrontPercent <= 0 || upfrontPercent >= 100) {
    throw new Error('Upfront percent must be between 1 and 99')
  }

  const clientEmail =
    typeof body.clientEmail === 'string' ? body.clientEmail.trim() : ''

  const excludeVat = body.excludeVat === true

  const clientId =
    typeof body.clientId === 'string' && body.clientId.trim() ? body.clientId.trim() : null

  return {
    clientId,
    clientName,
    clientEmail: clientEmail || null,
    lineItems,
    hostingMaintenance: hostingMaintenance || null,
    ibans,
    upfrontPercent,
    excludeVat,
  }
}

export function formatHostingMaintenance(input: {
  amount: number
  period: HostingMaintenancePeriod
}): string | null {
  if (!Number.isFinite(input.amount) || input.amount <= 0) return null

  const value = formatOfferCurrency(input.amount)
  if (input.period === 'month') return `${value} / month`
  if (input.period === '3month') return `${value} / 3 months`
  if (input.period === '6month') return `${value} / 6 months`
  return `${value} / year`
}

function parseHostingMaintenanceInput(body: Record<string, unknown>): string | null {
  const amount = Number(body.hostingAmount)
  if (Number.isFinite(amount) && amount > 0) {
    const periodRaw = body.hostingPeriod
    const period: HostingMaintenancePeriod =
      periodRaw === 'month' || periodRaw === '3month' || periodRaw === '6month'
        ? periodRaw
        : 'year'

    return formatHostingMaintenance({ amount, period })
  }

  const legacy =
    typeof body.hostingMaintenance === 'string' ? body.hostingMaintenance.trim() : ''
  return legacy || null
}

export function formatOfferDocumentDate(date: Date = new Date()): string {
  return formatDateInTimeZone(date, 'Europe/Athens')
}

export function offerFilename(clientName: string): string {
  const safe = clientName.replace(/[/\\?%*:|"<>]/g, '-').trim()
  return `BTF - Financial Offer - ${safe}.pdf`
}
