-- Private inventory for first-party digital accounts.
-- Run once in the Supabase SQL Editor before deploying the account-store function.

create table if not exists public.account_store_settings (
  id boolean primary key default true check (id),
  price_per_account numeric(10, 2) not null default 35 check (price_per_account >= 0),
  aadhaar_price_per_account numeric(10, 2) not null default 249 check (aadhaar_price_per_account >= 0),
  available_count integer not null default 0 check (available_count >= 0),
  aadhaar_available_count integer not null default 0 check (aadhaar_available_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.account_store_settings
  add column if not exists aadhaar_available_count integer not null default 0 check (aadhaar_available_count >= 0);
alter table public.account_store_settings
  add column if not exists aadhaar_price_per_account numeric(10, 2) not null default 249 check (aadhaar_price_per_account >= 0);

insert into public.account_store_settings (id, price_per_account, available_count)
values (true, 35, 0)
on conflict (id) do nothing;

create table if not exists public.account_inventory (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_ciphertext text not null,
  aadhaar_verified boolean not null default false,
  status text not null default 'available' check (status in ('available', 'sold')),
  created_at timestamptz not null default now()
);

alter table public.account_inventory
  add column if not exists aadhaar_verified boolean not null default false;

create unique index if not exists account_inventory_username_ci_idx
  on public.account_inventory (lower(username));

create table if not exists public.account_store_orders (
  id uuid primary key default gen_random_uuid(),
  access_token_hash text not null,
  utr text not null unique,
  account_type text not null default 'normal' check (account_type in ('normal', 'aadhaar')),
  quantity integer not null check (quantity between 1 and 20),
  amount numeric(10, 2) not null check (amount >= 0),
  status text not null default 'pending_review' check (status in ('pending_review', 'fulfilled')),
  created_at timestamptz not null default now(),
  fulfilled_at timestamptz
);

alter table public.account_store_orders
  add column if not exists account_type text not null default 'normal' check (account_type in ('normal', 'aadhaar'));

create table if not exists public.account_store_order_items (
  order_id uuid not null references public.account_store_orders(id) on delete cascade,
  account_id uuid not null references public.account_inventory(id),
  primary key (order_id, account_id),
  unique (account_id)
);

alter table public.account_store_settings enable row level security;
alter table public.account_inventory enable row level security;
alter table public.account_store_orders enable row level security;
alter table public.account_store_order_items enable row level security;

revoke all on table public.account_store_settings from public, anon, authenticated;
revoke all on table public.account_inventory from public, anon, authenticated;
revoke all on table public.account_store_orders from public, anon, authenticated;
revoke all on table public.account_store_order_items from public, anon, authenticated;

grant select on table public.account_store_settings to anon, authenticated;
grant all on table public.account_store_settings to service_role;
grant all on table public.account_inventory to service_role;
grant all on table public.account_store_orders to service_role;
grant all on table public.account_store_order_items to service_role;

drop policy if exists "Public can read account store settings" on public.account_store_settings;
create policy "Public can read account store settings"
  on public.account_store_settings
  for select
  to anon, authenticated
  using (true);

create or replace function public.refresh_account_store_available_count()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.account_store_settings
     set available_count = (select count(*)::integer from public.account_inventory where status = 'available' and not aadhaar_verified),
         aadhaar_available_count = (select count(*)::integer from public.account_inventory where status = 'available' and aadhaar_verified),
         updated_at = now()
   where id = true;
  return null;
end;
$$;

revoke all on function public.refresh_account_store_available_count() from public, anon, authenticated;
drop trigger if exists refresh_account_store_available_count on public.account_inventory;
create trigger refresh_account_store_available_count
  after insert or update or delete on public.account_inventory
  for each statement execute function public.refresh_account_store_available_count();

create or replace function public.claim_account_store_order(p_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.account_store_orders%rowtype;
  v_claimed_count integer;
begin
  select *
    into v_order
    from public.account_store_orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.status <> 'pending_review' then
    raise exception 'Order has already been processed';
  end if;

  with picked as (
    select id
      from public.account_inventory
     where status = 'available'
       and aadhaar_verified = (v_order.account_type = 'aadhaar')
     order by created_at, id
     for update skip locked
     limit v_order.quantity
  ), linked as (
    insert into public.account_store_order_items (order_id, account_id)
    select v_order.id, picked.id
      from picked
    returning account_id
  ), marked as (
    update public.account_inventory as inventory
       set status = 'sold'
      from linked
     where inventory.id = linked.account_id
    returning inventory.id
  )
  select count(*) into v_claimed_count from marked;

  if v_claimed_count <> v_order.quantity then
    raise exception 'Not enough available accounts to fulfill this order';
  end if;

  update public.account_store_orders
     set status = 'fulfilled', fulfilled_at = now()
   where id = v_order.id;

  update public.account_store_settings
     set available_count = (select count(*)::integer from public.account_inventory where status = 'available' and not aadhaar_verified),
         aadhaar_available_count = (select count(*)::integer from public.account_inventory where status = 'available' and aadhaar_verified),
         updated_at = now()
   where id = true;
end;
$$;

revoke all on function public.claim_account_store_order(uuid) from public, anon, authenticated;
grant execute on function public.claim_account_store_order(uuid) to service_role;
