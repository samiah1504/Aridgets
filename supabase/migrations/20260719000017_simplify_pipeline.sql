-- Simplify the lead pipeline: Crift Shop is a sales-page + lead-gen platform,
-- not an order fulfilment system. Remove fulfilment statuses (delivery, paid)
-- and replace with: new, confirmed, not_buying, cancelled, not_picking_calls.

alter table public.leads drop constraint if exists leads_status_check;

-- Map old statuses onto the new pipeline
update public.leads set status = 'confirmed' where status in ('buying', 'delivery', 'paid');

alter table public.leads
  add constraint leads_status_check
  check (status in ('new', 'confirmed', 'not_buying', 'cancelled', 'not_picking_calls'));

-- Timestamp for when a lead drops out of the pipeline
-- (not_buying / cancelled / not_picking_calls). Cleared on reopen.
alter table public.leads add column if not exists dropped_at timestamptz;

-- Fulfilment timestamps no longer apply
alter table public.leads drop column if exists dispatched_at;
alter table public.leads drop column if exists paid_at;

-- Dispatch role policies referenced fulfilment statuses — scope to confirmed leads
drop policy if exists "dispatch_read_leads" on public.leads;
create policy "dispatch_read_leads"
  on public.leads for select
  to authenticated
  using (
    get_user_role() = 'dispatch'
    and status = 'confirmed'
  );

drop policy if exists "dispatch_update_leads" on public.leads;
create policy "dispatch_update_leads"
  on public.leads for update
  to authenticated
  using (
    get_user_role() = 'dispatch'
    and status = 'confirmed'
  )
  with check (get_user_role() = 'dispatch');
