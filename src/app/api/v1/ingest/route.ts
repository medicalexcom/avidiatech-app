import { NextResponse } from 'next/server';

/**
 * Proxy endpoint for product ingestion.
 *
 * This route accepts a POST request with a JSON body containing a `url` field.
 * It forwards the request to the Render‑hosted ingestion engine defined by
 * the `RENDER_ENGINE_URL` environment variable.  An optional
 * `RENDER_ENGINE_AUTH_TOKEN` can be provided to authenticate with the engine.
 */
export async function POST(req: Request) {
  const { url } = await req.json();
  if (!url) {
    return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
  }

  const engineUrl = process.env.RENDER_ENGINE_URL;
  if (!engineUrl) {
    return NextResponse.json({ error: 'RENDER_ENGINE_URL not configured' }, { status: 500 });
  }

  try {
    const authToken = process.env.RENDER_ENGINE_AUTH_TOKEN;
    const res = await fetch(`${engineUrl.replace(/\/$/, '')}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to connect to ingestion engine' }, { status: 500 });
  }
}
