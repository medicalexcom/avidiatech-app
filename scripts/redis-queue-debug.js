// scripts/redis-queue-debug.js
// Usage: REDIS_URL="..." node scripts/redis-queue-debug.js
const IORedis = require("ioredis");

async function main() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.error("Set REDIS_URL env");
    process.exit(2);
  }
  const r = new IORedis(url);

  try {
    const keys = await r.keys("bull:*");
    console.log("Found keys (sample up to 100):", keys.slice(0, 100));

    const masterWaitLen = await r.llen("bull:bulk-master:wait").catch(()=>null);
    const itemWaitLen = await r.llen("bull:bulk-item:wait").catch(()=>null);
    const itemActiveLen = await r.llen("bull:bulk-item:active").catch(()=>null);
    const itemDelayed = await r.zcard("bull:bulk-item:delayed").catch(()=>null);

    console.log({ masterWaitLen, itemWaitLen, itemActiveLen, itemDelayed });

    // Sample one job entry from wait list (if present)
    if (itemWaitLen && itemWaitLen > 0) {
      const sample = await r.lrange("bull:bulk-item:wait", 0, Math.min(4, itemWaitLen-1));
      console.log("Sample bulk-item wait entries:", sample);
    } else {
      console.log("No bulk-item wait entries found.");
    }
  } finally {
    r.disconnect();
  }
}

main().catch((e)=>{ console.error(e); process.exit(1); });
