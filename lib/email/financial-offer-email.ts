import { isValidEmailAddress, normalizeEmailAddress } from '@/lib/email/addresses'
import { sendEmail } from '@/lib/email/send'
import { offerFilename } from '@/lib/ops/financial-offer/calculate'
import type { CompanyProfileData } from '@/lib/ops/financial-offer/types'

function emailShell(title: string, body: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:520px;color:#111">
      <p style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#666">Below The Fold</p>
      <h1 style="font-size:20px;font-weight:600;margin:16px 0 8px">${title}</h1>
      <p style="font-size:15px;line-height:1.6;color:#333">${body}</p>
    </div>
  `
}

export async function sendFinancialOfferEmail(input: {
  to: string
  clientName: string
  company: CompanyProfileData
  pdf: Buffer
}): Promise<{ sent: true } | { sent: false; error: string }> {
  const to = normalizeEmailAddress(input.to)
  if (!to || !isValidEmailAddress(to)) {
    return {
      sent: false,
      error: 'Enter a valid client email address before sending the offer.',
    }
  }

  const filename = offerFilename(input.clientName)
  const sent = await sendEmail({
    to,
    subject: `Financial Offer — ${input.clientName}`,
    html: emailShell(
      'Your financial offer',
      `Please find attached the financial offer prepared for <strong>${input.clientName}</strong>.<br><br>If you have any questions, reply to this email or contact us at <strong>${input.company.email}</strong>.`
    ),
    attachments: [
      {
        name: filename,
        content: input.pdf,
        mimeType: 'application/pdf',
      },
    ],
  })

  if (!sent.ok) {
    return {
      sent: false,
      error: `Offer was saved but the email could not be sent. ${sent.error}`,
    }
  }

  return { sent: true }
}
