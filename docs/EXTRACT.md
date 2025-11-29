```markdown
# Extract (avidia) — usage and integration

This document describes the Extract client and the local proxy API in avidiatech-app which call the canonical medx-ingest-api /ingest endpoint.

Files added
- src/services/avidiaExtractToIngest.ts — TypeScript client used by server-side code.
- src/app/api/v1/ingest/[id]/route.ts — App Router route that proxies GET ?url=<url>.
- scripts/run-extract.ts — smoke-runner for local / CI validation.
- types/ingest.d.ts — IngestResult typing for consumers.

Environment
- INGEST_API_ENDPOINT (optional) — base URL for ingest service (default: https://medx-ingest-api.onrender.com)
- INGEST_API_KEY (optional) — API key header sent as x-api-key (if required by ingest API)

How other modules should call Extract
- Server-side (recommended):
  import { extractAndIngest } from 'src/services/avidiaExtractToIngest';
  const result = await extractAndIngest('https://example.com/product/abc');

- Via HTTP (if calling the avidiatech-app route):
  GET /api/v1/ingest/{any-id}?url=<encoded-url>
  Example:
    curl "https://your-app.example.com/api/v1/ingest/test1?url=https%3A%2F%2Fwww.apple.com%2Fiphone-17%2F"

Smoke test
- Locally:
  npm ci
  npx ts-node -O '{"module":"commonjs"}' scripts/run-extract.ts "https://www.apple.com/iphone-17/"

- GitHub Actions:
  Use the workflow "Dispatch - Run Avidia Extract smoke test" (manual dispatch). Provide `url` input and ensure repository secrets are set:
    - INGEST_API_ENDPOINT
    - INGEST_API_KEY

Notes
- The client uses global fetch where available. For local Node <18 environments, node-fetch@2 is installed as a fallback.
- The client performs retries with exponential backoff and a default 120s timeout.
- The IngestResult type is intentionally partial — add fields as you need them.
```
