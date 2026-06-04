-- Allow invite link registration without admin session

-- Read valid invites (token in URL is the secret)
create policy "invite_tokens_read_valid" on public.invite_tokens
  for select using (used = false and expires_at > now());

-- Client row needed for signup email + welcome copy
create policy "clients_read_for_registration" on public.clients
  for select using (
    exists (
      select 1 from public.invite_tokens t
      where t.client_id = clients.id
        and t.used = false
        and t.expires_at > now()
    )
  );

-- New client marks their invite as used after signup
create policy "invite_tokens_consume" on public.invite_tokens
  for update using (
    used = false
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.client_id = invite_tokens.client_id
        and u.role = 'client'
    )
  )
  with check (used = true);
