export interface SeoIngestionJobResult {
  queued: boolean;
  jobId: string;
  ingestionId: string;
  reason?: string;
}

/**
 * Temporary queue shim.
 *
 * The SEO refactor started calling a background queue helper that was never committed.
 * To keep the app deployable and the synchronous SEO flow working, this helper records
 * the intent and returns a non-throwing result.
 */
export async function createSeoIngestionJob(
  jobId: string,
  ingestionId: string,
  payload?: unknown
): Promise<SeoIngestionJobResult> {
  const payloadSummary = (() => {
    try {
      if (!payload || typeof payload !== "object") return "no-payload";
      return Object.keys(payload as Record<string, unknown>).slice(0, 12).join(", ");
    } catch {
      return "payload-summary-unavailable";
    }
  })();

  console.info(
    `[seoIngestionQueue] queue shim active; not enqueuing job ${jobId} for ingestion ${ingestionId}. payload keys: ${payloadSummary}`
  );

  return {
    queued: false,
    jobId,
    ingestionId,
    reason: "seo_queue_not_configured",
  };
}

export default createSeoIngestionJob;
