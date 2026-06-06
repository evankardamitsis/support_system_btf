'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/auth/require-staff'
import { isValidEmailAddress, normalizeEmailAddress } from '@/lib/email/addresses'
import { sendFinancialOfferEmail } from '@/lib/email/financial-offer-email'
import { getCompanyProfile, toCompanyProfileData } from '@/lib/ops/company-profile'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  loadOfferForPdf,
  mapFinancialOfferRow,
  parseOfferBody,
  renderOffer,
  resolveOfferCompany,
  saveFinancialOfferRecord,
} from '@/lib/ops/financial-offer/service'
import type { FinancialOfferRecord } from '@/lib/ops/financial-offer/types'

function revalidateOfferPaths() {
  revalidatePath('/admin/ops/financial-offers')
  revalidatePath('/admin/ops/financial-offers/new')
}

export async function submitFinancialOffer(
  raw: unknown,
  options: { sendEmail?: boolean } = {}
): Promise<{ id: string }> {
  const { supabase, user } = await requireStaff()
  const companyProfile = await getCompanyProfile(supabase)
  const offer = parseOfferBody(raw, companyProfile.upfrontPercent)
  const company = await resolveOfferCompany(supabase)

  if (options.sendEmail) {
    const clientEmail = offer.clientEmail ? normalizeEmailAddress(offer.clientEmail) : null
    if (!clientEmail || !isValidEmailAddress(clientEmail)) {
      throw new Error('Enter a valid client email address to send the offer')
    }
    offer.clientEmail = clientEmail
  }

  const pdf = await renderOffer(offer, company)
  const id = await saveFinancialOfferRecord(supabase, user.id, offer, null)

  if (options.sendEmail && offer.clientEmail) {
    const emailed = await sendFinancialOfferEmail({
      to: offer.clientEmail,
      clientName: offer.clientName,
      company,
      pdf,
    })
    if (!emailed.sent) throw new Error(emailed.error)

    const { error } = await supabase
      .from('financial_offers')
      .update({
        client_email: offer.clientEmail,
        emailed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw new Error(error.message)
  }

  revalidateOfferPaths()

  return { id }
}

export async function resendFinancialOfferEmail(
  offerId: string,
  email?: string
): Promise<void> {
  const { supabase } = await requireStaff()
  const loaded = await loadOfferForPdf(supabase, offerId)
  if (!loaded) throw new Error('Offer not found')

  const to = normalizeEmailAddress(email?.trim() || loaded.offer.clientEmail || '')
  if (!to || !isValidEmailAddress(to)) {
    throw new Error('Enter a valid client email address')
  }

  const company = toCompanyProfileData(await getCompanyProfile(supabase))
  const pdf = await renderOffer(loaded.offer, company)

  const emailed = await sendFinancialOfferEmail({
    to,
    clientName: loaded.offer.clientName,
    company,
    pdf,
  })
  if (!emailed.sent) throw new Error(emailed.error)

  const { error } = await supabase
    .from('financial_offers')
    .update({
      client_email: to,
      emailed_at: new Date().toISOString(),
    })
    .eq('id', offerId)

  if (error) throw new Error(error.message)
  revalidateOfferPaths()
}

export async function acceptFinancialOffer(offerId: string): Promise<void> {
  const { supabase, user } = await requireStaff()

  const { data: existing, error: loadError } = await supabase
    .from('financial_offers')
    .select('id, status')
    .eq('id', offerId)
    .is('deleted_at', null)
    .single()

  if (loadError || !existing) throw new Error('Offer not found')
  if (existing.status === 'accepted') throw new Error('Offer is already accepted')

  const { error } = await supabase
    .from('financial_offers')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq('id', offerId)

  if (error) throw new Error(error.message)
  revalidateOfferPaths()
}

export async function deleteFinancialOffer(offerId: string): Promise<void> {
  const { supabase, user, isAdmin } = await requireAdmin()
  if (!isAdmin || !user) throw new Error('Only admins can delete offers')

  const { data: existing, error: loadError } = await supabase
    .from('financial_offers')
    .select('id')
    .eq('id', offerId)
    .is('deleted_at', null)
    .single()

  if (loadError || !existing) throw new Error('Offer not found')

  const { error } = await supabase
    .from('financial_offers')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq('id', offerId)

  if (error) throw new Error(error.message)
  revalidateOfferPaths()
}

export async function listFinancialOffers(): Promise<FinancialOfferRecord[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin' && profile?.role !== 'agent') return []

  const { data, error } = await supabase
    .from('financial_offers')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error || !data) return []

  return data.map(mapFinancialOfferRow)
}
