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
        INTERNAL_API_BASE: "https://app.avidiatech.com",
        SERVICE_API_KEY: "PUT_REAL_SERVICE_API_KEY_HERE",
        SUPABASE_URL: "https://dpomficpjunfzkyknzrq.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwb21maWNwanVuZnpreWtuenJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzMyOTk4NCwiZXhwIjoyMDc4OTA1OTg0fQ.6zJT08EvDmrigdD-Gmcx931cf3WOKYv0ob0IZzPATKI",
        REDIS_URL: "rediss://default:AVnvAAIncDFmOWY4ZmY2N2ZhZWI0ZDExYjgwYmVmMDU4ZmRmMjg2YXAxMjMwMjM@smart-dassie-23023.upstash.io:6379"
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
        INTERNAL_API_BASE: "https://app.avidiatech.com",
        SERVICE_API_KEY: "PUT_REAL_SERVICE_API_KEY_HERE",
        SUPABASE_URL: "https://dpomficpjunfzkyknzrq.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwb21maWNwanVuZnpreWtuenJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzMyOTk4NCwiZXhwIjoyMDc4OTA1OTg0fQ.6zJT08EvDmrigdD-Gmcx931cf3WOKYv0ob0IZzPATKI",
        REDIS_URL: "rediss://default:AVnvAAIncDFmOWY4ZmY2N2ZhZWI0ZDExYjgwYmVmMDU4ZmRmMjg2YXAxMjMwMjM@smart-dassie-23023.upstash.io:6379",
        BULK_ITEM_CONCURRENCY: "8"
      }
    }
  ]
};    
