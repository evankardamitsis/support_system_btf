'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createClientAction(formData: FormData): Promise<string> {
  const supabase = await createClient()

  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      contact_name: (formData.get('contact_name') as string) || null,
      plan_name: (formData.get('plan_name') as string) || null,
      sla_response_hours: parseInt(formData.get('sla_response_hours') as string, 10) || 8,
    })
    .select('id')
    .single()

  if (error || !client) throw new Error(error?.message ?? 'Failed to create client')

  const hoursTotal = parseFloat(formData.get('hours_total') as string)
  const periodStart = formData.get('period_start') as string
  const periodEnd = formData.get('period_end') as string

  if (hoursTotal && periodStart && periodEnd) {
    await supabase.from('retainers').insert({
      client_id: client.id,
      period_start: periodStart,
      period_end: periodEnd,
      hours_total: hoursTotal,
    })
  }

  return client.id
}

export async function generateInviteLink(clientId: string): Promise<string> {
  const supabase = await createClient()

  const { data: token, error } = await supabase
    .from('invite_tokens')
    .insert({ client_id: clientId })
    .select('token')
    .single()

  if (error || !token) throw new Error(error?.message ?? 'Failed to create invite token')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `${baseUrl}/auth/register?token=${token.token}`
}
