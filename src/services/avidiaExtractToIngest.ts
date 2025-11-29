// src/services/avidiaExtractToIngest.ts
// Thin wrapper for calling the central medx-ingest-api ingest endpoint.
// - Uses global fetch when available (Node 18+). Falls back to node-fetch if needed.
// - Reads INGEST_API_ENDPOINT and INGEST_API_KEY from env if not passed via opts.
//
// Usage:
//   import { extractAndIngest } from 'src/services/avidiaExtractToIngest';
//   const result = await extractAndIngest('https://www.apple.com/iphone-17/');

type Options = {
  ingestApiEndpoint?: string;
  ingestApiKey?: string;
  timeoutMs?: number;
};

function getFetch(): any {
  if (typeof (globalThis as any).fetch === 'function') return (globalThis as any).fetch;
  // dynamic import to avoid adding a required runtime dependency if not needed
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    // require at runtime so the package isn't mandatory for all installs
    // when running on Node <18, install node-fetch as a dependency or devDependency.
    // e.g., npm install node-fetch@2
    // For TypeScript, you may need @types/node-fetch accordingly.
    // Use require to avoid ESM issues.
    // @ts-ignore
    const nf = require('node-fetch');
    return nf;
  } catch (err) {
    throw new Error('No fetch available. Use Node 18+ or install node-fetch in avidiatech-app.');
  }
}

export async function extractAndIngest(targetUrl: string, opts: Options = {}): Promise<any> {
  if (!targetUrl || typeof targetUrl !== 'string') throw new TypeError('targetUrl (string) required');

  const ingestEndpoint = opts.ingestApiEndpoint || process.env.INGEST_API_ENDPOINT || 'https://medx-ingest-api.onrender.com';
  const ingestKey = opts.ingestApiKey || process.env.INGEST_API_KEY || '';

  const fetchFn = getFetch();

  const fullUrl = `${ingestEndpoint.replace(/\/$/, '')}/ingest?url=${encodeURIComponent(targetUrl)}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (ingestKey) headers['x-api-key'] = ingestKey;

  // Simple fetch with timeout
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const res = await fetchFn(fullUrl, {
      method: 'GET',
      headers,
      signal: controller ? controller.signal : undefined,
    });

    if (timer) clearTimeout(timer);

    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      const err = new Error(`Ingest API returned ${res.status} ${res.statusText}: ${bodyText}`);
      // @ts-ignore
      err.status = res.status;
      throw err;
    }

    const json = await res.json();
    return json;
  } catch (err) {
    // Add contextual info for logs
    // eslint-disable-next-line no-console
    console.error('extractAndIngest error calling ingest API:', err?.message || err, { targetUrl, fullUrl });
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export default { extractAndIngest };
