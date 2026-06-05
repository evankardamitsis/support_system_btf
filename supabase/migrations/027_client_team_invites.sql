-- Client portal team: multiple users per client org (invite by email)
create table if not exists public.client_invite_tokens (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  email text not null,
  full_name text not null,
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

create index if not exists client_invite_tokens_client_id_idx
  on public.client_invite_tokens (client_id);

create index if not exists client_invite_tokens_email_idx
  on public.client_invite_tokens (lower(email));

alter table public.client_invite_tokens enable row level security;

-- Portal users manage invites for their organisation
create policy "client_team_invites_portal" on public.client_invite_tokens
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role = 'client'
        and u.client_id = client_invite_tokens.client_id
    )
  );

-- Staff can manage client team invites
create policy "client_team_invites_staff" on public.client_invite_tokens
  for all using (public.get_my_role() in ('admin', 'agent'));

-- Registration page (valid invites only)
create policy "client_team_invites_read_valid" on public.client_invite_tokens
  for select using (used = false and expires_at > now());

create policy "client_team_invites_consume" on public.client_invite_tokens
  for update using (
    used = false
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role = 'client'
    )
  )
  with check (used = true);

-- Client name/email for team registration page
create policy "clients_read_for_client_team_registration" on public.clients
  for select using (
    exists (
      select 1 from public.client_invite_tokens t
      where t.client_id = clients.id
        and t.used = false
        and t.expires_at > now()
    )
  );

-- Clients can see teammates on the same account
create policy "users_read_client_teammates" on public.users
  for select using (
    public.get_my_role() = 'client'
    and client_id is not null
    and client_id = (
      select u.client_id from public.users u where u.id = auth.uid()
    )
  );
