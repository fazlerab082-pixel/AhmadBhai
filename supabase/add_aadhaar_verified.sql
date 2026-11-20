-- Apply this in Supabase SQL Editor for an existing account-store database.
-- Existing rows default to Normal until they are explicitly marked verified.
alter table public.account_inventory
  add column if not exists aadhaar_verified boolean not null default false;

alter table public.account_store_settings
  add column if not exists aadhaar_available_count integer not null default 0 check (aadhaar_available_count >= 0);

-- Rebuild both storefront counts from the account-level category flag.
update public.account_store_settings
   set available_count = (
         select count(*)::integer
           from public.account_inventory
          where status = 'available' and not aadhaar_verified
       ),
       aadhaar_available_count = (
         select count(*)::integer
           from public.account_inventory
          where status = 'available' and aadhaar_verified
       ),
       updated_at = now()
 where id = true;

-- Confirm the column and the rebuilt totals.
select column_name, data_type, is_nullable, column_default
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'account_inventory'
   and column_name = 'aadhaar_verified';

select available_count, aadhaar_available_count
  from public.account_store_settings
 where id = true;
