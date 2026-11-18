-- Aggregate inventory only. Do not put Aadhaar numbers, names, photos, or IDs here.
create table if not exists public.aadhaar_inventory (
  product_key text primary key check (product_key = 'aadhaar'),
  available_count integer not null default 0 check (available_count >= 0),
  updated_at timestamptz not null default now()
);

insert into public.aadhaar_inventory (product_key, available_count)
values ('aadhaar', 0)
on conflict (product_key) do nothing;

alter table public.aadhaar_inventory enable row level security;
revoke all on table public.aadhaar_inventory from anon, authenticated;
grant select on table public.aadhaar_inventory to anon, authenticated;

drop policy if exists "Public can read Aadhaar stock count" on public.aadhaar_inventory;
create policy "Public can read Aadhaar stock count"
on public.aadhaar_inventory
for select
to anon, authenticated
using (true);
