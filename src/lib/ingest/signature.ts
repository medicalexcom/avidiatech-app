// HMAC SHA256 signing helpers for gateway <-> ingestion engine
// Usage:
//   const sig = signPayload(JSON.stringify(payload), process.env.INGEST_SECRET);
//   const ok = verifySignature(JSON.stringify(payload), sig, process.env.INGEST_SECRET);

import crypto from "crypto";

export function signPayload(payload: string, secret: string): string {
  if (!secret || !payload) return "";
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Try to parse provided signature into a Buffer.
 * Accepts:
 *  - raw hex (e.g. "a3f...")
 *  - prefixed hex (e.g. "sha256=a3f...")
 *  - base64 (e.g. "AbC...==")
 */
function signatureToBuffer(sig?: string | null): Buffer | null {
  if (!sig) return null;
  sig = sig.trim();

  // strip common prefix 'sha256=' if present
  if (sig.toLowerCase().startsWith("sha256=")) {
    sig = sig.slice("sha256=".length);
  }

  // try hex
  try {
    if (/^[0-9a-fA-F]+$/.test(sig)) {
      return Buffer.from(sig, "hex");
    }
  } catch (err) {
    // ignore
  }

  // try base64
  try {
    return Buffer.from(sig, "base64");
  } catch (err) {
    // ignore
  }

  return null;
}

export function verifySignature(
  payload: string,
  signature: string | undefined | null,
  secret: string
): boolean {
  if (!secret) return false;
  if (!signature) return false;
  try {
    const expectedHex = signPayload(payload, secret);
    const expectedBuf = Buffer.from(expectedHex, "hex");

    const actualBuf = signatureToBuffer(signature);
    if (!actualBuf) return false;

    // Must match length for timingSafeEqual
    if (expectedBuf.length !== actualBuf.length) return false;

    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch (err) {
    return false;
  }
}
