"use server";

export async function ingestAction(url: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL;

  if (!base) {
    throw new Error("Missing NEXT_PUBLIC_BASE_URL");
  }

  const res = await fetch(`${base}/api/v1/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
    cache: "no-store",
  });

  return await res.json();
}
