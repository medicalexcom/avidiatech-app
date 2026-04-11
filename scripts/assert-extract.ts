#!/usr/bin/env ts-node
/**
 * scripts/assert-extract.ts
 *
 * Throws non-zero exit when required keys missing from ingest result.
 * Usage:
 *   npx ts-node -O '{"module":"commonjs"}' scripts/assert-extract.ts "https://www.apple.com/iphone-17/"
 *
 * Environment:
 *   INGEST_API_ENDPOINT (optional)
 *   INGEST_API_KEY (optional)
 */

import { extractAndIngest } from '../src/services/avidiaExtractToIngest';

async function main() {
  const url = process.argv[2] || process.env.TARGET_URL || 'https://www.apple.com/iphone-17/';
  console.log('Assert Extract target URL:', url);

  try {
    const res = await extractAndIngest(url, {
      ingestApiEndpoint: process.env.INGEST_API_ENDPOINT,
      ingestApiKey: process.env.INGEST_API_KEY,
      timeoutMs: 120_000,
      retries: 2,
    });

    if (!res || typeof res !== 'object') {
      console.error('Ingest returned no JSON or non-object result');
      process.exit(2);
    }

    const requiredAny = ['name_best', 'name_raw'];
    const hasName = requiredAny.some((k) => typeof res[k] === 'string' && res[k].trim().length > 0);
    const hasFeatures = Boolean(res.features_html || res.features_structured);
    const hasAudit = Boolean(res.desc_audit);
    if (!hasName) {
      console.error('Missing name_best/name_raw in ingest result');
      process.exit(3);
    }
    if (!hasFeatures) {
      console.error('Missing features_html or features_structured in ingest result');
      process.exit(4);
    }
    if (!hasAudit) {
      console.warn('Warning: desc_audit missing (not failing)'); // optional
    }

    console.log('Extract assertion passed: required keys present');
    process.exit(0);
  } catch (err: any) {
    console.error('ERROR during assert-extract:', err?.message || err);
    if (err?.stack) console.error(err.stack);
    process.exit(5);
  }
}

main();
