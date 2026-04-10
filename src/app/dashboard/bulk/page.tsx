import BulkJobClient from "./BulkJobClient";

type SearchParams = Record<string, string | string[] | undefined>;

async function safeJson(res: Response) {
  const text = await res.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { _raw: text };
  }
}

export default async function BulkJobPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams;
}) {
  const sp = await Promise.resolve(searchParams);
  const bulkJobIdRaw = sp?.bulkJobId;
  const bulkJobId = Array.isArray(bulkJobIdRaw) ? bulkJobIdRaw[0] : bulkJobIdRaw || "";

  // Initial server fetch to render something immediately (faster + SEO-friendly).
  // IMPORTANT: we keep the same endpoints already used by the existing UI.
  let initialJob: any = null;
  let initialItems: any[] = [];
  let initialError: string | null = null;

  if (bulkJobId) {
    try {
      const jobRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/v1/bulk/${encodeURIComponent(bulkJobId)}`, {
        // Ensure we don't get cached/stale data for a live dashboard
        cache: "no-store",
      });

      if (!jobRes.ok) {
        const j = await safeJson(jobRes);
        throw new Error(j?.error ?? `Failed to fetch job (${jobRes.status})`);
      }

      const j = await safeJson(jobRes);
      initialJob = j?.data ?? j;

      const limit = 200;
      const offset = 0;
      const itemsRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/v1/bulk/${encodeURIComponent(bulkJobId)}/items?limit=${limit}&offset=${offset}`,
        { cache: "no-store" }
      );

      if (!itemsRes.ok) {
        const ij = await safeJson(itemsRes);
        throw new Error(ij?.error ?? `Failed to fetch items (${itemsRes.status})`);
      }

      const ij = await safeJson(itemsRes);
      initialItems = ij?.data ?? ij ?? [];
    } catch (e: any) {
      initialError = String(e?.message || e);
    }
  }

  return (
    <BulkJobClient
      initialBulkJobId={bulkJobId}
      initialJob={initialJob}
      initialItems={initialItems}
      initialError={initialError}
    />
  );
}
