import { NextResponse } from 'next/server';

/**
 * Endpoint to generate descriptions in different formats.  Accepts a POST body
 * with `text` (raw description) and `format` (e.g. 'avidia-standard',
 * 'general', 'shopify', 'manufacturer').  Calls the AvidiaDescribe service
 * and returns the formatted description.  This is a stub implementation.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, format } = body as { text?: string; format?: string };
    if (!text || !format) {
      return NextResponse.json({ error: 'text and format are required' }, { status: 400 });
    }
    // TODO: call AvidiaDescribe/SEO engine with the requested format.  For
    // now, simply return the input text with a note about the format.
    return NextResponse.json({ description: `Format (${format}): ${text}` });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
}
