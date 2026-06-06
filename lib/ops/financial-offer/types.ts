export type HostingMaintenancePeriod = 'month' | '3month' | '6month' | 'year'

export const HOSTING_PERIOD_OPTIONS: { value: HostingMaintenancePeriod; label: string }[] = [
  { value: 'month', label: 'Per month' },
  { value: '3month', label: 'Per 3 months' },
  { value: '6month', label: 'Per 6 months' },
  { value: 'year', label: 'Per year' },
]

export function isHostingMaintenancePeriod(value: unknown): value is HostingMaintenancePeriod {
  return value === 'month' || value === '3month' || value === '6month' || value === 'year'
}

export type FinancialOfferLineItem = {
  work: string
  cost: number
}

export type FinancialOfferIban = {
  bankName: string
  iban: string
  swiftBic: string
  label?: string | null
}

export type CompanyProfileData = {
  name: string
  address: string
  mobile: string
  phone: string
  email: string
}

export type FinancialOfferInput = {
  clientId?: string | null
  clientName: string
  clientEmail?: string | null
  lineItems: FinancialOfferLineItem[]
  hostingMaintenance?: string | null
  ibans: FinancialOfferIban[]
  upfrontPercent?: number
  /** When true, PDF shows excl. VAT 24% on Cost column and a VAT footnote. */
  excludeVat?: boolean
}

export type SavedCompanyIban = FinancialOfferIban & {
  id: string
  sortOrder: number
}

/** open = saved offer; accepted = active offer (counts toward analytics) */
export type FinancialOfferStatus = 'open' | 'accepted'

export type FinancialOfferRecord = {
  id: string
  clientId: string | null
  clientName: string
  clientEmail: string | null
  lineItems: FinancialOfferLineItem[]
  hostingMaintenance: string | null
  ibans: FinancialOfferIban[]
  upfrontPercent: number
  totalAmount: number
  upfrontAmount: number
  excludeVat: boolean
  status: FinancialOfferStatus
  acceptedAt: string | null
  acceptedBy: string | null
  emailedAt: string | null
  createdAt: string
  createdBy: string
}

export type FinancialOfferComputed = {
  total: number
  upfrontAmount: number
  upfrontPercent: number
}
