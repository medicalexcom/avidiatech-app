import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Return failed import rows for an import job as JSON or CSV.
 * - Query import_rows where job_id = id AND status != 'success'
 *
 * Note: normalize context.params because Next's context.params can be a Promise in some Next versions.
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function GET(req: Request, context: any) {
  try {
    // normalize params (context.params may be a Promise)
    let params = context?.params;
    if (params && typeof params?.then === "function") {
      params = await params;
    }
    const id = params?.id;
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

    const url = new URL(req.url);
    const format = url.searchParams.get("format") ?? "json";

    const { data, error } = await supaAdmin
      .from("import_rows")
      .select("*")
      .eq("job_id", id)
      .neq("status", "success")
      .order("row_number", { ascending: true });

    if (error) throw error;

    if (format === "csv") {
      const rows = data ?? [];
      if (!rows.length) return new Response("", { status: 204 });
      // flatten data objects to CSV using union of keys
      const headerSet = new Set<string>();
      for (const r of rows) {
        const d = r.data ?? {};
        for (const k of Object.keys(d)) headerSet.add(k);
      }
      const headers = Array.from(headerSet);
      const csvLines = [headers.join(",")];
      for (const r of rows) {
        const d = r.data ?? {};
        const line = headers
          .map((h) => {
            const v = d[h] ?? "";
            return `"${String(v).replace(/"/g, '""')}"`;
          })
          .join(",");
        csvLines.push(line);
      }
      const csv = csvLines.join("\n");
      return new Response(csv, { headers: { "Content-Type": "text/csv" } });
    }

    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
