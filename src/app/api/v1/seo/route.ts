import { NextResponse, type NextRequest } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { runSeoForIngestion } from "@/lib/seo/runSeoForIngestion";

export async function POST(req: NextRequest) {
  try {
    console.log("[api/v1/seo] POST called");
    // 1) Auth (Clerk)
    const auth = safeGetAuth(req as any) as { userId?: string | null } | null;
    const userId = auth?.userId ?? null;

    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    // 2) Parse body
    const body = (await req.json().catch(() => ({}))) as any;
    const ingestionId = body?.ingestionId?.toString() || "";

    if (!ingestionId) {
      return NextResponse.json({ error: "missing_ingestionId" }, { status: 400 });
    }

    // 3-7 moved to shared helper; output is identical shape
    const result = await runSeoForIngestion(ingestionId);

    return NextResponse.json(
      {
        ingestionId: result.ingestionId,
        seo_payload: result.seo_payload,
        description_html: result.description_html,
        features: result.features,
      },
      { status: 200 }
    );
  } catch (err: any) {
    // Match prior behavior: if we throw, it was internal_error.
    // Shared helper throws explicit messages that we map below.
    const msg = err?.message || "internal_error";

    if (msg === "ingestion_not_found") {
      return NextResponse.json({ error: "ingestion_not_found" }, { status: 404 });
    }
    if (msg === "ingestion_not_ready") {
      return NextResponse.json({ error: "ingestion_not_ready" }, { status: 409 });
    }
    if (msg.startsWith("ingestion_load_failed:")) {
      return NextResponse.json({ error: "ingestion_load_failed" }, { status: 500 });
    }

    // Central GPT failures previously returned `{ error: "seo_model_failed", detail }`
    if (
      msg === "central_gpt_invalid_json" ||
      msg.startsWith("central_gpt_not_configured:") ||
      msg.startsWith("central_gpt_seo_error:")
    ) {
      return NextResponse.json({ error: "seo_model_failed", detail: msg }, { status: 500 });
    }

    if (msg.startsWith("seo_persist_failed:")) {
      return NextResponse.json({ error: "seo_persist_failed", detail: msg }, { status: 500 });
    }

    console.error("POST /api/v1/seo error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
