-- Offer lifecycle: open → accepted (active for analytics). Soft-delete for admins.

alter table public.financial_offers
  add column if not exists status text not null default 'open'
    check (status in ('open', 'accepted')),
  add column if not exists accepted_at timestamptz,
  add column if not exists accepted_by uuid references auth.users(id),
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id);

create index if not exists financial_offers_active_idx
  on public.financial_offers (accepted_at desc)
  where status = 'accepted' and deleted_at is null;

create index if not exists financial_offers_list_idx
  on public.financial_offers (created_at desc)
  where deleted_at is null;
