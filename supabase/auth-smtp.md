# Supabase Auth email (custom SMTP)

Portal **signup**, **password reset**, and **email confirmation** emails are sent by **Supabase Auth**, not the app’s Resend API (`lib/email/send.ts`). Ticket/invite emails already use Resend; auth emails need **custom SMTP in Supabase** or you hit the built-in limit (very low per hour) and see errors like `email rate limit exceeded`.

Official guide: [Supabase — Send emails with custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

## Use Resend (same provider as the app)

Resend SMTP uses your **API key as the password** — the same `RESEND_API_KEY` the app uses works, or create a separate sending-only key for Supabase.

### 1. Resend — SMTP credentials

1. [Resend](https://resend.com) → **Domains** → verify `belowthefold.gr` (same domain as `EMAIL_FROM`)
2. **API Keys** → create a key (Sending access is enough)
3. SMTP settings ([Resend SMTP docs](https://resend.com/docs/send-with-smtp)):
   - **Server:** `smtp.resend.com`
   - **Port:** `465` (SSL) — or `587` (STARTTLS)
   - **Username:** `resend`
   - **Password:** your Resend API key (`re_…`)

### 2. Supabase Dashboard

Project `wlqrfbczvtumfqctykem` → **Authentication** → **SMTP Settings**:

| Field | Value |
|--------|--------|
| Enable custom SMTP | On |
| Sender email | e.g. `hello@belowthefold.gr` (on a domain verified in Resend) |
| Sender name | `BTF Support` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Resend API key |

**Authentication** → **URL configuration** (production):

- Site URL: `https://support.belowthefold.gr`
- Redirect URLs: `https://support.belowthefold.gr/auth/callback`, `https://support.belowthefold.gr/auth/confirm`

### 3. Raise email rate limits

After custom SMTP is enabled:

**Authentication** → **Rate limits** → increase **Emails sent** (`rate_limit_email_sent`).

Built-in SMTP cannot be raised; custom SMTP starts around 30/hour until you increase it. Resend’s own limits depend on your plan ([rate limits](https://supabase.com/docs/guides/auth/rate-limits)).

### 4. Optional — apply via script

```bash
# Personal access token: https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN="..."
# Uses RESEND_API_KEY and EMAIL_FROM from .env.local

node --env-file=.env.local scripts/configure-supabase-auth-smtp.mjs
```

Optional: `AUTH_EMAIL_RATE_LIMIT=100` (emails per hour, default 100).

### 5. Fix password-reset links (required)

The default Supabase template uses `{{ .ConfirmationURL }}`, which produces links like:

`https://….supabase.co/auth/v1/verify?token=pkce_…&type=recovery&redirect_to=…`

That PKCE flow only works if the link is opened in the **same browser** that requested the reset. Opening from Gmail, a phone, or another device shows **“Link expired or invalid”**.

**If your reset email still contains `supabase.co/auth/v1/verify` and `pkce_`, the template was not saved** — edit it again and request a **new** reset email.

**Authentication** → **Email Templates** → **Reset password** — replace the **entire** template body with:

```html
<h2>Reset your password</h2>
<p>We received a request to reset your password. Follow the link below to choose a new one.</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=%2Fauth%2Fupdate-password">Reset password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

A correct reset link should look like:

`https://support.belowthefold.gr/auth/callback?token_hash=…&type=recovery&next=%2Fauth%2Fupdate-password`

(No `supabase.co` in the URL.)

Do the same for **Confirm signup** (optional but recommended):

```html
<h2>Confirm your email</h2>
<p>Follow the link below to confirm your email address and finish signing up.</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup">Confirm email</a></p>
```

Or apply both via script:

```bash
export SUPABASE_ACCESS_TOKEN="..."
node scripts/configure-supabase-email-templates.mjs
```

After saving, **request a new reset email** — links from before the change still use the old format.

## Password reset (app-owned)

Forgot-password emails are sent by the **app** (Resend API), not Supabase Auth SMTP.

## Portal invite emails (app-owned)

All invite emails use the **Resend API** (`RESEND_API_KEY`, `EMAIL_FROM`):

| Flow | When it sends |
|------|----------------|
| Client team invite | Admin/portal user invites a colleague |
| Primary client portal setup | Admin clicks generate invite on client page |
| Staff invite | Admin invites team member |

After they accept an invite and set a password, the account is **auto-confirmed** (no second Supabase confirmation email).

Legacy “resend confirmation” on the register page uses Resend with a direct `token_hash` link.

Requires `SUPABASE_SECRET_KEY` for admin user creation on signup.

## Env vars (reference)

| Variable | Used for |
|----------|-----------|
| `RESEND_API_KEY` | App emails (tickets, invites) via API; also the Supabase SMTP password |
| `EMAIL_FROM` | App sender; should match Supabase SMTP sender |

## Troubleshooting

- **email rate limit exceeded** — Enable custom SMTP, then raise **Emails sent** rate limit.
- **Email address not authorized** — Built-in SMTP only sends to Supabase org team emails; custom SMTP fixes this for real clients.
- **Error sending recovery email** — Wrong or revoked API key, username not exactly `resend`, or sender domain not verified in Resend. Try port **587** if 465 fails.
- **Reset link → “Link expired or invalid”** — Update the **Reset password** email template to use `token_hash` (section 5 above), not `{{ .ConfirmationURL }}`. Then request a fresh reset email. Check **Site URL** is `https://support.belowthefold.gr`.
- **Resend link tracking** — Keep click/open tracking off for the sending domain (Resend → Domains → Configuration); it can rewrite links and break verification.
