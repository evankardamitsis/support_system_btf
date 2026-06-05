alter table public.financial_offers
  add column if not exists exclude_vat boolean not null default false;
