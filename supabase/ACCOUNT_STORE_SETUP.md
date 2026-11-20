# Account inventory setup

This feature is for accounts the store owns or is authorized to resell. Passwords are encrypted by the Edge Function before they are stored. Customers receive credentials only after an admin checks the UPI UTR/RRN and approves the order.

1. Run [`account_store.sql`](./account_store.sql) in the Supabase SQL Editor.
2. Create or choose an admin user in Supabase Auth, then set `store_admin: true` in that user's **app metadata**. Do not use user metadata for this flag. For example, from the SQL Editor, replace the email and run:

   ```sql
   update auth.users
      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"store_admin": true}'::jsonb
    where email = 'admin@example.com';
   ```

3. Generate a random 32-byte encryption key and save it as the `ACCOUNT_ENCRYPTION_KEY` Edge Function secret. It must be exactly 64 hexadecimal characters. Keep a secure backup: existing encrypted passwords cannot be decrypted if this key is lost or changed.
4. Deploy the `account-store` Edge Function. `supabase/config.toml` disables the platform JWT check for this function; the function's Supabase server wrapper validates either a signed-in user or the publishable key, and admin operations additionally require `app_metadata.store_admin === true`.
5. Sign in at `/admin` with the admin user's Supabase Auth email and password. Add account credentials; tick **Aadhaar verified** to count the account in the Aadhaar section. Set the normal and Aadhaar prices in **Products**, then review submitted orders. Each order type is fulfilled only from its matching inventory. Check the UTR/RRN against the payment before selecting **Verify payment & release**.

The storefront QR is static UPI, so payment is not verified automatically. A pending order does not reserve inventory; inventory is assigned atomically when an admin approves it. Customers need their order ID and access code to retrieve credentials from **Find ID** after approval.

Product stock counts come only from `account_store_settings`, recalculated from available rows in `account_inventory`. The `aadhaar_verified` column determines whether an account contributes to `aadhaar_available_count` or the normal `available_count`; the legacy `aadhaar_inventory` aggregate is not used by the storefront.
