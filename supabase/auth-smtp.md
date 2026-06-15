# Supabase Auth email (custom SMTP)

Portal **signup**, **password reset**, and **email confirmation** emails are sent by **Supabase Auth**, not the app’s ZeptoMail API (`lib/email/send.ts`). Ticket/invite emails already use ZeptoMail; auth emails need **custom SMTP in Supabase** or you hit the built-in limit (very low per hour) and see errors like `email rate limit exceeded`.

Official guide: [Supabase — Send emails with custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

## Use ZeptoMail (same provider as the app)

You already send transactional mail via ZeptoMail API. For Auth, use the **SMTP password** from the same Mail Agent — **not** `ZEPTOMAIL_API_KEY` (that is API-only).

### 1. ZeptoMail — SMTP credentials

1. [ZeptoMail](https://www.zoho.com/zeptomail/) → your **Mail Agent** → **SMTP / API** → **SMTP** tab  
2. Note:
   - **Server:** `smtp.zeptomail.com` (EU: `smtp.zeptomail.eu`)
   - **Port:** `587` (TLS) or `465` (SSL)
   - **Username:** `emailapikey`
   - **Password:** SMTP password from that tab ([ZeptoMail SMTP help](https://www.zoho.com/zeptomail/help/smtp-home.html))
3. Sender must be on a **verified domain** (same as `EMAIL_FROM` for the app).

### 2. Supabase Dashboard

Project `wlqrfbczvtumfqctykem` → **Authentication** → **SMTP Settings**:

| Field | Value |
|--------|--------|
| Enable custom SMTP | On |
| Sender email | e.g. `support@belowthefold.gr` (verified in ZeptoMail) |
| Sender name | `BTF Support` |
| Host | `smtp.zeptomail.com` or `smtp.zeptomail.eu` |
| Port | `587` |
| Username | `emailapikey` |
| Password | ZeptoMail **SMTP** password |

**Authentication** → **URL configuration** (production):

- Site URL: `https://support.belowthefold.gr`
- Redirect URLs: `https://support.belowthefold.gr/auth/callback`, `https://support.belowthefold.gr/auth/confirm`

### 3. Raise email rate limits

After custom SMTP is enabled:

**Authentication** → **Rate limits** → increase **Emails sent** (`rate_limit_email_sent`).

Built-in SMTP cannot be raised; custom SMTP starts around 30/hour until you increase it. ZeptoMail’s own limits are much higher ([rate limits](https://supabase.com/docs/guides/auth/rate-limits)).

### 4. Optional — apply via script

```bash
# Personal access token: https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN="..."
export ZEPTOMAIL_SMTP_PASSWORD="..."   # SMTP tab password, NOT the API key
# Uses EMAIL_FROM and ZEPTOMAIL_API_URL from .env.local if present

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

Forgot-password emails are sent by the **app** (ZeptoMail API), not Supabase Auth SMTP. The link goes directly to:

`https://support.belowthefold.gr/auth/callback?token_hash=…&type=recovery&next=…`

That works from **any browser** (Gmail, phone, etc.). Requires `SUPABASE_SECRET_KEY`, `ZEPTOMAIL_API_KEY`, and `EMAIL_FROM` in production.

Supabase’s **Reset password** email template is unused for this flow. You can leave it as-is or update it for consistency — it does not affect `/auth/forgot-password`.

## Env vars (reference)

| Variable | Used for |
|----------|-----------|
| `ZEPTOMAIL_API_KEY` | App emails (tickets, invites) via API |
| `ZEPTOMAIL_SMTP_PASSWORD` | Supabase Auth only — configure in dashboard or script |
| `EMAIL_FROM` | App sender; should match Supabase SMTP sender |
| `ZEPTOMAIL_API_URL` | If `*.zeptomail.eu`, script picks EU SMTP host |

## Troubleshooting

- **email rate limit exceeded** — Enable custom SMTP, then raise **Emails sent** rate limit.
- **Email address not authorized** — Built-in SMTP only sends to Supabase org team emails; custom SMTP fixes this for real clients.
- **Error sending recovery email** — Wrong SMTP password (use SMTP tab password, not `ZEPTOMAIL_API_KEY`), wrong host (`smtp.zeptomail.eu` for EU), sender not verified, or ZeptoMail **IP restriction** enabled for SMTP (disable or Supabase cannot connect). Try port **465** if 587 fails.
- **Reset link → “Link expired or invalid”** — Update the **Reset password** email template to use `token_hash` (section 5 above), not `{{ .ConfirmationURL }}`. Then request a fresh reset email. Check **Site URL** is `https://support.belowthefold.gr`.
- **ZeptoMail link tracking** — Disable click/open tracking on auth emails; it can rewrite links and break verification.
