/**
 * src/services/avidiaExtractToIngest.ts
 *
 * Thin, robust TypeScript client for the central medx-ingest-api.
 *
 * - Uses global fetch when available (Node 18+). Falls back to node-fetch@2.
 * - Supports opts: ingestApiEndpoint, ingestApiKey, timeoutMs, retries, retryDelayMs
 * - Exponential backoff retry logic, returns parsed JSON result.
 */

import type { IngestResult } from '../../types/ingest';

type ExtractOpts = {
  ingestApiEndpoint?: string;
  ingestApiKey?: string;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
};

function isValidHttpUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

async function getFetch(): Promise<typeof fetch> {
  // prefer global fetch (Node 18+, Next runtime)
  // @ts-ignore
  if (typeof globalThis.fetch === 'function') return globalThis.fetch;

  // fallback to node-fetch v2 (CommonJS)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nf = require('node-fetch');
    return nf;
  } catch (err) {
    throw new Error(
      'No fetch available. Use Node 18+ or install node-fetch@2 (npm i node-fetch@2).'
    );
  }
}

function timeoutPromise<T>(p: Promise<T>, ms: number, controller?: AbortController): Promise<T> {
  if (ms <= 0) return p;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      try {
        controller?.abort();
      } catch {}
      reject(new Error(`Request timed out after ${ms}ms`));
    }, ms);

    p.then((v) => {
      clearTimeout(timer);
      resolve(v);
    }, (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export async function extractAndIngest(targetUrl: string, opts: ExtractOpts = {}): Promise<IngestResult> {
  if (!targetUrl || typeof targetUrl !== 'string') {
    throw new TypeError('targetUrl (string) required');
  }
  if (!isValidHttpUrl(targetUrl)) {
    throw new TypeError('targetUrl must be a valid http(s) URL');
  }

  const ingestApiEndpoint =
    opts.ingestApiEndpoint ||
    process.env.INGEST_API_ENDPOINT ||
    'https://medx-ingest-api.onrender.com';
  const ingestApiKey = opts.ingestApiKey || process.env.INGEST_API_KEY || '';

  const timeoutMs = opts.timeoutMs ?? 120_000;
  const retries = Math.max(1, Math.floor(opts.retries ?? 3));
  const retryDelayMs = opts.retryDelayMs ?? 300;

  const fetchFn = await getFetch();

  let lastErr: any = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller =
      typeof AbortController !== 'undefined' ? new AbortController() : (null as any);

    try {
      const url = `${ingestApiEndpoint.replace(/\/$/, '')}/ingest?url=${encodeURIComponent(
        targetUrl
      )}`;

      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (ingestApiKey) headers['x-api-key'] = ingestApiKey;

      const resPromise = fetchFn(url, {
        method: 'GET',
        headers,
        signal: controller ? controller.signal : undefined,
      });

      const res = await timeoutPromise(resPromise as Promise<Response>, timeoutMs, controller);

      if (!res.ok) {
        let bodyText = '';
        try {
          bodyText = await (res.text ? res.text() : Promise.resolve(''));
        } catch {}
        const err = new Error(
          `Ingest API returned ${res.status} ${res.statusText}${bodyText ? `: ${bodyText}` : ''}`
        );
        // @ts-ignore
        err.status = res.status;
        throw err;
      }

      const json = await (res.json ? res.json() : Promise.resolve(null));
      return json as IngestResult;
    } catch (err: any) {
      lastErr = err;
      const isAbort = String(err?.message || '').toLowerCase().includes('aborted') || String(err?.message || '').toLowerCase().includes('timeout');

      if (attempt === retries) break;

      const delay = Math.round(retryDelayMs * Math.pow(2, attempt - 1));
      // eslint-disable-next-line no-console
      console.warn(
        `extractAndIngest attempt ${attempt} failed${isAbort ? ' (timeout/abort)' : ''}: ${err?.message || err}. Retrying in ${delay}ms...`
      );

      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
  }

  const finalErr = new Error(`extractAndIngest failed after ${retries} attempts: ${lastErr?.message || lastErr}`);
  // @ts-ignore
  finalErr.cause = lastErr;
  throw finalErr;
}

export default { extractAndIngest };
