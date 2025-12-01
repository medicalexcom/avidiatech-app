// src/lib/utils/safeFetch.ts
export async function safeFetch(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {}
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), init.timeoutMs ?? 15000);

  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}
