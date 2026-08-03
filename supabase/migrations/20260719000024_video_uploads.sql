-- Allow direct video uploads to the product-media bucket
-- (images stay capped at 10 MB in the app; videos up to 50 MB)
update storage.buckets
set
  file_size_limit = 52428800, -- 50 MB
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
where id = 'product-media';
