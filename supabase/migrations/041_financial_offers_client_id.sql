alter table public.financial_offers
  add column if not exists client_id uuid references public.clients(id) on delete set null;

create index if not exists financial_offers_client_idx
  on public.financial_offers (client_id)
  where deleted_at is null;

-- Link legacy offers when the name matches exactly (case-insensitive).
update public.financial_offers fo
set client_id = c.id
from public.clients c
where fo.client_id is null
  and fo.deleted_at is null
  and lower(trim(fo.client_name)) = lower(trim(c.name));
