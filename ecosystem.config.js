/**
 * PM2 ecosystem file (safe to commit)
 *
 * - Secrets are read from process.env so you must set them on the host (do NOT commit real secrets).
 * - Adds env_production so `--env production` works without warnings.
 * - Sanitizes env values to remove ANSI escape codes and whitespace.
 *
 * Usage:
 *   pm2 startOrRestart ecosystem.config.js --env production --update-env
 */

function clean(v) {
  if (v == null) return undefined;
  return String(v)
    // eslint-disable-next-line no-control-regex
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "")
    .trim();
}

function makeEnv() {
  const INTERNAL_API_BASE = clean(process.env.INTERNAL_API_BASE) || "https://app.avidiatech.com";
  const SUPABASE_URL = clean(process.env.SUPABASE_URL) || "https://dpomficpjunfzkyknzrq.supabase.co";

  // Canonical secret: PIPELINE_INTERNAL_SECRET. Keep backwards compat with SERVICE_API_KEY.
  const PIPELINE_INTERNAL_SECRET = clean(process.env.PIPELINE_INTERNAL_SECRET);
  const SERVICE_API_KEY = clean(process.env.SERVICE_API_KEY) || PIPELINE_INTERNAL_SECRET;

  return {
    NODE_ENV: "production",
    INTERNAL_API_BASE,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    REDIS_URL: clean(process.env.REDIS_URL),

    PIPELINE_INTERNAL_SECRET,
    SERVICE_API_KEY,

    DEBUG_BULK: clean(process.env.DEBUG_BULK),
    BULK_ITEM_CONCURRENCY: clean(process.env.BULK_ITEM_CONCURRENCY) || "8",
  };
}

module.exports = {
  apps: [
    {
      name: "bulk-master-worker",
      script: "./dist/workers/bulkMasterWorker.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      env: makeEnv(),
      env_production: makeEnv(),
    },
    {
      name: "bulk-item-worker",
      script: "./dist/workers/bulkItemWorker.js",
      instances: 2,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      env: makeEnv(),
      env_production: makeEnv(),
    },
  ],
};
