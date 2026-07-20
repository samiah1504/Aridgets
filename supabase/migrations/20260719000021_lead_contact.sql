-- Serious-buyer confirmation, follow-up scheduling, and contact-activity tracking

alter table public.leads add column if not exists buyer_confirmed boolean not null default false;
alter table public.leads add column if not exists follow_up_at timestamptz;
alter table public.leads add column if not exists last_contacted_at timestamptz;

-- Activity log per lead (call/WhatsApp opened, contacted, etc.)
create table if not exists public.lead_activities (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete set null,
  actor_name text,
  kind       text not null check (kind in ('call_opened', 'whatsapp_opened', 'contacted', 'note')),
  detail     text,
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_activities_lead_id on public.lead_activities (lead_id, created_at desc);

alter table public.lead_activities enable row level security;

-- Visible/insertable only for leads the caller can already see — the subquery
-- runs under the caller's own leads RLS, so assignment scoping carries over.
drop policy if exists "lead_activities_read" on public.lead_activities;
create policy "lead_activities_read" on public.lead_activities for select to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_id));

drop policy if exists "lead_activities_insert" on public.lead_activities;
create policy "lead_activities_insert" on public.lead_activities for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.leads l where l.id = lead_id)
  );
