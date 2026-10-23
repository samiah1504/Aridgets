-- Payments, Delivered/Paid statuses and reliable Meta Purchase events.
--
-- * Orders gain Delivered and Paid statuses.
-- * Payments are recorded in lead_payments (partial payments allowed); an
--   order becomes Paid only when its payments cover the order total.
-- * The Meta Purchase event is now sent when an order becomes Paid (it used
--   to be sent on confirmation). Its delivery state is tracked on the lead
--   so failures are visible and can be retried with the same event ID.
-- * Existing orders keep their data: nothing is marked paid, no payment
--   history is invented. Orders whose Purchase was already sent at
--   confirmation are recorded as sent and will not be sent again.

-- ── Statuses ────────────────────────────────────────────────────────────────
alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in ('new', 'confirmed', 'delivered', 'paid', 'not_buying', 'cancelled', 'not_picking_calls'));

alter table public.leads add column if not exists delivered_at timestamptz;

-- ── Payment summary on the lead (maintained only by record_lead_payment) ─────
alter table public.leads add column if not exists amount_paid integer not null default 0
  check (amount_paid >= 0);
alter table public.leads add column if not exists payment_currency text not null default 'NGN';
alter table public.leads add column if not exists paid_at timestamptz;
alter table public.leads add column if not exists paid_by uuid references public.profiles(id) on delete set null;

-- ── Purchase event delivery state ───────────────────────────────────────────
-- event_id_purchase (existing) is the one logical event ID, reused on retry.
alter table public.leads add column if not exists purchase_event_status text
  check (purchase_event_status in ('pending', 'sent', 'failed'));
alter table public.leads add column if not exists purchase_event_value integer;
alter table public.leads add column if not exists purchase_event_attempts integer not null default 0;
alter table public.leads add column if not exists purchase_event_last_attempt_at timestamptz;
-- Set while an attempt is in flight; cleared when it finishes
alter table public.leads add column if not exists purchase_event_locked_until timestamptz;
alter table public.leads add column if not exists purchase_event_sent_at timestamptz;
alter table public.leads add column if not exists purchase_event_error text;
-- 'paid' (current rule) or 'confirmed_legacy' (sent on confirmation before this change)
alter table public.leads add column if not exists purchase_event_trigger text;

-- Purchases already sent under the old confirm-time rule
update public.leads
set purchase_event_status = 'sent',
    purchase_event_trigger = 'confirmed_legacy',
    purchase_event_value = coalesce(purchase_event_value, total)
where event_id_purchase is not null and purchase_event_status is null;

create index if not exists idx_leads_purchase_event_status
  on public.leads (purchase_event_status) where purchase_event_status in ('pending', 'failed');

-- ── Payments ────────────────────────────────────────────────────────────────
create table if not exists public.lead_payments (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null references public.leads(id) on delete cascade,
  amount          integer not null check (amount > 0),
  currency        text not null default 'NGN' check (currency = 'NGN'),
  note            text,
  recorded_by     uuid references public.profiles(id) on delete set null,
  idempotency_key text not null unique,
  created_at      timestamptz not null default now()
);

create index if not exists idx_lead_payments_lead on public.lead_payments (lead_id, created_at);

alter table public.lead_payments enable row level security;

-- Visible to anyone who can see the lead (leads RLS applies in the subquery).
-- No insert/update/delete policies: payments are written only by
-- record_lead_payment() below.
drop policy if exists "lead_payments_read" on public.lead_payments;
create policy "lead_payments_read" on public.lead_payments for select to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_id));

-- ── Guard: payment fields and Paid status only via the payment function ────
create or replace function public.guard_lead_payment_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service role (server routes) and record_lead_payment() are trusted
  if auth.uid() is null or current_setting('aridgets.payment_write', true) = 'on' then
    return new;
  end if;

  if new.amount_paid is distinct from old.amount_paid
     or new.payment_currency is distinct from old.payment_currency
     or new.paid_at is distinct from old.paid_at
     or new.paid_by is distinct from old.paid_by
     or new.event_id_purchase is distinct from old.event_id_purchase
     or new.purchase_event_status is distinct from old.purchase_event_status
     or new.purchase_event_value is distinct from old.purchase_event_value
     or new.purchase_event_attempts is distinct from old.purchase_event_attempts
     or new.purchase_event_last_attempt_at is distinct from old.purchase_event_last_attempt_at
     or new.purchase_event_locked_until is distinct from old.purchase_event_locked_until
     or new.purchase_event_sent_at is distinct from old.purchase_event_sent_at
     or new.purchase_event_error is distinct from old.purchase_event_error
     or new.purchase_event_trigger is distinct from old.purchase_event_trigger
     or new.total is distinct from old.total
     or new.unit_price is distinct from old.unit_price
     or new.quantity is distinct from old.quantity then
    raise exception 'Payments and order amounts can only be changed through the payment workflow';
  end if;

  if new.status = 'paid' and old.status is distinct from 'paid' then
    if not has_perm('leads.mark_paid') then
      raise exception 'You do not have permission to mark orders as paid';
    end if;
    if new.amount_paid < new.total then
      raise exception 'This order is not fully paid yet — record the payment first';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists leads_payment_guard on public.leads;
create trigger leads_payment_guard before update on public.leads
  for each row execute function public.guard_lead_payment_fields();

-- ── Record a payment (idempotent, concurrency-safe) ─────────────────────────
-- Called by signed-in staff (via the API). Locks the order row, rejects
-- overpayment, and when payments cover the total marks the order Paid and
-- queues the Purchase event (unless one was already sent for this order).
create or replace function public.record_lead_payment(
  p_lead_id uuid,
  p_amount integer,
  p_idempotency_key text,
  p_note text default null
)
returns table (
  lead_id uuid,
  status text,
  total integer,
  amount_paid integer,
  outstanding integer,
  became_paid boolean,
  purchase_event_status text,
  duplicate boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads%rowtype;
  v_existing public.lead_payments%rowtype;
  v_paid integer;
  v_became_paid boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;
  if not has_perm('leads.mark_paid') then
    raise exception 'You do not have permission to record payments';
  end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 then
    raise exception 'Missing idempotency key';
  end if;

  -- Lock the order; concurrent payments for it queue up here
  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then
    raise exception 'Order not found';
  end if;
  -- The caller must be allowed to see this order (respects assignment scoping)
  if not (
    has_perm('leads.view_all')
    or (has_perm('leads.view_assigned') and (
      v_lead.assigned_to = auth.uid()
      or v_lead.product_id in (select product_id from public.product_assignments where profile_id = auth.uid())
    ))
  ) then
    raise exception 'Order not found';
  end if;
  -- Same request repeated (double click, retry, refresh): checked after the
  -- row lock, so a concurrent duplicate waits and then sees the first insert
  select * into v_existing from public.lead_payments lp where lp.idempotency_key = p_idempotency_key;
  if found then
    if v_existing.lead_id <> p_lead_id then
      raise exception 'Idempotency key already used for another order';
    end if;
    return query select v_lead.id, v_lead.status, v_lead.total, v_lead.amount_paid,
      greatest(v_lead.total - v_lead.amount_paid, 0), false, v_lead.purchase_event_status, true;
    return;
  end if;
  if v_lead.status in ('cancelled', 'not_buying') then
    raise exception 'This order is %; reopen it before recording a payment', replace(v_lead.status, '_', ' ');
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount greater than zero';
  end if;
  if v_lead.amount_paid + p_amount > v_lead.total then
    raise exception 'Amount is more than the outstanding balance of %', v_lead.total - v_lead.amount_paid;
  end if;

  insert into public.lead_payments (lead_id, amount, note, recorded_by, idempotency_key)
  values (p_lead_id, p_amount, nullif(trim(p_note), ''), auth.uid(), p_idempotency_key);

  v_paid := v_lead.amount_paid + p_amount;

  perform set_config('aridgets.payment_write', 'on', true);

  if v_paid >= v_lead.total and v_lead.status <> 'paid' then
    v_became_paid := true;
    update public.leads l set
      amount_paid = v_paid,
      status = 'paid',
      paid_at = now(),
      paid_by = auth.uid(),
      dropped_at = null,
      event_id_purchase = coalesce(l.event_id_purchase, gen_random_uuid()::text),
      -- Never re-send a Purchase that was already sent for this order
      purchase_event_status = case when l.purchase_event_status = 'sent' then 'sent' else 'pending' end,
      purchase_event_value = case when l.purchase_event_status = 'sent' then l.purchase_event_value else v_paid end,
      purchase_event_trigger = coalesce(l.purchase_event_trigger, 'paid')
    where l.id = p_lead_id;
  else
    update public.leads l set amount_paid = v_paid where l.id = p_lead_id;
  end if;

  perform set_config('aridgets.payment_write', 'off', true);

  perform log_audit(
    case when v_became_paid then 'lead.marked_paid' else 'lead.payment_recorded' end,
    'lead', p_lead_id::text,
    jsonb_build_object('order_number', v_lead.order_number, 'amount', p_amount,
      'amount_paid', v_paid, 'total', v_lead.total, 'currency', 'NGN')
  );

  select * into v_lead from public.leads where id = p_lead_id;
  return query select v_lead.id, v_lead.status, v_lead.total, v_lead.amount_paid,
    greatest(v_lead.total - v_lead.amount_paid, 0), v_became_paid, v_lead.purchase_event_status, false;
end;
$$;

revoke all on function public.record_lead_payment(uuid, integer, text, text) from public, anon;
grant execute on function public.record_lead_payment(uuid, integer, text, text) to authenticated;

-- ── Claim one Purchase delivery attempt (server only) ───────────────────────
-- Atomically marks an attempt as in flight so two attempts for the same
-- order never run together. The lock is released when the attempt finishes
-- (or expires after p_lock_seconds if the server died mid-attempt).
-- Returns the order row if this caller won.
create or replace function public.claim_purchase_event(p_lead_id uuid, p_lock_seconds integer default 60)
returns setof public.leads
language sql
security definer
set search_path = public
as $$
  update public.leads
     set purchase_event_last_attempt_at = now(),
         purchase_event_locked_until = now() + make_interval(secs => p_lock_seconds)
   where id = p_lead_id
     and purchase_event_status in ('pending', 'failed')
     and (purchase_event_locked_until is null or purchase_event_locked_until < now())
  returning *;
$$;

revoke all on function public.claim_purchase_event(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_purchase_event(uuid, integer) to service_role;
