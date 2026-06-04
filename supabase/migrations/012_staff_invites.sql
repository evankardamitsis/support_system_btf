-- Internal team invites (admin / agent members)
create table public.staff_invite_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  role text not null check (role in ('admin', 'agent')),
  token text unique not null default replace(
    gen_random_uuid()::text || gen_random_uuid()::text,
    '-',
    ''
  ),
  used bool not null default false,
  expires_at timestamptz not null default (now() + interval '7 days'),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index staff_invite_tokens_email_idx on public.staff_invite_tokens (lower(email));

alter table public.staff_invite_tokens enable row level security;

-- Admins manage team invites
create policy "staff_invites_admin" on public.staff_invite_tokens
  for all using (public.get_my_role() = 'admin');

-- Registration page (valid invites only)
create policy "staff_invites_read_valid" on public.staff_invite_tokens
  for select using (used = false and expires_at > now());

create policy "staff_invites_consume" on public.staff_invite_tokens
  for update using (
    used = false
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role in ('admin', 'agent')
    )
  )
  with check (used = true);
