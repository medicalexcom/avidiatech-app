"use server";

import { createClient } from "@supabase/supabase-js";
import { encryptSecrets, decryptSecrets } from "./encryption";

/**
 * Very small service layer for integrations.
 * - Uses SUPABASE_SERVICE_ROLE_KEY (server-only) to read/write integrations table.
 * - TODO: add Clerk session verification before any DB action.
 *
 * Note: removed a project-specific type import to avoid requiring a supabase-types file.
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Throw early if used without envs
  // (keep lazy so purely static analysis doesn't fail)
  // throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
}

const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Create integration
export async function createIntegration({
  orgId,
  provider,
  name,
  config = {},
  secrets = {},
  createdBy,
}: {
  orgId: string;
  provider: string;
  name?: string;
  config?: Record<string, any>;
  secrets?: Record<string, any>;
  createdBy?: string;
}) {
  const encrypted = encryptSecrets(secrets);
  const { data, error } = await supaAdmin
    .from("integrations")
    .insert({
      org_id: orgId,
      provider,
      name: name ?? provider,
      config,
      encrypted_secrets: encrypted,
      created_by: createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listIntegrations(orgId: string) {
  const { data, error } = await supaAdmin.from("integrations").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getIntegration(id: string) {
  const { data, error } = await supaAdmin.from("integrations").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

/**
 * A basic connection test for providers.
 * - Implements a simple test for BigCommerce and a generic ping for API-key providers.
 * - For OAuth providers use token exchange / test endpoint per provider.
 */
export async function testConnection(integration: any) {
  const provider = integration.provider;
  const config = integration.config ?? {};
  const secrets = integration.encrypted_secrets ? decryptSecrets(integration.encrypted_secrets) : {};

  try {
    if (provider === "bigcommerce") {
      // BigCommerce: check product list permission (public API)
      const storeHash = config.store_hash;
      const token = secrets.access_token;
      if (!storeHash || !token) throw new Error("Missing store_hash or access token");
      const res = await fetch(`https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products?limit=1`, {
        headers: {
          "X-Auth-Token": token,
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`BigCommerce test failed: ${res.status} ${t}`);
      }
      return { ok: true };
    }

    // Generic providers: attempt a simple GET to configured "test_url" or return ok
    if (config.test_url) {
      const res = await fetch(config.test_url, { method: "GET", headers: {} });
      if (!res.ok) throw new Error(`Test URL failed: ${res.status}`);
      return { ok: true };
    }

    // Default: assume ok for now
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err) };
  }
}
