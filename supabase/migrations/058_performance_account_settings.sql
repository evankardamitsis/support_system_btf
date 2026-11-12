-- Per-client report settings and an optional client-specific Shopify app.
-- A custom-distribution Shopify app installs on one store only, so each client
-- store gets its own app; its secret is encrypted with PERFORMANCE_CREDENTIALS_KEY.

alter table public.performance_accounts
  add column if not exists hide_store_sales boolean not null default false,
  add column if not exists shopify_app_client_id text,
  add column if not exists shopify_app_secret_encrypted text;

-- TOTIMO reports Shopify as traffic only.
update public.performance_accounts
set hide_store_sales = true
where lower(display_name) = 'totimo';
