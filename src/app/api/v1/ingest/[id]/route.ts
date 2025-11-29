/**
 * src/app/api/v1/ingest/[id]/route.ts
 *
 * GET /api/v1/ingest/{id}?url=<encoded-url>
 * Proxies to extractAndIngest and returns { ok: true, data } on success.
 *
 * Uses NextRequest and handles promise-style context.params for compatibility.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { extractAndIngest } from '../../../../../services/avidiaExtractToIngest';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    // handle both sync and promise-style params:
    const params = await Promise.resolve(context.params);
    const id = params?.id;

    const urlParam = new URL(request.url).searchParams.get('url');

    if (!urlParam) {
      return NextResponse.json({ ok: false, error: 'Missing url query parameter' }, { status: 400 });
    }

    // call the adapter (server-side)
    const result = await extractAndIngest(urlParam, {
      timeoutMs: 120_000,
      retries: 3,
    });

    return NextResponse.json({ ok: true, data: result }, { status: 200 });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('API ingest error:', err?.message || err, { stack: err?.stack });

    // If the adapter provided a status (from upstream), map 4xx/5xx to 502/whatever is appropriate
    const upstreamStatus = (err?.status && Number(err.status)) || null;
    const status = upstreamStatus && upstreamStatus >= 400 && upstreamStatus < 600 ? 502 : 500;
    const message = err?.message || 'Unknown error contacting ingest API';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
