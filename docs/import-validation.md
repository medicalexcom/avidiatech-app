# Server-side import validation

This document explains the server-side validation behavior for imports.

Limits enforced (defaults):
- IMPORT_MAX_ROWS: 5000
- IMPORT_MAX_COLS: 50
- IMPORT_MAX_SIZE_BYTES: 10_000_000 (10 MB)

Environment variables (add to Vercel/project environment settings or local .env):
- SUPABASE_URL=<your-supabase-url>
- SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> (server-only)
- IMPORT_MAX_ROWS (optional, default 5000)
- IMPORT_MAX_COLS (optional, default 50)
- IMPORT_MAX_SIZE_BYTES (optional, default 10000000)

Behavior:
- POST /api/imports validates the file referenced by file_path (in your Supabase storage bucket).
- If the file size exceeds IMPORT_MAX_SIZE_BYTES, returns 413 with code "file_too_large".
- If rows exceed IMPORT_MAX_ROWS, returns 400 with code "too_many_rows".
- If columns exceed IMPORT_MAX_COLS, returns 400 with code "too_many_columns".
- On success, the import_job is created and a queue job is enqueued.

Local testing:
1) Set env (example .env.local):
   SUPABASE_URL=https://your.supabase.url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   IMPORT_MAX_ROWS=5000
   IMPORT_MAX_COLS=50
   IMPORT_MAX_SIZE_BYTES=10000000

2) Upload a test CSV to your storage bucket (e.g. imports/test.csv).

3) Create import via API (server derives org from Clerk session or DEV_ORG_ID fallback):
   POST /api/imports
   Body: { "file_path": "test.csv", "file_name": "test.csv", "file_format": "csv", "bucket": "imports" }

4) Observe response. If validation fails you will get a clear error code and guidance.
