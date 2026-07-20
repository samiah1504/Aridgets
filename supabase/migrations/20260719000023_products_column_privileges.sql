-- Lock the CAPI access token at the database level.
-- RLS controls rows, not columns — without this, any staff member with
-- products.view could read capi_access_token through a direct API call.
-- Only the service role (server-side API routes) can read it now.

revoke select on table public.products from anon, authenticated;

grant select (
  id, slug, name, status, currency, price, compare_at_price,
  theme, content, sections, pixel_id, capi_test_event_code,
  whatsapp_number, show_on_homepage, template_type, created_at, updated_at
) on table public.products to anon, authenticated;
