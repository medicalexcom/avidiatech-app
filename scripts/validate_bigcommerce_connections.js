// scripts/validate_bigcommerce_connections.js
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... INTEGRATIONS_ENCRYPTION_KEY=... node scripts/validate_bigcommerce_connections.js

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

function keyBytes(RAW_KEY) {
  if (!RAW_KEY) throw new Error("INTEGRATIONS_ENCRYPTION_KEY is not set");
  if (/^[0-9a-fA-F]+$/.test(RAW_KEY) && RAW_KEY.length === 64) return Buffer.from(RAW_KEY, "hex");
  return Buffer.from(RAW_KEY, "base64");
}

function decryptSecrets(blob, RAW_KEY) {
  const key = keyBytes(RAW_KEY);
  const raw = Buffer.from(blob, "base64");
  const iv = raw.slice(0, 12);
  const tag = raw.slice(12, 28);
  const ciphertext = raw.slice(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(out.toString("utf8"));
}

async function validateBC(storeHash, token) {
  const url = `https://api.bigcommerce.com/stores/${encodeURIComponent(storeHash)}/v3/catalog/products?limit=1`;
  const res = await fetch(url, { headers: { "X-Auth-Token": token, Accept: "application/json" } });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text };
}

(async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RAW_KEY = process.env.INTEGRATIONS_ENCRYPTION_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  if (!RAW_KEY) {
    console.error("Need INTEGRATIONS_ENCRYPTION_KEY to decrypt secrets");
    process.exit(1);
  }

  const supa = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  const { data: rows, error } = await supa
    .from("ecommerce_connections")
    .select("id, tenant_id, platform, status, config, secrets_enc, created_at")
    .eq("platform", "bigcommerce")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase query error:", error);
    process.exit(2);
  }
  for (const r of rows || []) {
    try {
      const storeHash = (r.config && (r.config.store_hash ?? r.config.storeHash)) || "<no-store>";
      if (!r.secrets_enc) {
        console.log(`${r.id} tenant=${r.tenant_id} store=${storeHash} -> NO secrets_enc`);
        continue;
      }
      let secrets;
      try {
        secrets = decryptSecrets(r.secrets_enc, RAW_KEY);
      } catch (e) {
        console.log(`${r.id} tenant=${r.tenant_id} store=${storeHash} -> decrypt failed: ${String(e.message || e)}`);
        continue;
      }
      const token = secrets.access_token ?? secrets.accessToken ?? secrets.token ?? secrets.accessToken;
      if (!token) {
        console.log(`${r.id} tenant=${r.tenant_id} store=${storeHash} -> no access token in decrypted secrets`);
        continue;
      }
      const test = await validateBC(storeHash, token);
      console.log(`${r.id} tenant=${r.tenant_id} store=${storeHash} -> bc ok=${test.ok} status=${test.status} bodySample=${String(test.body).slice(0,200)}`);
    } catch (err) {
      console.error("row error", err);
    }
  }
  process.exit(0);
})();
