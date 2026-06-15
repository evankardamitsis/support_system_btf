'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { tryCreateAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/require-admin'
import { requireStaff } from '@/lib/auth/require-staff'
import { insertRetainerPeriod } from '@/lib/retainers/insert-period'
import { currentBillingPeriod } from '@/lib/retainers/period'
import { isHoursBasedPackage, packageLabel } from '@/lib/retainers/billing-model'
import { parseRetainerPackage, type RetainerPackage } from '@/lib/retainers/packages'
import { sendClientPrimaryInviteEmail } from '@/lib/email/client-primary-invite'

export type DeleteClientResult = { ok: true } | { ok: false; error: string }

export type GenerateInviteLinkResult =
  | { ok: true; url: string; emailSent: boolean; emailError: string | null }
  | { ok: false; error: string }

function parsePackage(raw: string | null): RetainerPackage {
  return parseRetainerPackage(raw)
}

function revalidateClientPickers() {
  revalidatePath('/admin/clients')
  revalidatePath('/admin/ops/hosting-maintenance')
  revalidatePath('/admin/ops/hosting-maintenance/new')
  revalidatePath('/admin/ops/projects/new')
  revalidatePath('/admin/tickets/new')
}

/** Minimal client for ops flows (hosting, projects) — no retainer period. */
export async function createQuickClient(input: {
  name: string
  email: string
  contactName?: string | null
}): Promise<{ id: string; name: string }> {
  const { supabase } = await requireStaff()
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  const contactName = input.contactName?.trim() || null

  if (!name) throw new Error('Company name is required')
  if (!email || !email.includes('@')) throw new Error('A valid email is required')

  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      name,
      email,
      contact_name: contactName,
      plan_name: null,
      billing_cycle_day: 1,
      sla_response_hours: 8,
    })
    .select('id, name')
    .single()

  if (error || !client) throw new Error(error?.message ?? 'Failed to create client')

  revalidateClientPickers()
  return { id: client.id, name: client.name }
}

export async function createClientAction(formData: FormData): Promise<string> {
  const supabase = await createClient()

  const packageName = parsePackage(formData.get('package_name') as string)
  const planLabel = packageLabel(packageName)
  const billingCycleDay = parseInt(formData.get('billing_cycle_day') as string, 10) || 1

  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      contact_name: (formData.get('contact_name') as string) || null,
      plan_name: planLabel,
      billing_cycle_day: billingCycleDay,
      sla_response_hours: parseInt(formData.get('sla_response_hours') as string, 10) || 8,
    })
    .select('id')
    .single()

  if (error || !client) throw new Error(error?.message ?? 'Failed to create client')

  const hoursTotal = parseFloat(formData.get('hours_total') as string)
  const periodCost = parseFloat(formData.get('period_cost') as string)
  const useCustomDates = formData.get('use_custom_dates') === 'true'

  const hoursLimited = isHoursBasedPackage(packageName)
  const shouldCreatePeriod =
    (hoursLimited && hoursTotal && hoursTotal > 0) ||
    (!hoursLimited && periodCost && periodCost > 0)

  if (shouldCreatePeriod) {
    const { period_start, period_end } = useCustomDates
      ? {
          period_start: formData.get('period_start') as string,
          period_end: formData.get('period_end') as string,
        }
      : currentBillingPeriod(billingCycleDay)

    if (period_start && period_end) {
      await insertRetainerPeriod(supabase, {
        clientId: client.id,
        packageName,
        hoursTotal: hoursLimited ? hoursTotal : 0,
        periodCost: Number.isNaN(periodCost) ? 0 : periodCost,
        periodStart: period_start,
        periodEnd: period_end,
        sendClientEmail: true,
      })
    }
  }

  return client.id
}

export async function updateClientAction(clientId: string, formData: FormData): Promise<void> {
  const { supabase } = await requireStaff()

  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const contactName = (formData.get('contact_name') as string)?.trim() || null
  const billingCycleDay = parseInt(formData.get('billing_cycle_day') as string, 10) || 1
  const slaResponseHours = parseInt(formData.get('sla_response_hours') as string, 10) || 8

  if (!clientId) throw new Error('Client is required')
  if (!name) throw new Error('Company name is required')
  if (!email || !email.includes('@')) throw new Error('A valid email is required')
  if (billingCycleDay < 1 || billingCycleDay > 28) {
    throw new Error('Billing cycle day must be between 1 and 28')
  }
  if (slaResponseHours < 1) throw new Error('SLA response hours must be at least 1')

  const { error } = await supabase
    .from('clients')
    .update({
      name,
      email,
      contact_name: contactName,
      billing_cycle_day: billingCycleDay,
      sla_response_hours: slaResponseHours,
    })
    .eq('id', clientId)

  if (error) throw new Error(error.message)

  revalidatePath(`/admin/clients/${clientId}`)
  revalidatePath('/admin/clients')
  revalidateClientPickers()
}

export async function generateInviteLink(clientId: string): Promise<GenerateInviteLinkResult> {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return { ok: false, error: 'Only admins can generate portal invites' }
  }

  const supabase = await createClient()

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('name, email, contact_name')
    .eq('id', clientId)
    .single()

  if (clientError || !client?.email) {
    return { ok: false, error: clientError?.message ?? 'Client not found or missing email' }
  }

  const { data: token, error } = await supabase
    .from('invite_tokens')
    .insert({ client_id: clientId })
    .select('token')
    .single()

  if (error || !token) {
    return { ok: false, error: error?.message ?? 'Failed to create invite token' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const url = `${baseUrl}/auth/register?token=${token.token}`

  const emailResult = await sendClientPrimaryInviteEmail({
    to: client.email,
    contactName: client.contact_name,
    clientName: client.name,
    inviteUrl: url,
  })

  revalidatePath(`/admin/clients/${clientId}`)

  return {
    ok: true,
    url,
    emailSent: emailResult.sent,
    emailError: emailResult.sent ? null : emailResult.error,
  }
}

export async function updateClientApprovalReminders(
  clientId: string,
  enabled: boolean
): Promise<void> {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) throw new Error('Only admins can change client reminder settings')

  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) throw new Error(adminResult.error)

  const { error } = await adminResult.client
    .from('clients')
    .update({ approval_reminders_enabled: enabled })
    .eq('id', clientId)

  if (error) throw new Error(error.message)

  revalidatePath(`/admin/clients/${clientId}`)
  revalidatePath('/admin/clients')
}

export async function deleteClient(clientId: string): Promise<DeleteClientResult> {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return { ok: false, error: 'Only admins can delete clients' }
  }

  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) {
    return { ok: false, error: adminResult.error }
  }
  const admin = adminResult.client

  const { data: portalUsers, error: usersError } = await admin
    .from('users')
    .select('id')
    .eq('client_id', clientId)
    .eq('role', 'client')

  if (usersError) {
    return { ok: false, error: usersError.message }
  }

  for (const portalUser of portalUsers ?? []) {
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(portalUser.id)
    if (authDeleteError) {
      return { ok: false, error: authDeleteError.message }
    }
  }

  const { error } = await admin.from('clients').delete().eq('id', clientId)
  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin/clients')
  revalidatePath('/admin/tickets')
  revalidatePath('/admin/retainers')
  return { ok: true }
}
