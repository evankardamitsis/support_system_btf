'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/auth/require-staff'

const PROFILE_ID = '00000000-0000-0000-0000-000000000001'

function revalidateCompanyPaths() {
  revalidatePath('/admin/ops/company')
  revalidatePath('/admin/ops/financial-offers')
  revalidatePath('/admin/ops/financial-offers/new')
}

export async function updateCompanyProfile(formData: FormData) {
  const { supabase, user } = await requireStaff()

  const name = (formData.get('name') as string)?.trim()
  const address = (formData.get('address') as string)?.trim()
  const mobile = (formData.get('mobile') as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const upfrontPercent = Number(formData.get('upfront_percent'))

  if (!name || !address || !mobile || !phone || !email) {
    throw new Error('All company fields are required')
  }
  if (!Number.isFinite(upfrontPercent) || upfrontPercent <= 0 || upfrontPercent >= 100) {
    throw new Error('Upfront percent must be between 1 and 99')
  }

  const { error } = await supabase
    .from('company_profile')
    .upsert({
      id: PROFILE_ID,
      name,
      address,
      mobile,
      phone,
      email,
      upfront_percent: upfrontPercent,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })

  if (error) throw new Error(error.message)
  revalidateCompanyPaths()
}

export async function saveCompanyIban(formData: FormData) {
  const { supabase } = await requireStaff()

  const id = (formData.get('id') as string)?.trim() || null
  const bankName = (formData.get('bank_name') as string)?.trim()
  const iban = (formData.get('iban') as string)?.trim()
  const swiftBic = (formData.get('swift_bic') as string)?.trim()
  const label = (formData.get('label') as string)?.trim() || null

  if (!bankName || !iban || !swiftBic) {
    throw new Error('Bank name, IBAN, and Swift/BIC are required')
  }

  if (id) {
    const { error } = await supabase
      .from('company_ibans')
      .update({ bank_name: bankName, iban, swift_bic: swiftBic, label })
      .eq('id', id)
    if (error) throw new Error(error.message)
  } else {
    const { count } = await supabase
      .from('company_ibans')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)

    const { error } = await supabase.from('company_ibans').insert({
      bank_name: bankName,
      iban,
      swift_bic: swiftBic,
      label,
      sort_order: count ?? 0,
    })
    if (error) throw new Error(error.message)
  }

  revalidateCompanyPaths()
}

export async function removeCompanyIban(ibanId: string) {
  const { supabase } = await requireStaff()

  const { error } = await supabase
    .from('company_ibans')
    .update({ is_active: false })
    .eq('id', ibanId)

  if (error) throw new Error(error.message)
  revalidateCompanyPaths()
}
