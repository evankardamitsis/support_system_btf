import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { BTF_COMPANY, DEFAULT_OFFER_IBAN } from '@/lib/ops/financial-offer/company'
import type { CompanyProfileData, SavedCompanyIban } from '@/lib/ops/financial-offer/types'

const PROFILE_ID = '00000000-0000-0000-0000-000000000001'

type Db = SupabaseClient<Database>

export const DEFAULT_COMPANY_PROFILE: CompanyProfileData & { upfrontPercent: number } = {
  name: BTF_COMPANY.name,
  address: BTF_COMPANY.address,
  mobile: BTF_COMPANY.mobile,
  phone: BTF_COMPANY.phone,
  email: BTF_COMPANY.email,
  upfrontPercent: 30,
}

export async function getCompanyProfile(supabase: Db) {
  const { data } = await supabase
    .from('company_profile')
    .select('name, address, mobile, phone, email, upfront_percent')
    .eq('id', PROFILE_ID)
    .maybeSingle()

  if (!data) return DEFAULT_COMPANY_PROFILE

  return {
    name: data.name,
    address: data.address,
    mobile: data.mobile,
    phone: data.phone,
    email: data.email,
    upfrontPercent: Number(data.upfront_percent),
  }
}

export async function getCompanyIbans(supabase: Db): Promise<SavedCompanyIban[]> {
  const { data } = await supabase
    .from('company_ibans')
    .select('id, bank_name, iban, swift_bic, label, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (!data?.length) {
    return [
      {
        id: 'default',
        bankName: DEFAULT_OFFER_IBAN.bankName,
        iban: DEFAULT_OFFER_IBAN.iban,
        swiftBic: DEFAULT_OFFER_IBAN.swiftBic,
        label: 'Primary',
        sortOrder: 0,
      },
    ]
  }

  return data.map(row => ({
    id: row.id,
    bankName: row.bank_name,
    iban: row.iban,
    swiftBic: row.swift_bic,
    label: row.label,
    sortOrder: row.sort_order,
  }))
}

export async function getCompanyProfileForOffers(supabase: Db) {
  const [profile, ibans] = await Promise.all([
    getCompanyProfile(supabase),
    getCompanyIbans(supabase),
  ])
  return { profile, ibans }
}

export function toCompanyProfileData(
  profile: Awaited<ReturnType<typeof getCompanyProfile>>
): CompanyProfileData {
  return {
    name: profile.name,
    address: profile.address,
    mobile: profile.mobile,
    phone: profile.phone,
    email: profile.email,
  }
}
