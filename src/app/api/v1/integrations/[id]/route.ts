import { NextResponse } from "next/server";
import { getOrgFromRequest } from "@/lib/auth/getOrgFromRequest";
import { isOrgAdmin } from "@/lib/auth/isOrgAdmin";
import { getServerSupabase } from "@/lib/supabase";

/**
 * DELETE /api/v1/integrations/:id
 * - Admin-only
 * - Soft-delete by default: set status='deleted' and wipe encrypted_secrets (encrypted_secrets or encrypted_secrets column name may vary)
 * - Adjust column names if your integrations table uses a different secrets column name.
 */


export async function DELETE(req: Request, context: any) {
  // normalize params (Next.js route context)
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

    // fetch integration to verify tenant ownership
    const { data: row, error: fetchErr } = await getServerSupabase()
      .from("integrations")
      .select("id, org_id, provider, status, encrypted_secrets")
      .eq("id", id)
      .single();

    if (fetchErr || !row) return NextResponse.json({ ok: false, error: fetchErr?.message ?? "not found" }, { status: 404 });

    // ensure integration belongs to this tenant
    // org_id may be stored as text or uuid, compare string form
    if (String(row.org_id) !== String(orgId)) {
      return NextResponse.json({ ok: false, error: "integration not owned by tenant" }, { status: 403 });
    }

    // Soft-delete: wipe secrets and mark deleted
    const { error: updErr } = await getServerSupabase()
      .from("integrations")
      .update({ status: "deleted", encrypted_secrets: null, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updErr) {
      return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "integration deleted (soft)" }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
