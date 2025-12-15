/**
 * Monitor module
 *
 * - Reads input artifact (JSON array or NDJSON or CSV converted to JSON array by extract).
 * - Performs monitoring checks:
 *   - row_count
 *   - duplicate keys (by 'sku' if present)
 *   - missing required fields (sku, title, price)
 * - Writes diagnostics JSON to storage and returns an outputRef (bucket path) and summary.
 *
 * Contract:
 *  export async function run(context: {
 *    runId: string;
 *    moduleIndex: number;
 *    inputRef: string;           // path relative to bucket OR full storage path the runner provides
 *    bucket?: string;            // defaults to 'imports'
 *    supabaseUrl?: string;
 *    supabaseServiceKey?: string;
 *  }): Promise<{ status: 'succeeded'|'failed', outputRef?: string, diagnostics?: any, error?: string }>
 */
import { createClient } from "@supabase/supabase-js";

type Context = {
  runId: string;
  moduleIndex: number;
  inputRef: string;
  bucket?: string;
  supabaseUrl?: string;
  supabaseServiceKey?: string;
};

function safeJsonStringify(v: any) {
  try { return JSON.stringify(v, null, 2); } catch (e) { return String(v); }
}

async function downloadText(supabaseAdmin: ReturnType<typeof createClient>, bucket: string, path: string) {
  const { data, error } = await supabaseAdmin.storage.from(bucket).download(path);
  if (error || !data) throw new Error(error?.message ?? "download failed");
  const buf = Buffer.from(await data.arrayBuffer());
  return buf.toString("utf-8");
}

async function uploadText(supabaseAdmin: ReturnType<typeof createClient>, bucket: string, path: string, content: string, contentType = "application/json") {
  const { error } = await supabaseAdmin.storage.from(bucket).upload(path, Buffer.from(content), { contentType, upsert: true });
  if (error) throw new Error(error.message ?? "upload failed");
  return `${bucket}/${path}`;
}

export async function run(ctx: Context) {
  const bucket = ctx.bucket ?? "imports";
  const SUPABASE_URL = ctx.supabaseUrl ?? process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = ctx.supabaseServiceKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { status: "failed", error: "Missing Supabase env for module" };
  }
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  try {
    // inputRef is path relative to bucket or may include bucket prefix
    let rel = String(ctx.inputRef || "").replace(/^\/+/, "");
    if (rel.startsWith(`${bucket}/`)) rel = rel.slice(bucket.length + 1);

    // Attempt to download and parse
    const text = await downloadText(supabaseAdmin, bucket, rel);

    // Try parse JSON, NDJSON, or CSV fallback (CSV will be parsed minimally)
    let rows: any[] = [];
    try {
      // If NDJSON (newline-delimited JSON) -> split lines
      if (text.trim().startsWith("{") === false && text.split("\n").every((l) => l.trim().startsWith("{") || l.trim() === "")) {
        rows = text
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => JSON.parse(l));
      } else {
        rows = JSON.parse(text);
        if (!Array.isArray(rows)) {
          // If the JSON is an object with data field
          rows = rows?.data ?? rows?.rows ?? (Array.isArray(rows) ? rows : [rows]);
        }
      }
    } catch (e) {
      // minimal CSV fallback: split rows by newline and comma
      rows = text
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean)
        .map((line) => line.split(",").map((c) => c.replace(/^"(.*)"$/, "$1")));
      // convert header+rows into objects if header row looks like strings
      if (rows.length >= 2 && rows[0].every((c: any) => typeof c === "string" && c.length > 0)) {
        const hdr = rows[0] as string[];
        rows = (rows.slice(1) as any[]).map((rr) => {
          const obj: any = {};
          for (let i = 0; i < hdr.length; i++) obj[hdr[i]] = rr[i] ?? "";
          return obj;
        });
      }
    }

    // Monitoring checks
    const rowCount = rows.length;
    const key = "sku";
    const missing = [];
    const duplicates: Record<string, number> = {};
    const seen = new Map<string, number>();
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] ?? {};
      const sku = r[key];
      if (!sku || String(sku).trim() === "") missing.push({ row: i + 1, reason: "missing_sku" });
      if (sku) {
        const s = String(sku);
        const c = (seen.get(s) ?? 0) + 1;
        seen.set(s, c);
        if (c > 1) duplicates[s] = c;
      }
      // also check required fields like title & price
      if (!r.title || String(r.title).trim() === "") missing.push({ row: i + 1, reason: "missing_title" });
      if (r.price === undefined || r.price === null || r.price === "") missing.push({ row: i + 1, reason: "missing_price" });
    }

    const diagnostics = {
      row_count: rowCount,
      missing_summary: { count: missing.length, examples: missing.slice(0, 10) },
      duplicate_skus: Object.keys(duplicates).length,
      duplicate_examples: Object.entries(duplicates).slice(0, 10).map(([sku, count]) => ({ sku, count })),
      sample_rows: rows.slice(0, 5),
    };

    // Upload diagnostics
    const diagPath = `artifacts/${ctx.runId}/monitor-diagnostics.json`;
    const outputPath = `artifacts/${ctx.runId}/monitor-output.json`;
    await uploadText(supabaseAdmin, bucket, diagPath, safeJsonStringify(diagnostics));
    // output artifact can be a simple summary plus maybe sanitized rows (we'll not copy full rows to avoid large uploads)
    const outputObj = { summary: diagnostics, generated_at: new Date().toISOString() };
    await uploadText(supabaseAdmin, bucket, outputPath, safeJsonStringify(outputObj));

    return {
      status: "succeeded",
      outputRef: `${bucket}/${outputPath}`,
      diagnostics,
    };
  } catch (err: any) {
    const e = String(err?.message ?? err);
    return { status: "failed", error: e };
  }
}
