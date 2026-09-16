'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/require-admin'
import { sendPerformanceDashboardInviteEmail } from '@/lib/email/performance-dashboard-invite'
import type { PerformanceAccessResult } from '@/lib/performance/access-types'
import { createAdminClient } from '@/lib/supabase/admin'
import { findAuthUserByEmail } from '@/lib/team/auth-users'

function origin() {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000'
}

function fail(error: string): PerformanceAccessResult {
  return { ok: false, error }
}

function databaseMessage(message: string) {
  return /portal_access_scope|access_scope|performance_account_id/i.test(message)
    ? 'Apply database migration 056 before sending dashboard invitations.'
    : message
}

export async function invitePerformanceViewer(formData: FormData): Promise<PerformanceAccessResult> {
  const { isAdmin, user } = await requireAdmin()
  if (!isAdmin || !user) return fail('Admin access is required.')

  const accountId = String(formData.get('accountId') || '').trim()
  const fullName = String(formData.get('full_name') || '').trim()
  const email = String(formData.get('email') || '').trim().toLowerCase()
  if (!accountId || !fullName || !email) return fail('Name and email are required.')

  const admin = createAdminClient()
  const { data: account, error: accountError } = await admin
    .from('performance_accounts')
    .select('id, client_id, display_name')
    .eq('id', accountId)
    .single()
  if (accountError || !account) return fail('Performance workspace not found.')

  const authUser = await findAuthUserByEmail(admin, email)
  if (authUser) {
    const { data: profile } = await admin
      .from('users')
      .select('role, client_id, portal_access_scope')
      .eq('id', authUser.id)
      .maybeSingle()

    if (profile?.role === 'admin' || profile?.role === 'agent') {
      return fail('This email belongs to a BTF staff account.')
    }
    if (profile?.role === 'client' && profile.client_id && profile.client_id !== account.client_id) {
      return fail('This email belongs to another client account.')
    }
    if (profile?.role === 'client' && profile.client_id === account.client_id) {
      return fail(
        profile.portal_access_scope === 'performance'
          ? 'This person already has access to this dashboard.'
          : 'This person already has full client portal access, including the dashboard.'
      )
    }

    if (authUser.email_confirmed_at) {
      const { error } = await admin.from('users').upsert({
        id: authUser.id,
        role: 'client',
        client_id: account.client_id,
        full_name: fullName,
        portal_access_scope: 'performance',
      }, { onConflict: 'id' })
      if (error) return fail(databaseMessage(error.message))

      const url = `${origin()}/auth/login?email=${encodeURIComponent(email)}`
      const delivery = await sendPerformanceDashboardInviteEmail({
        to: email,
        inviteeName: fullName,
        clientName: account.display_name,
        inviteUrl: url,
        existingUser: true,
      })
      revalidatePath('/admin/performance/integrations')
      return {
        ok: true,
        url,
        emailSent: delivery.sent,
        emailError: delivery.sent ? null : delivery.error,
        existingUser: true,
      }
    }
  }

  await admin
    .from('client_invite_tokens')
    .delete()
    .eq('performance_account_id', account.id)
    .eq('email', email)
    .eq('used', false)

  const { data: invite, error: inviteError } = await admin
    .from('client_invite_tokens')
    .insert({
      client_id: account.client_id,
      email,
      full_name: fullName,
      invited_by: user.id,
      access_scope: 'performance',
      performance_account_id: account.id,
    })
    .select('token')
    .single()
  if (inviteError || !invite?.token) return fail(databaseMessage(inviteError?.message || 'Could not create invite.'))

  const url = `${origin()}/auth/register-client?token=${invite.token}`
  const delivery = await sendPerformanceDashboardInviteEmail({
    to: email,
    inviteeName: fullName,
    clientName: account.display_name,
    inviteUrl: url,
  })
  revalidatePath('/admin/performance/integrations')
  return {
    ok: true,
    url,
    emailSent: delivery.sent,
    emailError: delivery.sent ? null : delivery.error,
    existingUser: false,
  }
}
