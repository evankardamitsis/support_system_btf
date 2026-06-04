create table public.invite_tokens (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  token text unique not null default replace(
    gen_random_uuid()::text || gen_random_uuid()::text,
    '-',
    ''
  ),
  used bool not null default false,
  expires_at timestamptz default now() + interval '7 days',
  created_at timestamptz default now()
);

alter table public.invite_tokens enable row level security;

-- Only admins can insert/select invite tokens
create policy "invite_tokens_admin" on public.invite_tokens
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role = 'admin'
    )
  );
