import { withSupabase } from "@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function refreshStockCounts(db: any) {
  const { data: accounts, error: inventoryError } = await db
    .from("account_inventory")
    .select("aadhaar_verified")
    .eq("status", "available");
  if (inventoryError) return inventoryError;
  const aadhaarCount = (accounts ?? []).filter((account: { aadhaar_verified: boolean }) => account.aadhaar_verified).length;
  const normalCount = (accounts ?? []).length - aadhaarCount;
  const { error } = await db.from("account_store_settings").update({
    available_count: normalCount,
    aadhaar_available_count: aadhaarCount,
    updated_at: new Date().toISOString(),
  }).eq("id", true);
  return error;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashAccessCode(code: string) {
  const bytes = new TextEncoder().encode(code);
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}

async function encryptionKey() {
  const secret = Deno.env.get("ACCOUNT_ENCRYPTION_KEY") ?? "";
  if (!/^[0-9a-fA-F]{64}$/.test(secret)) {
    throw new Error("ACCOUNT_ENCRYPTION_KEY must be 64 hexadecimal characters");
  }
  const raw = Uint8Array.from(secret.match(/.{2}/g)!, (byte) => Number.parseInt(byte, 16));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptPassword(password: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(),
    new TextEncoder().encode(password),
  );
  return `v1.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(encrypted))}`;
}

async function decryptPassword(ciphertext: string) {
  const [version, encodedIv, encodedCiphertext] = ciphertext.split(".");
  if (version !== "v1" || !encodedIv || !encodedCiphertext) throw new Error("Unsupported encrypted password");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64Url(encodedIv) },
    await encryptionKey(),
    fromBase64Url(encodedCiphertext),
  );
  return new TextDecoder().decode(decrypted);
}

async function handleRequest(req: Request, ctx: any) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const action = String(body.action ?? "");
  const isAdmin = ctx.authMode === "user" && ctx.jwtClaims?.app_metadata?.store_admin === true;
  const db = ctx.supabaseAdmin;

  if (action === "submitOrder") {
    const quantity = Number(body.quantity);
    const amount = Number(body.amount);
    const accountType = body.accountType === "aadhaar" ? "aadhaar" : "normal";
    const utr = String(body.utr ?? "").trim().toUpperCase();
    const accessCode = String(body.accessCode ?? "");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return json({ error: "Choose between 1 and 20 accounts." }, 400);
    }
    if (!/^[A-Z0-9-]{6,40}$/.test(utr)) return json({ error: "Enter a valid UTR/RRN number." }, 400);
    if (!/^[A-Fa-f0-9]{64}$/.test(accessCode)) return json({ error: "Order access code is invalid." }, 400);

    const { data: settings, error: settingsError } = await db
      .from("account_store_settings")
      .select("price_per_account, aadhaar_price_per_account, available_count, aadhaar_available_count")
      .eq("id", true)
      .single();
    if (settingsError || !settings) return json({ error: "Store settings are unavailable." }, 503);
    const availableCount = accountType === "aadhaar" ? settings.aadhaar_available_count : settings.available_count;
    const pricePerAccount = accountType === "aadhaar" ? settings.aadhaar_price_per_account : settings.price_per_account;
    if (quantity > availableCount) return json({ error: "There is not enough stock for this quantity." }, 409);

    const expectedAmount = Math.round(Number(pricePerAccount) * quantity * 100);
    if (!Number.isFinite(amount) || Math.round(amount * 100) !== expectedAmount) {
      return json({ error: "The order amount changed. Refresh the store and try again." }, 409);
    }

    const accessTokenHash = await hashAccessCode(accessCode);
    const { data: order, error } = await db
      .from("account_store_orders")
      .insert({
        utr,
        quantity,
        account_type: accountType,
        amount: expectedAmount / 100,
        access_token_hash: accessTokenHash,
      })
      .select("id, quantity, amount, account_type, status")
      .single();
    if (error) {
      if (error.code === "23505") {
        const { data: existingOrder } = await db
          .from("account_store_orders")
          .select("id, quantity, amount, account_type, status")
          .eq("utr", utr)
          .eq("access_token_hash", accessTokenHash)
          .maybeSingle();
        if (existingOrder) return json({ order: existingOrder });
        return json({ error: "This UTR/RRN is already attached to an order." }, 409);
      }
      console.error("Could not create account store order:", error.code ?? "unknown");
      return json({ error: "Could not submit the order. Please try again." }, 500);
    }
    return json({ order });
  }

  if (action === "lookupOrder") {
    const orderId = String(body.orderId ?? "");
    const accessCode = String(body.accessCode ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(orderId) || !/^[A-Fa-f0-9]{64}$/.test(accessCode)) {
      return json({ error: "Enter the order ID and access code." }, 400);
    }
    const { data: order, error } = await db
      .from("account_store_orders")
      .select("id, quantity, amount, status, created_at, fulfilled_at")
      .eq("id", orderId)
      .eq("access_token_hash", await hashAccessCode(accessCode))
      .maybeSingle();
    if (error || !order) return json({ error: "Order not found. Check the order ID and access code." }, 404);
    if (order.status !== "fulfilled") return json({ order, accounts: [] });

    const { data: links, error: linksError } = await db
      .from("account_store_order_items")
      .select("account_id")
      .eq("order_id", order.id);
    if (linksError || !links) return json({ error: "Could not load the fulfilled order." }, 500);
    const accountIds = links.map((link: { account_id: string }) => link.account_id);
    const { data: accounts, error: accountsError } = await db
      .from("account_inventory")
      .select("id, username, password_ciphertext")
      .in("id", accountIds);
    if (accountsError || !accounts) return json({ error: "Could not load the fulfilled order." }, 500);
    const deliveredAccounts = await Promise.all(accounts.map(async (account: { username: string; password_ciphertext: string }) => ({
      username: account.username,
      password: await decryptPassword(account.password_ciphertext),
    })));
    return json({ order, accounts: deliveredAccounts });
  }

  if (!isAdmin) return json({ error: "Admin access is required." }, 403);

  if (action === "listAccounts") {
    const countError = await refreshStockCounts(db);
    if (countError) console.error("Could not refresh account store counts:", countError.code ?? "unknown");
    const { data, error } = await db
      .from("account_inventory")
      .select("id, username, aadhaar_verified, status, created_at")
      .order("created_at", { ascending: false });
    if (error) return json({ error: "Could not load account inventory." }, 500);
    return json({ accounts: data ?? [] });
  }

  if (action === "addAccount") {
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    const aadhaarVerified = body.aadhaarVerified === true;
    if (!username || username.length > 160 || !password || password.length > 1024) {
      return json({ error: "Enter a username and password within the allowed length." }, 400);
    }
    const { error } = await db.from("account_inventory").insert({
      username,
      password_ciphertext: await encryptPassword(password),
      aadhaar_verified: aadhaarVerified,
    });
    if (error) {
      if (error.code === "23505") return json({ error: "That username is already in the inventory." }, 409);
      console.error("Could not add account inventory:", error.code ?? "unknown");
      return json({ error: "Could not add the account." }, 500);
    }
    const countError = await refreshStockCounts(db);
    if (countError) console.error("Could not refresh account store counts:", countError.code ?? "unknown");
    return json({ ok: true });
  }

  if (action === "deleteAccount") {
    const id = String(body.id ?? "");
    const { data: account, error: lookupError } = await db
      .from("account_inventory")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();
    if (lookupError || !account) return json({ error: "Account not found." }, 404);
    if (account.status !== "available") return json({ error: "Sold accounts cannot be removed from order history." }, 409);
    const { error } = await db.from("account_inventory").delete().eq("id", id).eq("status", "available");
    if (error) return json({ error: "Could not remove the account." }, 500);
    const countError = await refreshStockCounts(db);
    if (countError) console.error("Could not refresh account store counts:", countError.code ?? "unknown");
    return json({ ok: true });
  }

  if (action === "listOrders") {
    const { data, error } = await db
      .from("account_store_orders")
      .select("id, utr, account_type, quantity, amount, status, created_at, fulfilled_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return json({ error: "Could not load orders." }, 500);
    return json({ orders: data ?? [] });
  }

  if (action === "approveOrder") {
    const orderId = String(body.orderId ?? "");
    const { error } = await db.rpc("claim_account_store_order", { p_order_id: orderId });
    if (error) {
      const message = error.message.includes("Not enough available accounts")
        ? "There is not enough available inventory to fulfil this order."
        : error.message.includes("already been processed")
          ? "This order has already been processed."
          : "Could not fulfil this order.";
      return json({ error: message }, 409);
    }
    return json({ ok: true });
  }

  if (action === "setPrice") {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0 || price > 100000) return json({ error: "Enter a valid price." }, 400);
    const roundedPrice = Math.round(price * 100) / 100;
    const priceColumn = body.accountType === "aadhaar" ? "aadhaar_price_per_account" : "price_per_account";
    const { error } = await db.from("account_store_settings").update({ [priceColumn]: roundedPrice, updated_at: new Date().toISOString() }).eq("id", true);
    if (error) return json({ error: "Could not save the account price." }, 500);
    return json({ ok: true });
  }

  return json({ error: "Unknown action." }, 400);
}

const handler = withSupabase({ auth: ["user", "publishable"] }, handleRequest);
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const response = await handler(req);
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([name, value]) => headers.set(name, value));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
});
