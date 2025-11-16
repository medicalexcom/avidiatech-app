export async function ingestProduct(url: string) {
  const base = process.env.NEXT_PUBLIC_INGEST_API_URL;
  if (!base) throw new Error("NEXT_PUBLIC_INGEST_API_URL is not set");
  const res = await fetch(`${base}/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function parsePdf(file: File) {
  const base = process.env.NEXT_PUBLIC_INGEST_API_URL;
  if (!base) throw new Error("NEXT_PUBLIC_INGEST_API_URL is not set");
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${base}/parse-pdf`, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function runOcr(file: File) {
  const base = process.env.NEXT_PUBLIC_INGEST_API_URL;
  if (!base) throw new Error("NEXT_PUBLIC_INGEST_API_URL is not set");
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${base}/ocr`, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function fetchProducts() {
  const base = process.env.NEXT_PUBLIC_INGEST_API_URL;
  if (!base) throw new Error("NEXT_PUBLIC_INGEST_API_URL is not set");
  const res = await fetch(`${base}/products`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function renderPage(url: string) {
  const base = process.env.NEXT_PUBLIC_RENDER_API_URL;
  if (!base) throw new Error("NEXT_PUBLIC_RENDER_API_URL is not set");
  const res = await fetch(`${base}/render?url=${encodeURIComponent(url)}&mode=fast`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.text();
}
