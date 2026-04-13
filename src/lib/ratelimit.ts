/**
 * Rate limiting via Upstash Redis + @upstash/ratelimit.
 *
 * Required env vars (set in Vercel / .env.local):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * If the env vars are not set, all rate-limit checks pass silently so the
 * app continues to work in local development without Redis.
 *
 * Usage:
 *   import { checkRateLimit } from "@/lib/ratelimit";
 *
 *   const identifier = getIP(request) ?? "anonymous";
 *   const { success, limit, remaining, reset } = await checkRateLimit("api", identifier);
 *   if (!success) {
 *     return new Response("Too many requests", { status: 429 });
 *   }
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── Lazily-created Redis client ───────────────────────────────────────────────
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  redis = new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return redis;
}

// ── Limiters by namespace ─────────────────────────────────────────────────────
type LimiterKey = "api" | "developer" | "ingest" | "auth";

const limiters: Partial<Record<LimiterKey, Ratelimit>> = {};

function getLimiter(key: LimiterKey): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;

  if (limiters[key]) return limiters[key]!;

  const configs: Record<LimiterKey, { requests: number; window: `${number} ${"s" | "m" | "h" | "d"}` }> = {
    // /api/v1/ingest — 60 requests per minute per IP
    ingest:    { requests: 60,  window: "1 m" },
    // /api/developer/** — 120 requests per minute per IP
    developer: { requests: 120, window: "1 m" },
    // General API fallback — 200 per minute
    api:       { requests: 200, window: "1 m" },
    // Auth-related — 10 per minute (aggressive)
    auth:      { requests: 10,  window: "1 m" },
  };

  const { requests, window } = configs[key];
  limiters[key] = new Ratelimit({
    redis:     r,
    limiter:   Ratelimit.slidingWindow(requests, window),
    prefix:    `avidiatech:rl:${key}`,
    analytics: false,
  });

  return limiters[key]!;
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface RateLimitResult {
  success:   boolean;
  limit:     number;
  remaining: number;
  reset:     number; // unix timestamp (ms) when the window resets
}

/**
 * Check rate limit for a given namespace and identifier (usually IP address).
 * Returns { success: true } if Redis is not configured (fail-open).
 */
export async function checkRateLimit(
  namespace: LimiterKey,
  identifier: string
): Promise<RateLimitResult> {
  const limiter = getLimiter(namespace);

  if (!limiter) {
    // No Redis configured — allow all requests in dev/staging
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }

  try {
    const result = await limiter.limit(identifier);
    return {
      success:   result.success,
      limit:     result.limit,
      remaining: result.remaining,
      reset:     result.reset,
    };
  } catch (err) {
    // On Redis error, fail open so the app still works
    console.warn("[ratelimit] Redis error — allowing request:", err);
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
}

/** Extract real client IP from Next.js request headers. */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Build a 429 Response with standard rate-limit headers. */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down." }),
    {
      status:  429,
      headers: {
        "Content-Type":      "application/json",
        "X-RateLimit-Limit":     String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset":     String(Math.ceil(result.reset / 1000)),
        "Retry-After":           String(Math.ceil((result.reset - Date.now()) / 1000)),
      },
    }
  );
}
