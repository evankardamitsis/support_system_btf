create table public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null,
  is_internal bool not null default false,
  created_at timestamptz default now()
);

alter table public.ticket_comments enable row level security;

-- Admins and agents see all comments
create policy "comments_read_staff" on public.ticket_comments
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role in ('admin', 'agent')
    )
  );

-- Clients see only non-internal comments on their tickets
create policy "comments_read_client" on public.ticket_comments
  for select using (
    is_internal = false
    and exists (
      select 1 from public.tickets t
      join public.users u on u.id = auth.uid()
      where t.id = ticket_comments.ticket_id
      and u.role = 'client'
      and u.client_id = t.client_id
    )
  );

-- Clients can add non-internal comments to their tickets
create policy "comments_insert_client" on public.ticket_comments
  for insert with check (
    is_internal = false
    and author_id = auth.uid()
    and exists (
      select 1 from public.tickets t
      join public.users u on u.id = auth.uid()
      where t.id = ticket_comments.ticket_id
      and u.role = 'client'
      and u.client_id = t.client_id
    )
  );

-- Admins/agents can insert all comments
create policy "comments_insert_staff" on public.ticket_comments
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role in ('admin', 'agent')
    )
  );
