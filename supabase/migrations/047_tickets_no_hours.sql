-- Pre-existing bugs and other work that should not bill hours or use estimate/approval flows.
alter table public.tickets
  add column if not exists no_hours boolean not null default false;

comment on column public.tickets.no_hours is
  'When true, ticket skips estimate, work approval, and hours logging (e.g. pre-existing bug).';
