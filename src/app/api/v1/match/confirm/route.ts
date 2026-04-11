import { NextResponse } from "next/server";
import { idListSchema } from "@/lib/match/validators";
import { getCurrentTenantId } from "@/lib/auth";
import { updateRowsStatus } from "@/lib/match/db";

export async function POST(req: Request) {
  if (process.env.FEATURE_MATCH !== "true") return NextResponse.json({ error: "feature-disabled" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = idListSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  const tenantId = getCurrentTenantId(req);
  await updateRowsStatus(tenantId, parsed.data.ids, "confirmed");
  return NextResponse.json({ updated: parsed.data.ids.length });
}
