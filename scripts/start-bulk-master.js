// Render worker entrypoint: bulk master
process.env.NODE_ENV = process.env.NODE_ENV || "production";

console.log("[render] starting bulk-master worker...");
require("../dist/workers/bulkMasterWorker.js");
