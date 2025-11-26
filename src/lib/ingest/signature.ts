// HMAC SHA256 signing helpers for gateway <-> ingestion engine
// Usage:
//   const sig = signPayload(JSON.stringify(payload), process.env.INGEST_SECRET);
//   const ok = verifySignature(JSON.stringify(payload), sig, process.env.INGEST_SECRET);

import crypto from "crypto";

/**
 * signPayload - compute HMAC SHA256 hex signature
 * @param payload string - raw string payload (JSON.stringify(body))
 * @param secret string - shared secret (INGEST_SECRET)
 * @returns hex string signature
 */
export function signPayload(payload: string, secret: string): string {
  if (!secret || !payload) return "";
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * verifySignature - timing-safe comparison of expected vs provided signature
 * @param payload string - raw string payload (JSON.stringify(body))
 * @param signature string - signature from header
 * @param secret string - shared secret (INGEST_SECRET)
 * @returns boolean - true if valid
 */
export function verifySignature(payload: string, signature: string | undefined | null, secret: string): boolean {
  if (!secret) return false;
  if (!signature) return false;
  try {
    const expected = signPayload(payload, secret);
    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(signature, "hex");
    // lengths must match for timingSafeEqual
    if (expectedBuf.length !== actualBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch (err) {
    // any failure in parsing/comparison -> invalid
    return false;
  }
}
