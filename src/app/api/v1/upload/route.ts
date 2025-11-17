import { NextResponse } from 'next/server';

/**
 * Endpoint for bulk file uploads.  Accepts multipart/form-data with a single
 * file field named `file`.  This route is a placeholder and should be
 * implemented to handle parsing of CSV/XLSX files and queuing ingestion jobs.
 */
export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }
  // For now, simply return a not implemented response.  Implementation
  // should parse the incoming file, extract rows, and enqueue ingestion jobs.
  return NextResponse.json({ message: 'Bulk upload endpoint not yet implemented' }, { status: 501 });
}
