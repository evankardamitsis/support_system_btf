export type HostingMaintenancePeriod = 'month' | 'year' | 'custom'

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
