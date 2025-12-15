import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Return failed import rows for an import job as JSON.
 * - Query import_rows where job_id = id AND status != 'success'
 * - You can extend to return CSV by setting ?format=csv
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env.
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

    const url = new URL(req.url);
    const format = url.searchParams.get("format") ?? "json";

    const { data, error } = await supaAdmin.from("import_rows").select("*").eq("job_id", id).neq("status", "success").order("row_number", { ascending: true });
    if (error) throw error;

    if (format === "csv") {
      // Convert to CSV
      const rows = data ?? [];
      if (!rows.length) return new Response("", { status: 204 });
      const headers = Object.keys(rows[0].data ?? {});
      const csv = [headers.join(","), ...rows.map((r: any) => headers.map((h) => `"${String((r.data ?? {})[h] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
      return new Response(csv, { headers: { "Content-Type": "text/csv" } });
    }

    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
