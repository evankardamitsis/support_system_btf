-- BTF company profile (singleton), saved IBANs, financial offer history

create table public.company_profile (
  id uuid primary key default '00000000-0000-0000-0000-000000000001'::uuid,
  name text not null default 'Below The Fold',
  address text not null default 'Koritsas 3, 15127 Melissia, Athens',
  mobile text not null default '+30 698 2481 615',
  phone text not null default '+30 210 8045 591',
  email text not null default 'kardamitsis.e@belowthefold.gr',
  upfront_percent numeric not null default 30
    check (upfront_percent > 0 and upfront_percent < 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.company_profile (id)
values ('00000000-0000-0000-0000-000000000001'::uuid)
on conflict (id) do nothing;

create table public.company_ibans (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  iban text not null,
  swift_bic text not null,
  label text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.company_ibans (bank_name, iban, swift_bic, label, sort_order)
values (
  'Euro Bank',
  'GR7802600530000780201115058',
  'ERBKGRAA',
  'Primary',
  0
);

create table public.financial_offers (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_email text,
  line_items jsonb not null default '[]'::jsonb,
  hosting_maintenance text,
  ibans jsonb not null default '[]'::jsonb,
  upfront_percent numeric not null,
  total_amount numeric not null,
  upfront_amount numeric not null,
  emailed_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index financial_offers_created_at_idx on public.financial_offers (created_at desc);

alter table public.company_profile enable row level security;
alter table public.company_ibans enable row level security;
alter table public.financial_offers enable row level security;

create policy "company_profile_staff" on public.company_profile
  for all using (public.get_my_role() in ('admin', 'agent'))
  with check (public.get_my_role() in ('admin', 'agent'));

create policy "company_ibans_staff" on public.company_ibans
  for all using (public.get_my_role() in ('admin', 'agent'))
  with check (public.get_my_role() in ('admin', 'agent'));

create policy "financial_offers_staff" on public.financial_offers
  for all using (public.get_my_role() in ('admin', 'agent'))
  with check (public.get_my_role() in ('admin', 'agent'));
