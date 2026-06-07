-- macOS desktop app releases (uploaded via scripts/upload-macos-desktop.mjs)
insert into storage.buckets (id, name, public, file_size_limit)
values ('desktop-releases', 'desktop-releases', false, 314572800)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

create policy "desktop_releases_staff_read" on storage.objects
  for select using (
    bucket_id = 'desktop-releases'
    and public.get_my_role() in ('admin', 'agent')
  );
