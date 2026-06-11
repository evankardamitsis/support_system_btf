/**
 * Manually confirm an invited client team member and complete their portal profile.
 * Usage: node --env-file=.env.local scripts/confirm-invited-client-user.mjs dimitra@stylecycle.gr
 */
const email = (process.argv[2] ?? '').trim().toLowerCase()
if (!email) {
  console.error('Usage: node --env-file=.env.local scripts/confirm-invited-client-user.mjs <email>')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !secret) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY')
  process.exit(1)
}

const headers = {
  apikey: secret,
  Authorization: `Bearer ${secret}`,
  'Content-Type': 'application/json',
}

async function api(path, init = {}) {
  const res = await fetch(`${url}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  })
  const text = await res.text()
  const body = text ? JSON.parse(text) : null
  if (!res.ok) {
    throw new Error(body?.message ?? body?.error ?? text ?? res.statusText)
  }
  return body
}

async function findAuthUserByEmail(target) {
  for (let page = 1; page <= 10; page += 1) {
    const data = await api(`/auth/v1/admin/users?page=${page}&per_page=1000`)
    const users = data?.users ?? []
    const hit = users.find(u => u.email?.toLowerCase() === target)
    if (hit) return hit
    if (users.length < 1000) break
  }
  return null
}

const authUser = await findAuthUserByEmail(email)
if (!authUser) {
  console.error(`No auth user found for ${email}`)
  process.exit(1)
}

console.log('Auth user:', authUser.id, 'confirmed:', Boolean(authUser.email_confirmed_at))

const invites = await api(
  `/rest/v1/client_invite_tokens?email=eq.${encodeURIComponent(email)}&select=id,client_id,full_name,used,expires_at,created_at&order=created_at.desc&limit=1`
)

const invite = invites?.[0]
if (!invite) {
  console.error('No client_invite_tokens row for this email')
  process.exit(1)
}

console.log('Invite:', invite.id, 'client:', invite.client_id, 'used:', invite.used)

await api(`/auth/v1/admin/users/${authUser.id}`, {
  method: 'PUT',
  body: JSON.stringify({
    email_confirm: true,
    user_metadata: {
      ...(authUser.user_metadata ?? {}),
      full_name: invite.full_name ?? authUser.user_metadata?.full_name,
    },
  }),
})
console.log('Email confirmed')

await api('/rest/v1/users?on_conflict=id', {
  method: 'POST',
  headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
  body: JSON.stringify({
    id: authUser.id,
    role: 'client',
    client_id: invite.client_id,
    full_name: invite.full_name ?? authUser.user_metadata?.full_name ?? null,
  }),
})
console.log('Profile upserted')

if (!invite.used) {
  await api(`/rest/v1/client_invite_tokens?id=eq.${invite.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ used: true }),
  })
  console.log('Invite marked used')
}

console.log('Done — user can sign in at /auth/login')
