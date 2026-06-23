import { getCompanyProfile } from '@/lib/ops/company-profile'
import { formatHostingContractCost, formatHostingDate } from '@/lib/ops/hosting-maintenance/display'
import { renewalDateFromPeriodEnd } from '@/lib/ops/hosting-maintenance/period'
import type { HostingContractRecord } from '@/lib/ops/hosting-maintenance/types'
import { HOSTING_ADMIN_ALERT_EMAIL } from '@/lib/ops/hosting-maintenance/types'
import { getClientNotificationEmails, type NotifyResult } from '@/lib/email/ticket-notifications'
import { sendEmail } from '@/lib/email/send'
import { createClient } from '@/lib/supabase/server'

function appOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

function emailShell(title: string, body: string, ctaLabel: string, ctaUrl: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:520px;color:#111">
      <p style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#666">BTF</p>
      <h1 style="font-size:20px;font-weight:600;margin:16px 0 8px">${title}</h1>
      <p style="font-size:15px;line-height:1.6;color:#333">${body}</p>
      <p style="margin:24px 0">
        <a href="${ctaUrl}" style="display:inline-block;background:#0e0e0e;color:#e8ff47;padding:12px 20px;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase">${ctaLabel}</a>
      </p>
    </div>
  `
}

export async function sendHostingRenewalReminder(
  contract: HostingContractRecord
): Promise<NotifyResult> {
  const recipients = await getClientNotificationEmails(contract.clientId)
  if (recipients.length === 0) {
    return { sent: false, error: 'No client email on file' }
  }

  const supabase = await createClient()
  const company = await getCompanyProfile(supabase)
  const renewalDate = renewalDateFromPeriodEnd(contract.periodEnd)
  const costLabel = formatHostingContractCost(
    contract.costAmount,
    contract.periodType,
    contract.customPeriod
  )

  const body = [
    `Your hosting &amp; maintenance for <strong>${contract.name}</strong> is due for renewal.`,
    `Current period ends on <strong>${formatHostingDate(contract.periodEnd)}</strong>.`,
    `Renewal fee: <strong>${costLabel}</strong>.`,
    `To continue without interruption, please arrange payment before <strong>${formatHostingDate(renewalDate)}</strong>.`,
    `Reply to this email or contact us at <strong>${company.email}</strong> and we will send payment details.`,
  ].join(' ')

  const result = await sendEmail({
    to: recipients,
    subject: `Hosting & maintenance renewal — ${contract.name}`,
    html: emailShell(
      'Hosting & maintenance renewal',
      body,
      'Open support portal',
      `${appOrigin()}/portal/tickets`
    ),
  })

  if (!result.ok) return { sent: false, error: result.error }
  return { sent: true }
}

export async function sendHostingRenewalAdminAlert(
  contract: HostingContractRecord
): Promise<NotifyResult> {
  const costLabel = formatHostingContractCost(
    contract.costAmount,
    contract.periodType,
    contract.customPeriod
  )

  const adminUrl = `${appOrigin()}/admin/ops/hosting`

  const body = [
    `<strong>${contract.name}</strong> (${contract.clientName}) renews <strong>tomorrow</strong>.`,
    `Period ends: <strong>${formatHostingDate(contract.periodEnd)}</strong>.`,
    `Fee: <strong>${costLabel}</strong>.`,
    `Action needed: confirm payment has been received or follow up with the client.`,
  ].join(' ')

  const result = await sendEmail({
    to: HOSTING_ADMIN_ALERT_EMAIL,
    subject: `[Action needed] Hosting renewal tomorrow — ${contract.name}`,
    html: emailShell(
      'Hosting renewal — 1 day away',
      body,
      'Open hosting contracts',
      adminUrl
    ),
  })

  if (!result.ok) return { sent: false, error: result.error }
  return { sent: true }
}
