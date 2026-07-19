-- Public storage bucket for product media uploads (images only via admin)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-media',
  'product-media',
  true,
  10485760,  -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do nothing;

-- Authenticated users (admin) may upload and delete
drop policy if exists "product_media_storage_insert" on storage.objects;
create policy "product_media_storage_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-media');

drop policy if exists "product_media_storage_delete" on storage.objects;
create policy "product_media_storage_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-media');

-- Public read so URLs work on landing pages
drop policy if exists "product_media_storage_read" on storage.objects;
create policy "product_media_storage_read"
  on storage.objects for select to public
  using (bucket_id = 'product-media');
