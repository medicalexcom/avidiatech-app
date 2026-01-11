// Render worker entrypoint: bulk item
process.env.NODE_ENV = process.env.NODE_ENV || "production";

console.log("[render] starting bulk-item worker...");
require("../dist/workers/bulkItemWorker.js");
