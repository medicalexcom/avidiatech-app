// HMAC SHA256 signing helpers for gateway <-> ingestion engine
// Usage:
//   const sig = signPayload(JSON.stringify(payload), process.env.INGEST_SECRET);
//   const ok = verifySignature(JSON.stringify(payload), sig, process.env.INGEST_SECRET);

import crypto from "crypto";

/**
 * Normalize secrets coming from env managers:
 * - trims whitespace/newlines
 * - removes accidental ANSI escape codes (rare but observed)
 */
// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

function cleanSecret(secret: string): string {
  return String(secret || "").replace(ANSI_REGEX, "").trim();
}

export function signPayload(payload: string, secret: string): string {
  const s = cleanSecret(secret);
  if (!s || !payload) return "";
  return crypto.createHmac("sha256", s).update(payload).digest("hex");
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
      // hex must have even length
      if (sig.length % 2 !== 0) return null;
      return Buffer.from(sig, "hex");
    }
  } catch {
    // ignore
  }

  // try base64 (only accept if it decodes to 32 bytes for sha256)
  try {
    const buf = Buffer.from(sig, "base64");
    if (buf.length === 32) return buf;
  } catch {
    // ignore
  }

  return null;
}

export function verifySignature(
  payload: string,
  signature: string | undefined | null,
  secret: string
): boolean {
  const s = cleanSecret(secret);
  if (!s) return false;
  if (!signature) return false;

  try {
    const expectedHex = signPayload(payload, s);
    const expectedBuf = Buffer.from(expectedHex, "hex");

    const actualBuf = signatureToBuffer(signature);
    if (!actualBuf) return false;

    // Must match length for timingSafeEqual
    if (expectedBuf.length !== actualBuf.length) return false;

    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}
