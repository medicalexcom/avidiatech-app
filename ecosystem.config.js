/**
 * PM2 ecosystem file (safe to commit)
 *
 * Goals:
 * - Do NOT commit secrets.
 * - Load secrets from environment (optionally via a local .env.production file on the host).
 * - Sanitize env values to prevent invisible ANSI escape codes / whitespace from breaking URLs.
 * - Standardize internal service secret naming (PIPELINE_INTERNAL_SECRET -> SERVICE_API_KEY compatibility).
 *
 * Usage (recommended):
 *   1) On the host, create a file .env.production (NOT committed) with:
 *        REDIS_URL=rediss://...
 *        SUPABASE_SERVICE_ROLE_KEY=...
 *        SUPABASE_URL=https://...
 *        INTERNAL_API_BASE=https://app.avidiatech.com
 *        PIPELINE_INTERNAL_SECRET=...
 *        DEBUG_BULK=1
 *   2) Start/restart:
 *        pm2 startOrRestart ecosystem.config.js --env production --update-env
 */

const fs = require("fs");
const path = require("path");

// Optional dotenv load from a host-local file.
// This keeps secrets OUT of git while still ensuring PM2 gets clean, deterministic env values.
try {
  const dotenvPath = path.join(__dirname, ".env.production");
  if (fs.existsSync(dotenvPath)) {
    // eslint-disable-next-line global-require
    require("dotenv").config({ path: dotenvPath });
  }
} catch (e) {
  // ignore; process.env can still be provided by the host/PM2 runtime
}

/**
 * Strip ANSI escape codes and trim whitespace/newlines.
 * This prevents bugs like ERR_INVALID_URL caused by env values containing \x1b[32m ... \x1b[39m.
 */
function clean(v) {
  if (v == null) return undefined;
  return String(v)
    .replace(
      // eslint-disable-next-line no-control-regex
      /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g,
      ""
    )
    .trim();
}

const INTERNAL_API_BASE = clean(process.env.INTERNAL_API_BASE) || "https://app.avidiatech.com";
const SUPABASE_URL = clean(process.env.SUPABASE_URL) || "https://dpomficpjunfzkyknzrq.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
const REDIS_URL = clean(process.env.REDIS_URL);

// Canonical internal secret for workers (what your bulk worker prefers)
// Keep backwards compat: SERVICE_API_KEY is also read by some code.
const PIPELINE_INTERNAL_SECRET = clean(process.env.PIPELINE_INTERNAL_SECRET);
const SERVICE_API_KEY = clean(process.env.SERVICE_API_KEY) || PIPELINE_INTERNAL_SECRET;

// Optional debug flag for worker logging (safe)
const DEBUG_BULK = clean(process.env.DEBUG_BULK);

module.exports = {
  apps: [
    {
      name: "bulk-master-worker",
      script: "./dist/workers/bulkMasterWorker.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        INTERNAL_API_BASE,
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        REDIS_URL,

        // secrets (loaded from host env / .env.production, not committed)
        PIPELINE_INTERNAL_SECRET,
        SERVICE_API_KEY,

        // optional
        DEBUG_BULK,
      },
    },
    {
      name: "bulk-item-worker",
      script: "./dist/workers/bulkItemWorker.js",
      instances: 2,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        INTERNAL_API_BASE,
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        REDIS_URL,

        // secrets (loaded from host env / .env.production, not committed)
        PIPELINE_INTERNAL_SECRET,
        SERVICE_API_KEY,

        BULK_ITEM_CONCURRENCY: clean(process.env.BULK_ITEM_CONCURRENCY) || "8",
        DEBUG_BULK,
      },
    },
  ],
};
