#!/usr/bin/env ts-node
/**
 * scripts/run-extract.ts
 *
 * Usage:
 *   npx ts-node -O '{"module":"commonjs"}' scripts/run-extract.ts "https://www.apple.com/iphone-17/"
 *
 * Environment:
 *   INGEST_API_ENDPOINT (optional)
 *   INGEST_API_KEY (optional)
 */

import path from 'path';

async function main() {
  const targetUrl = process.env.TARGET_URL || process.argv[2] || 'https://www.apple.com/iphone-17/';
  console.log('Target URL:', targetUrl);

  let adapter: any;
  const adapterTs = path.resolve(__dirname, '../src/services/avidiaExtractToIngest');
  const adapterDist = path.resolve(__dirname, '../dist/src/services/avidiaExtractToIngest');

  try {
    adapter = await import(adapterTs);
  } catch (err) {
    try {
      adapter = await import(adapterDist);
    } catch (err2) {
      console.error('Failed to import adapter from src/services or dist. Ensure file exists and is compiled if necessary.');
      console.error(err, err2);
      process.exit(2);
    }
  }

  const fn = adapter.extractAndIngest || (adapter.default && adapter.default.extractAndIngest);
  if (typeof fn !== 'function') {
    console.error('extractAndIngest not found on imported module:', Object.keys(adapter));
    process.exit(3);
  }

  const ingestEndpoint = process.env.INGEST_API_ENDPOINT;
  const ingestKey = process.env.INGEST_API_KEY;

  try {
    console.log('Calling ingest API via adapter...');
    const result = await fn(targetUrl, { ingestApiEndpoint: ingestEndpoint, ingestApiKey: ingestKey, timeoutMs: 120_000, retries: 3 });

    console.log('=== Ingest result summary ===');
    if (!result || typeof result !== 'object') {
      console.error('Ingest returned no JSON or non-object result:', result);
      process.exit(4);
    }
    const keys = Object.keys(result);
    console.log('Top-level keys:', keys.join(', '));
    if (result.name_best) console.log('name_best:', result.name_best);
    if (result.short_name_60) console.log('short_name_60:', result.short_name_60);
    if (result.desc_audit) console.log('desc_audit:', JSON.stringify(result.desc_audit, null, 2));
    if (result.pdf_manual_urls) console.log('pdf_manual_urls:', JSON.stringify(result.pdf_manual_urls, null, 2));

    const s = JSON.stringify(result, null, 2);
    if (s.length <= 8000) console.log('Full JSON:\n', s);
    else console.log('Result size:', s.length, 'chars; first 8000 chars:\n', s.slice(0, 8000));

    console.log('=== End summary ===');
    process.exit(0);
  } catch (err: any) {
    console.error('ERROR calling ingest API:', err?.message || err);
    if (err?.stack) console.error(err.stack);
    process.exit(5);
  }
}

main();
