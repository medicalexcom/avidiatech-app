// Run: SERVICE_API_KEY="..." PIPELINE_INTERNAL_SECRET="..." INTERNAL_API_BASE="https://app.avidiatech.com" node scripts/debug-ingest.js "https://www.apple.com/apple-watch-hermes/"
const fetch = require('node-fetch');

const target = process.argv[2] || 'https://www.apple.com/apple-watch-hermes/';
const internalApiBase = process.env.INTERNAL_API_BASE || 'https://app.avidiatech.com';
const secret = process.env.SERVICE_API_KEY || process.env.PIPELINE_INTERNAL_SECRET || '';

(async () => {
  try {
    console.log('[debug-ingest] INTERNAL_API_BASE:', internalApiBase);
    console.log('[debug-ingest] using header x-service-api-key length:', secret ? secret.length : 0);
    const url = `${internalApiBase.replace(/\/$/, '')}/api/v1/ingest`;
    const payload = { url: target, persist: true, options: { includeSeo: true } };
    console.log('[debug-ingest] POST', url);
    console.log('[debug-ingest] payload.url =', payload.url);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-api-key': secret
      },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log('[debug-ingest] STATUS:', res.status);
    console.log('[debug-ingest] BODY:', text);
  } catch (err) {
    console.error('[debug-ingest] ERROR:', err);
  }
})();
