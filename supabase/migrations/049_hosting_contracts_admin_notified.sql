alter table ops_hosting_contracts
  add column if not exists admin_renewal_notified_at timestamptz;
