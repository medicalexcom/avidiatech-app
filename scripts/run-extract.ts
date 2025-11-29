#!/usr/bin/env ts-node
// scripts/run-extract.ts
// Usage (local): npx ts-node scripts/run-extract.ts "https://www.apple.com/iphone-17/"
// Usage (GitHub Actions): workflow passes TARGET_URL env var
//
// This script calls src/services/avidiaExtractToIngest.extractAndIngest and prints a compact summary.
// It is intentionally minimal and defensive.

import path from "path";

async function main() {
  const targetUrl = process.env.TARGET_URL || process.argv[2] || "https://www.apple.com/iphone-17/";
  console.log("Target URL:", targetUrl);

  // Attempt to import the wrapper (TypeScript module in src/services)
  let adapter: any;
  const adapterPath = path.resolve(__dirname, "../src/services/avidiaExtractToIngest");
  try {
    adapter = await import(adapterPath);
  } catch (err) {
    // Try compiled dist path fallback
    try {
      adapter = await import(path.resolve(__dirname, "../dist/src/services/avidiaExtractToIngest"));
    } catch (err2) {
      console.error("Failed to import adapter from src/services or dist. Ensure src/services/avidiaExtractToIngest.ts exists and is valid.");
      console.error("Errors:", err, err2);
      process.exit(2);
    }
  }

  const fn = adapter.extractAndIngest || (adapter.default && adapter.default.extractAndIngest);
  if (typeof fn !== "function") {
    console.error("extractAndIngest not found on imported module:", Object.keys(adapter));
    process.exit(3);
  }

  // Optionally set ingest endpoint/key via env (Actions will provide these secrets)
  const ingestEndpoint = process.env.INGEST_API_ENDPOINT;
  const ingestKey = process.env.INGEST_API_KEY;

  try {
    console.log("Calling ingest API via adapter...");
    const result = await fn(targetUrl, { ingestApiEndpoint: ingestEndpoint, ingestApiKey: ingestKey });
    if (!result || typeof result !== "object") {
      console.error("Ingest returned no JSON or non-object result:", result);
      process.exit(4);
    }

    console.log("=== Ingest result summary ===");
    const topKeys = Object.keys(result);
    console.log("Top-level keys:", topKeys.join(", "));
    if (result.name_best) console.log("name_best:", result.name_best);
    if (result.short_name_60) console.log("short_name_60:", result.short_name_60);
    if (result.desc_audit) console.log("desc_audit.score:", result.desc_audit.score, "passed:", result.desc_audit.passed);
    if (result.desc_audit && result.desc_audit.violations && result.desc_audit.violations.length) {
      console.log("desc_audit.violations:", JSON.stringify(result.desc_audit.violations, null, 2));
    }
    // Print compacted JSON up to a limit for visibility
    const jsonStr = JSON.stringify(result, null, 2);
    if (jsonStr.length <= 8000) {
      console.log("Full JSON result:\n", jsonStr);
    } else {
      console.log("Result too large to print (size:", jsonStr.length, "chars). First 8000 chars:\n");
      console.log(jsonStr.slice(0, 8000));
    }
    console.log("=== End summary ===");
    process.exit(0);
  } catch (err: any) {
    console.error("Error calling extractAndIngest:", err?.message || err);
    if (err?.stack) console.error(err.stack);
    // If the ingest API returns a structured error object, print it
    if (err && typeof err === "object") {
      try {
        console.error("Error detail:", JSON.stringify(err, null, 2));
      } catch (_) {}
    }
    process.exit(5);
  }
}

main();
