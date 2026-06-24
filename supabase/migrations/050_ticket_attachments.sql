-- Storage bucket for ticket images (private — served via API route)
insert into storage.buckets (id, name, public, file_size_limit)
values ('ticket-attachments', 'ticket-attachments', false, 10485760)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

-- Table linking uploaded files to tickets (and optionally to a specific comment)
create table public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  comment_id uuid references public.ticket_comments(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint not null default 0,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.ticket_attachments enable row level security;

-- Staff see all ticket attachments
create policy "ticket_attachments_read_staff" on public.ticket_attachments
  for select using (public.get_my_role() in ('admin', 'agent'));

-- Clients see non-internal attachments on their own tickets
create policy "ticket_attachments_read_client" on public.ticket_attachments
  for select using (
    exists (
      select 1 from public.tickets t
      join public.users u on u.id = auth.uid()
      where t.id = ticket_attachments.ticket_id
        and u.role = 'client'
        and u.client_id = t.client_id
        and (
          ticket_attachments.comment_id is null
          or exists (
            select 1 from public.ticket_comments tc
            where tc.id = ticket_attachments.comment_id
              and tc.is_internal = false
          )
        )
    )
  );

-- Staff can insert attachments
create policy "ticket_attachments_insert_staff" on public.ticket_attachments
  for insert with check (
    uploaded_by = auth.uid()
    and public.get_my_role() in ('admin', 'agent')
  );

-- Clients can insert attachments on their own tickets
create policy "ticket_attachments_insert_client" on public.ticket_attachments
  for insert with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.tickets t
      join public.users u on u.id = auth.uid()
      where t.id = ticket_attachments.ticket_id
        and u.role = 'client'
        and u.client_id = t.client_id
    )
  );
