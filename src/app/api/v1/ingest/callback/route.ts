// POST /api/v1/ingest/callback - ingestion engine calls back here with results
import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { verifySignature as importedVerifySignature } from "@/lib/ingest/signature";

const INGEST_SECRET = process.env.INGEST_SECRET || "";

/**
 * Helper: fallback HMAC verification if imported verifySignature doesn't match.
 */
function verifyHmac(body: string, signature?: string) {
  if (!INGEST_SECRET || !signature) return false;
  try {
    const h = crypto.createHmac("sha256", INGEST_SECRET).update(body).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(h, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const sig = req.headers.get("x-avidiatech-signature") || req.headers.get("x-signature") || "";
    const bodyText = await req.text();

    // Try imported verifier first (some implementations expect secret arg; preserve compatibility).
    let okSig = false;
    try {
      // prefer the imported function if available
      if (typeof importedVerifySignature === "function") {
        // many helper variants: try common signatures
        try {
          okSig = importedVerifySignature(bodyText, sig); // (body, sig)
        } catch {
          try {
            // some helpers accept (body, sig, secret)
            // @ts-ignore
            okSig = importedVerifySignature(bodyText, sig, INGEST_SECRET);
          } catch {
            // fallthrough
            okSig = false;
          }
        }
      }
    } catch {
      okSig = false;
    }

    // Fallback to local HMAC verification
    if (!okSig) {
      okSig = verifyHmac(bodyText, sig);
    }

    if (!okSig) {
      console.warn("invalid ingest callback signature");
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }

    const body = JSON.parse(bodyText);
    // Accept multiple possible job id keys for robustness
    const jobId = body.job_id || body.jobId || body.id || body.job?.id;
    const correlation_id = body.correlation_id || body.correlationId || body.correlation || null;
    const status = body.status || "success";
    const normalized_payload = body.normalized_payload ?? body.normalizedPayload ?? body.normalized ?? null;
    const raw_payload = body.raw_payload ?? body.rawPayload ?? null;
    const diagnostics = body.diagnostics ?? null;
    const errorFromEngine = body.error ?? body.err ?? null;

    if (!jobId) {
      console.warn("callback missing job id", { body });
      return NextResponse.json({ error: "missing job_id" }, { status: 400 });
    }

    // Create supabase client lazily and using service role key (throws if misconfigured)
    let supabase;
    try {
      supabase = getServiceSupabaseClient();
    } catch (err: any) {
      console.error("Supabase configuration missing", err?.message || err);
      return NextResponse.json({ error: "server misconfigured: missing Supabase envs" }, { status: 500 });
    }

    // Build update object: only set fields that exist to avoid clobbering
    const updatePayload: any = {
      status,
      completed_at: new Date().toISOString(),
    };
    if (normalized_payload !== null) updatePayload.normalized_payload = normalized_payload;
    if (raw_payload !== null) updatePayload.raw_payload = raw_payload;
    if (diagnostics !== null) updatePayload.diagnostics = diagnostics;
    if (errorFromEngine !== null) updatePayload.error = errorFromEngine;

    // Update product_ingestions record
    const { error: updateError } = await supabase.from("product_ingestions").update(updatePayload).eq("id", jobId);
    if (updateError) {
      console.error("failed to update product_ingestions from callback", updateError);
      return NextResponse.json({ error: "db_update_failed" }, { status: 500 });
    }

    // Usage counters / logs: try to increment safely
    try {
      const { data: ingestRow, error: fetchErr } = await supabase.from("product_ingestions").select("tenant_id, user_id").eq("id", jobId).single();
      if (!fetchErr && ingestRow?.tenant_id) {
        const tenant_id = ingestRow.tenant_id;
        const user_id = ingestRow.user_id || null;
        const month = new Date().toISOString().slice(0, 7);

        // Try to atomically increment existing counter; if missing insert a new row.
        // Read current counter
        const { data: counter, error: counterErr } = await supabase.from("usage_counters").select("*").eq("tenant_id", tenant_id).limit(1).single();
        if (!counterErr && counter) {
          const newCount = (counter.ingest_calls || 0) + 1;
          await supabase.from("usage_counters").update({ ingest_calls: newCount }).eq("tenant_id", tenant_id);
        } else {
          // create initial counter row
          await supabase.from("usage_counters").insert({ tenant_id, month, ingest_calls: 1 });
        }

        // Insert usage log
        await supabase.from("usage_logs").insert({
          tenant_id,
          user_id,
          product_ingestion_id: jobId,
          event: "ingest_callback",
          payload: { correlation_id },
          count: 1,
          created_at: new Date().toISOString(),
        });
      } else {
        // no tenant found; skip usage increment
      }
    } catch (err) {
      console.warn("usage increment failed", err);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("ingest callback error:", err);
    return NextResponse.json({ error: err.message || "internal_error" }, { status: 500 });
  }
}
