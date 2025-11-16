import { NextResponse } from 'next/server';

/**
 * Proxy endpoint for product ingestion.
 *
 * This route accepts a POST request with a JSON body containing a `url` field.
 * It forwards the request to the Render/Supabase ingestion engine defined by
 * the `RENDER_ENGINE_URL` environment variable.  If that is not set, it falls
 * back to `NEXT_PUBLIC_INGEST_API_URL`.  An optional
 * `RENDER_ENGINE_AUTH_TOKEN` can be provided to authenticate with the engine.
 */
export async function POST(req: Request) {
  const { url } = await req.json();
  if (!url) {
    return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
  }

  const engineUrl =
    process.env.RENDER_ENGINE_URL || process.env.NEXT_PUBLIC_INGEST_API_URL;
  if (!engineUrl) {
    return NextResponse.json(
      { error: 'RENDER_ENGINE_URL or NEXT_PUBLIC_INGEST_API_URL not configured' },
      { status: 500 },
    );
  }

  try {
    const authToken = process.env.RENDER_ENGINE_AUTH_TOKEN;
    // Build a GET request to the ingestion API with the product URL as a query param.
    const target = `${engineUrl.replace(/\/$/, '')}/ingest?url=${encodeURIComponent(url)}`;
    const res = await fetch(target, {
      method: 'get',
      headers: {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to connect to ingestion engine' },
      { status: 500 },
    );
  }
}
