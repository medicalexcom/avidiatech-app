/**
 * PM2 ecosystem file (safe to commit)
 *
 * - Secrets are read from process.env so you must set them on the host (do NOT commit real secrets).
 * - Use `pm2 startOrRestart ecosystem.config.js --env production` to (re)start processes.
 */
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
        INTERNAL_API_BASE: process.env.INTERNAL_API_BASE || "https://app.avidiatech.com",
        SERVICE_API_KEY: process.env.SERVICE_API_KEY,
        SUPABASE_URL: process.env.SUPABASE_URL || "https://dpomficpjunfzkyknzrq.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        REDIS_URL: process.env.REDIS_URL,
      }
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
        INTERNAL_API_BASE: process.env.INTERNAL_API_BASE || "https://app.avidiatech.com",
        SERVICE_API_KEY: process.env.SERVICE_API_KEY,
        SUPABASE_URL: process.env.SUPABASE_URL || "https://dpomficpjunfzkyknzrq.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        REDIS_URL: process.env.REDIS_URL,
        BULK_ITEM_CONCURRENCY: process.env.BULK_ITEM_CONCURRENCY || "8"
      }
    }
  ]
};
