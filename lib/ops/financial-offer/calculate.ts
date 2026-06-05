import type { FinancialOfferComputed, FinancialOfferInput, FinancialOfferLineItem } from './types'

export const DEFAULT_UPFRONT_PERCENT = 30

export function formatOfferCurrency(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  if (Number.isInteger(rounded)) return `${rounded} €`
  return `${rounded.toFixed(2).replace(/\.?0+$/, '')} €`
}

export function sumLineItems(lineItems: FinancialOfferLineItem[]): number {
  return lineItems.reduce((sum, row) => sum + (Number(row.cost) || 0), 0)
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

  const hostingMaintenance =
    typeof body.hostingMaintenance === 'string' ? body.hostingMaintenance.trim() : ''

  const upfrontPercent =
    body.upfrontPercent != null ? Number(body.upfrontPercent) : DEFAULT_UPFRONT_PERCENT
  if (!Number.isFinite(upfrontPercent) || upfrontPercent <= 0 || upfrontPercent >= 100) {
    throw new Error('Upfront percent must be between 1 and 99')
  }

  const clientEmail =
    typeof body.clientEmail === 'string' ? body.clientEmail.trim() : ''

  const excludeVat = body.excludeVat === true

  return {
    clientName,
    clientEmail: clientEmail || null,
    lineItems,
    hostingMaintenance: hostingMaintenance || null,
    ibans,
    upfrontPercent,
    excludeVat,
  }
}

export function formatOfferDocumentDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Athens',
  })
}

export function offerFilename(clientName: string): string {
  const safe = clientName.replace(/[/\\?%*:|"<>]/g, '-').trim()
  return `BTF - Financial Offer - ${safe}.pdf`
}
