import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOrgFromRequest } from "@/lib/auth/getOrgFromRequest";
import { isOrgAdmin } from "@/lib/auth/isOrgAdmin";

/**
 * DELETE /api/v1/ecommerce_connections/:id
 * - Admin-only
 * - Soft-delete by default: status='deleted' and wipe secrets_enc
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function DELETE(req: Request, context: any) {
  // normalize params (Next.js route-context)
  let params = context?.params;
  if (params && typeof params.then === "function") params = await params;
  const id = params?.id;
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  try {
    // auth + admin check
    const orgId = await getOrgFromRequest(req);
    if (!orgId) return NextResponse.json({ ok: false, error: "not authenticated" }, { status: 401 });
    const admin = await isOrgAdmin(req, orgId);
    if (!admin) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    // fetch connection to verify tenant ownership
    const { data: conn, error: fetchErr } = await supaAdmin
      .from("ecommerce_connections")
      .select("id, tenant_id, platform, status")
      .eq("id", id)
      .single();

    if (fetchErr || !conn) return NextResponse.json({ ok: false, error: fetchErr?.message ?? "not found" }, { status: 404 });

    // ensure the connection belongs to the caller's tenant
    if (String(conn.tenant_id) !== String(orgId)) {
      return NextResponse.json({ ok: false, error: "connection not owned by tenant" }, { status: 403 });
    }

    // Soft-delete: wipe secrets and mark deleted
    const { error: updErr } = await supaAdmin
      .from("ecommerce_connections")
      .update({ status: "deleted", secrets_enc: null, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updErr) {
      return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "connection deleted (soft)" }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
