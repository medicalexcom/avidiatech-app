import { NextResponse, type NextRequest } from "next/server";
import { requireTenantFromRequest } from "@/lib/monitor/tenant";
import { trackUrl } from "@/lib/monitor/track";

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantFromRequest(req as any);

    const body = (await req.json().catch(() => ({}))) as any;
    const url = (body?.url ?? "").toString().trim();
    const moduleName = (body?.module ?? body?.moduleName ?? "unknown").toString().trim().toLowerCase();
    const externalSku = body?.external_sku ?? body?.externalSku ?? null;

    if (!url) return NextResponse.json({ ok: false, error: "missing_url" }, { status: 400 });

    await trackUrl({ tenantId, url, moduleName, externalSku });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    if (msg === "unauthenticated") return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    if (msg === "tenant_resolution_failed") return NextResponse.json({ ok: false, error: "tenant_resolution_failed" }, { status: 400 });
    return NextResponse.json({ ok: false, error: "internal_error", detail: msg }, { status: 500 });
  }
}
