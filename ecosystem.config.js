module.exports = {
  apps: [
    {
      name: "bulk-master-worker",
      script: "./dist/workers/bulkMasterWorker.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production"
      },
      env_production: {
        NODE_ENV: "production"
      }
    },
    {
      name: "bulk-item-worker",
      script: "./dist/workers/bulkItemWorker.js",
      instances: 2,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        BULK_ITEM_CONCURRENCY: 8
      },
      env_production: {
        NODE_ENV: "production",
        BULK_ITEM_CONCURRENCY: 8
      }
    }
  ]
};
