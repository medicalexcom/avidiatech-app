import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOrgFromRequest } from "@/lib/auth/getOrgFromRequest";
import { isOrgAdmin } from "@/lib/auth/isOrgAdmin";
import { decryptSecrets } from "@/lib/integrations/encryption";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function validateBC(storeHash: string, token: string) {
  const res = await fetch(`https://api.bigcommerce.com/stores/${encodeURIComponent(storeHash)}/v3/catalog/products?limit=1`, {
    headers: { "X-Auth-Token": token, Accept: "application/json" },
  });
  const txt = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, detail: txt };
}

export async function GET(req: Request, context: any) {
  // params normalization
  let params = context?.params;
  if (params && typeof params.then === "function") params = await params;
  const id = params?.id;
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  // auth + admin check
  const orgId = await getOrgFromRequest(req);
  if (!orgId) return NextResponse.json({ ok: false, error: "not authenticated" }, { status: 401 });
  const admin = await isOrgAdmin(req, orgId);
  if (!admin) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  // fetch connection
  const { data, error } = await supaAdmin.from("ecommerce_connections").select("*").eq("id", id).single();
  if (error || !data) return NextResponse.json({ ok: false, error: error?.message ?? "not found" }, { status: 404 });

  try {
    const cfg = data.config ?? {};
    const storeHash = cfg.store_hash ?? cfg.storeHash;
    if (!data.secrets_enc) return NextResponse.json({ ok: false, error: "no secrets" }, { status: 400 });

    const secrets = decryptSecrets(data.secrets_enc);
    const token = secrets.access_token ?? secrets.accessToken ?? secrets.token;
    if (!token) return NextResponse.json({ ok: false, error: "no token in secrets" }, { status: 400 });

    const test = await validateBC(storeHash, token);
    return NextResponse.json({ ok: true, result: test }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
