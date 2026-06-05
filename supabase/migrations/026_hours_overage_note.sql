-- Client-visible note when logged hours exceed the approved estimate
alter table public.tickets
  add column if not exists hours_overage_note text;
