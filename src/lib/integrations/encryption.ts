import crypto from "crypto";

/**
 * Simple encryption helpers for storing connector secrets.
 * - Expects INTEGRATIONS_ENCRYPTION_KEY env var as hex or base64 (32 bytes key).
 * - Uses AES-256-GCM with random IV.
 *
 * NOTE: for production, prefer KMS or Supabase's secrets + RLS. Keep key server-only.
 */

const RAW_KEY = process.env.INTEGRATIONS_ENCRYPTION_KEY || "";

function keyBytes() {
  if (!RAW_KEY) throw new Error("INTEGRATIONS_ENCRYPTION_KEY is not set");
  // allow base64 or hex; normalize to Buffer of length 32
  if (/^[0-9a-fA-F]+$/.test(RAW_KEY) && RAW_KEY.length === 64) {
    return Buffer.from(RAW_KEY, "hex");
  }
  return Buffer.from(RAW_KEY, "base64");
}

export function encryptSecrets(obj: Record<string, any>) {
  const key = keyBytes();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const json = JSON.stringify(obj);
  const enc = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // return base64 of iv + tag + ciphertext
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecrets(blob: string) {
  const key = keyBytes();
  const raw = Buffer.from(blob, "base64");
  const iv = raw.slice(0, 12);
  const tag = raw.slice(12, 28);
  const ciphertext = raw.slice(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(out.toString("utf8"));
}
