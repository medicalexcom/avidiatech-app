/**
 * src/services/avidiaExtractToIngest.ts
 *
 * Thin, robust TypeScript client for the central medx-ingest-api.
 * - Exports extractAndIngest(targetUrl, opts)
 * - Uses global fetch when available (Node 18+, or Next server runtime). Falls back to node-fetch@2.
 * - Supports configurable ingest endpoint and API key via opts or env vars.
 * - Built-in timeout + retry (exponential backoff).
 *
 * Usage:
 *   import { extractAndIngest } from 'src/services/avidiaExtractToIngest';
 *   const result = await extractAndIngest('https://example.com/product/123');
 */

type ExtractOpts = {
  ingestApiEndpoint?: string; // e.g. https://medx-ingest-api.onrender.com
  ingestApiKey?: string;
  timeoutMs?: number; // per-request timeout
  retries?: number; // number of attempts (incl. first)
  retryDelayMs?: number; // base retry delay
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
    // node-fetch v2 exports a function
    return nf;
  } catch (err) {
    throw new Error(
      'No fetch available. Use Node 18+ or add node-fetch@2 to dependencies (npm i node-fetch@2).'
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

/**
 * extractAndIngest
 * - Calls the medx-ingest-api /ingest endpoint with the provided URL
 * - Returns parsed JSON from the ingest API or throws on non-2xx
 */
export async function extractAndIngest(targetUrl: string, opts: ExtractOpts = {}): Promise<any> {
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

  const timeoutMs = opts.timeoutMs ?? 120_000; // default 120s
  const retries = Math.max(1, Math.floor(opts.retries ?? 3));
  const retryDelayMs = opts.retryDelayMs ?? 300; // base delay for backoff

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

      // node-fetch v2 accepts { signal } in options; global fetch does too.
      const resPromise = fetchFn(url, {
        method: 'GET',
        headers,
        signal: controller ? controller.signal : undefined,
      });

      // apply timeout wrapper
      const res = await timeoutPromise(resPromise as Promise<Response>, timeoutMs, controller);

      // if response status not ok, parse body if possible for debugging
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

      // parse JSON
      const json = await (res.json ? res.json() : Promise.resolve(null));
      return json;
    } catch (err: any) {
      lastErr = err;
      const isAbort = String(err?.message || '').toLowerCase().includes('aborted') || String(err?.message || '').toLowerCase().includes('timeout');

      // On last attempt, rethrow the last error
      if (attempt === retries) break;

      // Otherwise wait for backoff then retry
      const delay = Math.round(retryDelayMs * Math.pow(2, attempt - 1));
      // eslint-disable-next-line no-console
      console.warn(
        `extractAndIngest attempt ${attempt} failed${isAbort ? ' (timeout/abort)' : ''}: ${err?.message ||
          err}. Retrying in ${delay}ms...`
      );

      await new Promise((r) => setTimeout(r, delay));
      continue;
    } finally {
      // nothing to do; abort controller may help cancel underlying request
    }
  }

  // All attempts failed
  const finalErr = new Error(`extractAndIngest failed after ${retries} attempts: ${lastErr?.message || lastErr}`);
  // @ts-ignore
  finalErr.cause = lastErr;
  throw finalErr;
}

export default { extractAndIngest };
