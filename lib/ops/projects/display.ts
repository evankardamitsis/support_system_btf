import { formatOfferCurrency } from '@/lib/ops/financial-offer/calculate'

export function formatProjectCost(amount: number | null): string {
  if (amount == null) return '—'
  return formatOfferCurrency(amount)
}

export function parseProjectCostInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const normalized = trimmed.replace(/€/g, '').replace(/\s/g, '').replace(',', '.')
  const value = Number(normalized)
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Project cost must be a non-negative number')
  }
  return Math.round(value * 100) / 100
}

export function formatProjectDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
