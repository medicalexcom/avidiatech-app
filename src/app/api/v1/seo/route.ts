import { NextResponse, type NextRequest } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { runSeoForIngestion } from "@/lib/seo/runSeoForIngestion";

export async function POST(req: NextRequest) {
  try {
    const auth = safeGetAuth(req as any) as { userId?: string | null } | null;
    const userId = auth?.userId ?? null;
    if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as any;
    const ingestionId = body?.ingestionId?.toString() || "";
    if (!ingestionId) return NextResponse.json({ error: "missing_ingestionId" }, { status: 400 });

    const result = await runSeoForIngestion(ingestionId);

    return NextResponse.json(
      {
        ingestionId: result.ingestionId,
        descriptionHtml: result.descriptionHtml,
        sections: result.sections,
        seo: result.seo,
        features: result.features,
        data_gaps: result.data_gaps,

        // legacy aliases
        seo_payload: result.seo,
        description_html: result.descriptionHtml,
      },
      { status: 200 }
    );
  } catch (err: any) {
    const msg = err?.message || "internal_error";
    const code = err?.code;

    if (msg === "ingestion_not_found") return NextResponse.json({ error: "ingestion_not_found" }, { status: 404 });
    if (msg === "missing_required_ingestion_payload")
      return NextResponse.json({ error: "missing_required_ingestion_payload" }, { status: 400 });

    if (msg.startsWith("ingestion_load_failed:"))
      return NextResponse.json({ error: "ingestion_load_failed", detail: msg }, { status: 500 });

    if (msg.startsWith("seo_persist_failed:"))
      return NextResponse.json({ error: "seo_persist_failed", detail: msg }, { status: 500 });

    if (msg === "OPENAI_API_KEY not configured") {
      return NextResponse.json({ error: "openai_not_configured" }, { status: 500 });
    }

    if (
      code === "seo_invalid_model_output" ||
      msg.startsWith("seo_invalid_model_output:") ||
      msg.startsWith("seo_missing_custom_instructions:")
    ) {
      return NextResponse.json(
        { error: "seo_invalid_model_output", detail: msg, debug: err?.debug ?? null },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
