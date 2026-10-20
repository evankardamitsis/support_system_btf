import { BTF_COMPANY } from '@/lib/ops/financial-offer/company'

/** Email assets must load from the public production host, never localhost. */
const EMAIL_ASSET_ORIGIN = 'https://support.belowthefold.gr'
const LOGO_URL = `${EMAIL_ASSET_ORIGIN}/email/btf-logo.png`

/** Shared header (logo) and footer wrapped around every outgoing email body. */
export function emailLayout(content: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff">
      <tr>
        <td style="padding:24px 16px">
          <div style="font-family:system-ui,sans-serif;max-width:520px;color:#111">
            <a href="https://belowthefold.gr" style="display:inline-block;margin-bottom:24px">
              <img src="${LOGO_URL}" width="180" height="24" alt="${BTF_COMPANY.name}" style="display:block;border:0;width:180px;height:24px">
            </a>
            ${content}
            <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e5e5;font-size:12px;line-height:1.6;color:#888">
              <p style="margin:0 0 4px;color:#555;font-weight:600">${BTF_COMPANY.name}</p>
              <p style="margin:0">${BTF_COMPANY.address} · ${BTF_COMPANY.phone}</p>
              <p style="margin:0">
                <a href="https://belowthefold.gr" style="color:#888">belowthefold.gr</a> ·
                <a href="${EMAIL_ASSET_ORIGIN}" style="color:#888">Support portal</a>
              </p>
              <p style="margin:12px 0 0;font-size:11px;color:#aaa">You're receiving this email because of your account with the ${BTF_COMPANY.name} support portal.</p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  `
}

export function emailShell(title: string, body: string, ctaLabel: string, ctaUrl: string): string {
  return emailLayout(`
      <h1 style="font-size:20px;font-weight:600;margin:0 0 8px">${title}</h1>
      <p style="font-size:15px;line-height:1.6;color:#333">${body}</p>
      <p style="margin:24px 0">
        <a href="${ctaUrl}" style="display:inline-block;background:#0e0e0e;color:#e8ff47;padding:12px 20px;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase">${ctaLabel}</a>
      </p>
  `)
}

export type PortalEmailResult = { sent: true } | { sent: false; error: string }
