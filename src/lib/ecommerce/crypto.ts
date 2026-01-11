import crypto from "crypto";

function getKey(): Buffer {
  const b64 = process.env.INTEGRATIONS_ENCRYPTION_KEY || "";
  if (!b64) throw new Error("INTEGRATIONS_ENCRYPTION_KEY missing");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error("INTEGRATIONS_ENCRYPTION_KEY must be 32 bytes base64");
  return key;
}

export function encryptJson(obj: any): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const plaintext = Buffer.from(JSON.stringify(obj ?? {}), "utf8");
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  // format: iv.tag.ciphertext (base64)
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

export function decryptJson(payload: string): any {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = (payload || "").split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("invalid_encrypted_payload");

  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(dec.toString("utf8"));
}
