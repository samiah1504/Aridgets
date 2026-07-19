-- ─────────────────────────────────────────────────────────────────────────────
-- Role-Based Access Control (RBAC)
-- Roles hold granular permission keys; profiles reference a role; RLS is
-- rewritten around has_perm(). Adds product assignment (support agents only
-- see leads for products assigned to them) and an audit log.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Roles ────────────────────────────────────────────────────────────────────
create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  name        text not null,
  description text,
  is_system   boolean not null default false,
  permissions text[] not null default '{}',
  created_at  timestamptz not null default now()
);

alter table public.roles enable row level security;

insert into public.roles (key, name, description, is_system, permissions) values
  ('super_admin', 'Super Admin', 'Full access to everything.', true, array['*']),
  ('customer_support', 'Customer Support', 'Contacts customers and qualifies leads for assigned products only.', true,
    array['leads.view_assigned', 'leads.edit_notes', 'leads.change_status', 'customers.view_contact']),
  ('technical_officer', 'Technical Officer', 'Builds and maintains landing pages. No access to customer data.', true,
    array['products.view', 'products.create', 'products.edit', 'products.publish', 'products.archive', 'media.manage']),
  ('marketing_officer', 'Marketing Officer', 'Runs ads: views products, analytics and pixel status.', true,
    array['products.view', 'products.duplicate', 'analytics.view', 'tracking.view']),
  ('content_creator', 'Content Creator', 'Edits copy, testimonials, FAQ and media. Cannot publish.', true,
    array['products.view', 'products.edit', 'media.manage'])
on conflict (key) do nothing;

-- ── Profiles: role_id replaces the old text role; email mirrored for staff UI ─
alter table public.profiles add column if not exists role_id uuid references public.roles(id);
alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

update public.profiles p
set role_id = r.id
from public.roles r
where p.role_id is null
  and r.key = case
    when p.role in ('owner', 'admin') then 'super_admin'
    else 'customer_support'
  end;

alter table public.profiles drop column if exists role;

-- New auth users get a profile with no role (no access until assigned)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ── Permission helper ────────────────────────────────────────────────────────
create or replace function public.has_perm(p text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.profiles pr
    join public.roles r on r.id = pr.role_id
    where pr.id = auth.uid()
      and pr.active
      and (r.permissions @> array['*'] or r.permissions @> array[p])
  );
end;
$$;

-- ── Product assignment (customer support scoping) ────────────────────────────
create table if not exists public.product_assignments (
  product_id uuid not null references public.products(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, profile_id)
);

alter table public.product_assignments enable row level security;

-- ── Audit log ────────────────────────────────────────────────────────────────
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   text,
  detail      jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_log_created_at on public.audit_log (created_at desc);
alter table public.audit_log enable row level security;

-- Writes audit rows bypassing RLS; captures caller IP from PostgREST headers.
-- Skips system/service-role actions (auth.uid() is null) — API routes log
-- those explicitly with the acting user.
create or replace function public.log_audit(
  a text, etype text, eid text, d jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ip text;
begin
  if auth.uid() is null then
    return;
  end if;
  begin
    v_ip := split_part(current_setting('request.headers', true)::jsonb->>'x-forwarded-for', ',', 1);
  exception when others then
    v_ip := null;
  end;
  insert into public.audit_log (user_id, action, entity_type, entity_id, detail, ip)
  values (auth.uid(), a, etype, eid, d, nullif(v_ip, ''));
end;
$$;

-- ── Audit triggers ───────────────────────────────────────────────────────────
create or replace function public.audit_products()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform log_audit('product.created', 'product', new.id::text, jsonb_build_object('name', new.name));
  elsif tg_op = 'DELETE' then
    perform log_audit('product.deleted', 'product', old.id::text, jsonb_build_object('name', old.name));
  elsif old.status is distinct from new.status then
    perform log_audit('product.status_changed', 'product', new.id::text,
      jsonb_build_object('name', new.name, 'from', old.status, 'to', new.status));
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists products_audit_ins on public.products;
create trigger products_audit_ins after insert on public.products
  for each row execute function public.audit_products();
drop trigger if exists products_audit_upd on public.products;
create trigger products_audit_upd after update on public.products
  for each row when (old.status is distinct from new.status)
  execute function public.audit_products();
drop trigger if exists products_audit_del on public.products;
create trigger products_audit_del after delete on public.products
  for each row execute function public.audit_products();

create or replace function public.audit_leads()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    perform log_audit('lead.status_changed', 'lead', new.id::text,
      jsonb_build_object('order_number', new.order_number, 'from', old.status, 'to', new.status));
  end if;
  if old.assigned_to is distinct from new.assigned_to then
    perform log_audit('lead.assigned', 'lead', new.id::text,
      jsonb_build_object('order_number', new.order_number, 'assigned_to', new.assigned_to));
  end if;
  return new;
end;
$$;

drop trigger if exists leads_audit_upd on public.leads;
create trigger leads_audit_upd after update on public.leads
  for each row
  when (old.status is distinct from new.status or old.assigned_to is distinct from new.assigned_to)
  execute function public.audit_leads();

create or replace function public.audit_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role_id is distinct from new.role_id then
    perform log_audit('staff.role_changed', 'staff', new.id::text,
      jsonb_build_object('name', new.full_name, 'role_id', new.role_id));
  end if;
  if old.active is distinct from new.active then
    perform log_audit(case when new.active then 'staff.activated' else 'staff.deactivated' end,
      'staff', new.id::text, jsonb_build_object('name', new.full_name));
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_audit_upd on public.profiles;
create trigger profiles_audit_upd after update on public.profiles
  for each row
  when (old.role_id is distinct from new.role_id or old.active is distinct from new.active)
  execute function public.audit_profiles();

-- ── Publish/archive guard: status changes need the matching permission ───────
create or replace function public.guard_product_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service-role / system updates bypass the guard
  if auth.uid() is null then
    return new;
  end if;
  if new.status = 'archived' then
    if not has_perm('products.archive') then
      raise exception 'You do not have permission to archive products';
    end if;
  else
    if not has_perm('products.publish') then
      raise exception 'You do not have permission to publish or unpublish products';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists products_status_guard on public.products;
create trigger products_status_guard before update on public.products
  for each row when (old.status is distinct from new.status)
  execute function public.guard_product_status();

-- ─────────────────────────────────────────────────────────────────────────────
-- Rewrite RLS around has_perm()
-- ─────────────────────────────────────────────────────────────────────────────

-- roles: everyone reads (needed to resolve own permissions); manage is gated
drop policy if exists "roles_read" on public.roles;
create policy "roles_read" on public.roles for select to authenticated using (true);

drop policy if exists "roles_insert" on public.roles;
create policy "roles_insert" on public.roles for insert to authenticated
  with check (has_perm('roles.manage'));

drop policy if exists "roles_update" on public.roles;
create policy "roles_update" on public.roles for update to authenticated
  using (has_perm('roles.manage') and key <> 'super_admin')
  with check (has_perm('roles.manage'));

drop policy if exists "roles_delete" on public.roles;
create policy "roles_delete" on public.roles for delete to authenticated
  using (has_perm('roles.manage') and not is_system);

-- profiles
drop policy if exists "own_profile_select" on public.profiles;
create policy "own_profile_select" on public.profiles for select to authenticated
  using (id = auth.uid());

drop policy if exists "admin_profile_select" on public.profiles;
create policy "staff_view_profiles" on public.profiles for select to authenticated
  using (has_perm('staff.view'));

-- own_profile_update removed: users must not edit their own role
drop policy if exists "own_profile_update" on public.profiles;
drop policy if exists "owner_profile_update" on public.profiles;
create policy "staff_edit_profiles" on public.profiles for update to authenticated
  using (has_perm('staff.edit'))
  with check (has_perm('staff.edit'));

drop policy if exists "staff_delete_profiles" on public.profiles;
create policy "staff_delete_profiles" on public.profiles for delete to authenticated
  using (has_perm('staff.delete'));

-- settings
drop policy if exists "admins_read_settings" on public.settings;
create policy "settings_read" on public.settings for select to authenticated
  using (has_perm('settings.manage'));

drop policy if exists "admins_update_settings" on public.settings;
create policy "settings_update" on public.settings for update to authenticated
  using (has_perm('settings.manage'))
  with check (has_perm('settings.manage'));

-- products (public_read_live_products stays for the sales pages)
drop policy if exists "admin_manage_products" on public.products;

create policy "products_staff_read" on public.products for select to authenticated
  using (has_perm('products.view'));

create policy "products_create" on public.products for insert to authenticated
  with check (has_perm('products.create'));

create policy "products_edit" on public.products for update to authenticated
  using (has_perm('products.edit'))
  with check (has_perm('products.edit'));

create policy "products_delete" on public.products for delete to authenticated
  using (has_perm('products.delete'));

-- product_media (public read stays)
drop policy if exists "admin_manage_product_media" on public.product_media;
create policy "product_media_manage" on public.product_media for all to authenticated
  using (has_perm('products.edit') or has_perm('media.manage'))
  with check (has_perm('products.edit') or has_perm('media.manage'));

-- variations (anon read policies stay)
drop policy if exists "product_options_auth_all" on public.product_options;
create policy "product_options_manage" on public.product_options for all to authenticated
  using (has_perm('products.edit')) with check (has_perm('products.edit'));

drop policy if exists "product_option_values_auth_all" on public.product_option_values;
create policy "product_option_values_manage" on public.product_option_values for all to authenticated
  using (has_perm('products.edit')) with check (has_perm('products.edit'));

drop policy if exists "product_variants_auth_all" on public.product_variants;
create policy "product_variants_manage" on public.product_variants for all to authenticated
  using (has_perm('products.edit')) with check (has_perm('products.edit'));

drop policy if exists "product_variant_options_auth_all" on public.product_variant_options;
create policy "product_variant_options_manage" on public.product_variant_options for all to authenticated
  using (has_perm('products.edit')) with check (has_perm('products.edit'));

-- leads: view-all, or view-assigned scoped to assigned products / direct assignment
drop policy if exists "admin_manage_leads" on public.leads;
drop policy if exists "agent_read_leads" on public.leads;
drop policy if exists "agent_update_leads" on public.leads;
drop policy if exists "dispatch_read_leads" on public.leads;
drop policy if exists "dispatch_update_leads" on public.leads;

create policy "leads_read" on public.leads for select to authenticated
  using (
    has_perm('leads.view_all')
    or (
      has_perm('leads.view_assigned')
      and (
        assigned_to = auth.uid()
        or product_id in (
          select product_id from public.product_assignments where profile_id = auth.uid()
        )
      )
    )
  );

create policy "leads_update" on public.leads for update to authenticated
  using (
    (has_perm('leads.change_status') or has_perm('leads.edit_notes') or has_perm('leads.assign'))
    and (
      has_perm('leads.view_all')
      or (
        has_perm('leads.view_assigned')
        and (
          assigned_to = auth.uid()
          or product_id in (
            select product_id from public.product_assignments where profile_id = auth.uid()
          )
        )
      )
    )
  )
  with check (true);

-- public_insert_leads (order form) stays as-is

-- lead_status_history
drop policy if exists "staff_read_history" on public.lead_status_history;
create policy "history_read" on public.lead_status_history for select to authenticated
  using (has_perm('leads.view_all') or has_perm('leads.view_assigned'));

-- domains (public read stays)
drop policy if exists "admin_manage_domains" on public.domains;
create policy "domains_manage" on public.domains for all to authenticated
  using (has_perm('settings.manage'))
  with check (has_perm('settings.manage'));

-- ad_spend
drop policy if exists "admin_manage_ad_spend" on public.ad_spend;
create policy "ad_spend_manage" on public.ad_spend for all to authenticated
  using (has_perm('analytics.view'))
  with check (has_perm('analytics.view'));

-- product_assignments
drop policy if exists "assignments_read" on public.product_assignments;
create policy "assignments_read" on public.product_assignments for select to authenticated
  using (profile_id = auth.uid() or has_perm('staff.view'));

drop policy if exists "assignments_manage" on public.product_assignments;
create policy "assignments_manage" on public.product_assignments
  for insert to authenticated with check (has_perm('staff.assign_products'));

drop policy if exists "assignments_delete" on public.product_assignments;
create policy "assignments_delete" on public.product_assignments
  for delete to authenticated using (has_perm('staff.assign_products'));

-- audit_log: Super Admin (audit.view) reads; rows written via log_audit()
drop policy if exists "audit_read" on public.audit_log;
create policy "audit_read" on public.audit_log for select to authenticated
  using (has_perm('audit.view'));

-- get_user_role() is no longer referenced by any policy
drop function if exists public.get_user_role();

-- lead_status_history insert policy referenced roles implicitly via old grants;
-- ensure staff changing statuses can log history
drop policy if exists "staff_insert_history" on public.lead_status_history;
create policy "staff_insert_history" on public.lead_status_history for insert to authenticated
  with check (changed_by = auth.uid() and (has_perm('leads.change_status') or has_perm('leads.view_all')));
