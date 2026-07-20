-- Meta Pixel & CAPI Testing Center
-- Every pixel/CAPI event Aridgets fires is logged here so the Tracking Center
-- can show live status, per-lead event timelines, and dedup diagnostics.

create table if not exists public.tracking_events (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  lead_id    uuid references public.leads(id) on delete cascade,
  session_id text,
  event_name text not null check (event_name in ('PageView', 'ViewContent', 'Lead', 'Contact', 'Purchase')),
  event_id   text,
  source     text not null check (source in ('browser', 'server')),
  -- sent: fired; confirmed: Meta acknowledged receipt (CAPI); failed: error
  status     text not null default 'sent' check (status in ('sent', 'confirmed', 'failed')),
  error      text,
  test       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_tracking_events_product on public.tracking_events (product_id, created_at desc);
create index if not exists idx_tracking_events_lead on public.tracking_events (lead_id);
create index if not exists idx_tracking_events_session on public.tracking_events (session_id);

alter table public.tracking_events enable row level security;

-- Rows are written only via the service role (beacon + CAPI logging).
-- Staff with tracking or analytics access can read.
drop policy if exists "tracking_events_read" on public.tracking_events;
create policy "tracking_events_read" on public.tracking_events for select to authenticated
  using (has_perm('tracking.view') or has_perm('tracking.edit') or has_perm('analytics.view'));

-- Test Mode: test orders are tagged and kept out of real stats
alter table public.leads add column if not exists is_test boolean not null default false;
alter table public.leads add column if not exists tracking_session_id text;
