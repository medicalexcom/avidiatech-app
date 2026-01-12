import { getServiceSupabaseClient } from "@/lib/supabase";
import { decryptSecrets } from "@/lib/integrations/encryption";

export type EcommercePlatform = "bigcommerce" | "shopify" | "woocommerce" | "magento" | "squarespace";

export type EcommerceConnection = {
  id: string;
  tenant_id: string;
  platform: EcommercePlatform;
  config: Record<string, any>;
  secrets: Record<string, any>;
};

export async function getActiveConnectionForTenant(args: {
  tenantId: string;
  platform: EcommercePlatform;
}): Promise<EcommerceConnection> {
  const supabase = getServiceSupabaseClient();

  const { data, error } = await supabase
    .from("ecommerce_connections")
    .select("id, tenant_id, platform, status, config, secrets_enc, updated_at")
    .eq("tenant_id", args.tenantId)
    .eq("platform", args.platform)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`connection_load_failed: ${error.message}`);
  if (!data) throw new Error("connection_not_found");

  const secretsEnc = (data as any).secrets_enc as string | null;

  // secrets_enc for ecommerce_connections is written by encryptSecrets()
  // which produces a single base64 blob (iv||tag||ciphertext), not dot-separated segments.
  const secrets = secretsEnc ? decryptSecrets(secretsEnc) : {};

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    platform: data.platform,
    config: (data as any).config ?? {},
    secrets,
  };
}
