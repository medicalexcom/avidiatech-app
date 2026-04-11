// Simple fetch wrapper for internal API calls.
// Usage: apiFetch("/api/v1/integrations/<id>", { method: "DELETE" })
export async function apiFetch(path: string, init: RequestInit = {}) {
  const opts: RequestInit = {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  };

  const res = await fetch(path, opts);
  // Try parse JSON
  let json: any = null;
  try {
    json = await res.json();
  } catch {}
  if (!res.ok) {
    const msg = json?.error ?? json ?? `Status ${res.status}`;
    const err = new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    // attach response for caller if needed
    (err as any).status = res.status;
    (err as any).response = json;
    throw err;
  }
  return json;
}
