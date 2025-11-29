/**
 * src/app/api/v1/ingest/[id]/route.ts
 *
 * Lightweight Next.js App Router route that triggers an ingest by URL.
 * Behavior:
 *  - Accepts GET requests with query parameter `url` (the product page to ingest).
 *  - Example: GET /api/v1/ingest/123?url=https://example.com/p
 *  - Calls extractAndIngest and returns JSON result or an error payload.
 *
 * If your existing route did other work (database lookup by id), merge that logic and
 * pass the resolved URL to extractAndIngest instead of reading it from the query.
 */

import { NextResponse } from 'next/server';
import { extractAndIngest } from '../../../../services/avidiaExtractToIngest';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params?.id;
    const urlParam = new URL(req.url).searchParams.get('url');

    if (!urlParam) {
      return NextResponse.json({ error: 'Missing url query parameter' }, { status: 400 });
    }

    // Optionally: you may wish to validate that the id is authorized to request this ingest
    // or to resolve the URL from a DB using the id. For now we trust the provided URL.
    const result = await extractAndIngest(urlParam, {
      // You can override endpoint/key here, otherwise env vars are used.
      // ingestApiEndpoint: process.env.INGEST_API_ENDPOINT,
      // ingestApiKey: process.env.INGEST_API_KEY,
      timeoutMs: 120_000,
      retries: 3,
    });

    return NextResponse.json({ ok: true, data: result }, { status: 200 });
  } catch (err: any) {
    // Log error server-side; return a helpful error payload
    // eslint-disable-next-line no-console
    console.error('API ingest error:', err?.message || err, { stack: err?.stack });

    const status = (err?.status && Number(err.status)) || 500;
    const message = err?.message || 'Unknown error contacting ingest API';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
