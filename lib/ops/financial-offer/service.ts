import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import {
  computeFinancialOffer,
  offerFilename,
  parseFinancialOfferInput,
} from './calculate'
import { renderFinancialOfferPdf } from './render'
import type { CompanyProfileData, FinancialOfferInput, FinancialOfferRecord } from './types'
import { getCompanyProfile, toCompanyProfileData } from '@/lib/ops/company-profile'

type Db = SupabaseClient<Database>

type FinancialOfferRow = Database['public']['Tables']['financial_offers']['Row']

export function mapFinancialOfferRow(row: FinancialOfferRow): FinancialOfferRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    lineItems: row.line_items as FinancialOfferRecord['lineItems'],
    hostingMaintenance: row.hosting_maintenance,
    ibans: row.ibans as FinancialOfferRecord['ibans'],
    upfrontPercent: Number(row.upfront_percent),
    totalAmount: Number(row.total_amount),
    upfrontAmount: Number(row.upfront_amount),
    excludeVat: row.exclude_vat === true,
    status: row.status === 'accepted' ? 'accepted' : 'open',
    acceptedAt: row.accepted_at,
    acceptedBy: row.accepted_by,
    emailedAt: row.emailed_at,
    createdAt: row.created_at,
    createdBy: row.created_by,
  }
}

export async function resolveOfferCompany(
  supabase: Db,
  override?: CompanyProfileData
): Promise<CompanyProfileData> {
  if (override) return override
  const profile = await getCompanyProfile(supabase)
  return toCompanyProfileData(profile)
}

export function parseOfferBody(raw: unknown, upfrontPercent?: number) {
  const offer = parseFinancialOfferInput(raw)
  if (upfrontPercent != null) offer.upfrontPercent = upfrontPercent
  return offer
}

export async function renderOffer(
  offer: FinancialOfferInput,
  company: CompanyProfileData
): Promise<Buffer> {
  return renderFinancialOfferPdf(offer, company)
}

export async function saveFinancialOfferRecord(
  supabase: Db,
  userId: string,
  offer: FinancialOfferInput,
  emailedAt?: string | null
) {
  const { total, upfrontAmount, upfrontPercent } = computeFinancialOffer(offer)

  const { data, error } = await supabase
    .from('financial_offers')
    .insert({
      client_id: offer.clientId || null,
      client_name: offer.clientName,
      client_email: offer.clientEmail?.trim() || null,
      line_items: offer.lineItems,
      hosting_maintenance: offer.hostingMaintenance,
      ibans: offer.ibans,
      upfront_percent: upfrontPercent,
      total_amount: total,
      upfront_amount: upfrontAmount,
      exclude_vat: offer.excludeVat === true,
      emailed_at: emailedAt ?? null,
      created_by: userId,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Could not save offer')
  return data.id as string
}

export async function updateFinancialOfferRecord(
  supabase: Db,
  offerId: string,
  offer: FinancialOfferInput
) {
  const { total, upfrontAmount, upfrontPercent } = computeFinancialOffer(offer)

  const { error } = await supabase
    .from('financial_offers')
    .update({
      client_id: offer.clientId || null,
      client_name: offer.clientName,
      client_email: offer.clientEmail?.trim() || null,
      line_items: offer.lineItems,
      hosting_maintenance: offer.hostingMaintenance,
      ibans: offer.ibans,
      upfront_percent: upfrontPercent,
      total_amount: total,
      upfront_amount: upfrontAmount,
      exclude_vat: offer.excludeVat === true,
    })
    .eq('id', offerId)
    .eq('status', 'open')
    .is('deleted_at', null)

  if (error) throw new Error(error.message)
}

export async function loadOfferForPdf(supabase: Db, offerId: string) {
  const { data, error } = await supabase
    .from('financial_offers')
    .select('*')
    .eq('id', offerId)
    .is('deleted_at', null)
    .single()

  if (error || !data) return null

  const offer: FinancialOfferInput = {
    clientName: data.client_name,
    clientEmail: data.client_email,
    lineItems: (data.line_items as FinancialOfferInput['lineItems']) ?? [],
    hostingMaintenance: data.hosting_maintenance,
    ibans: (data.ibans as FinancialOfferInput['ibans']) ?? [],
    upfrontPercent: Number(data.upfront_percent),
    excludeVat: data.exclude_vat === true,
  }

  return {
    offer,
    filename: offerFilename(offer.clientName),
  }
}
