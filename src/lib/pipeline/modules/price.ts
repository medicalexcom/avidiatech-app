/**
 * Price module
 *
 * - Reads input artifact (JSON array) produced by extract/audit.
 * - Normalizes price fields:
 *   - ensures `price` is numeric
 *   - applies a default tax or markup if configured
 * - Produces an artifact with a `price_cents` and `price_with_tax` fields, plus diagnostics for invalid rows.
 *
 * Contract is same as monitor.run: returns { status, outputRef, diagnostics }.
 */
import { createClient } from "@supabase/supabase-js";

type Context = {
  runId: string;
  moduleIndex: number;
  inputRef: string;
  bucket?: string;
  supabaseUrl?: string;
  supabaseServiceKey?: string;
  defaultTaxPercent?: number; // e.g. 0.1 for 10%
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
  const defaultTax = typeof ctx.defaultTaxPercent === "number" ? ctx.defaultTaxPercent : 0.1;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { status: "failed", error: "Missing Supabase env for price module" };
  }
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  try {
    let rel = String(ctx.inputRef || "").replace(/^\/+/, "");
    if (rel.startsWith(`${bucket}/`)) rel = rel.slice(bucket.length + 1);

    const text = await downloadText(supabaseAdmin, bucket, rel);
    // parse JSON or NDJSON, assume JSON array for price module
    let rows: any[] = [];
    try {
      rows = JSON.parse(text);
      if (!Array.isArray(rows)) rows = rows?.data ?? rows?.rows ?? [rows];
    } catch {
      // fallback: NDJSON
      rows = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => JSON.parse(l));
    }

    const diagnostics: any[] = [];
    const out: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = { ...(rows[i] ?? {}) };
      const raw = r.price ?? r.price_cents ?? r.price_cents_raw ?? null;
      let priceNum: number | null = null;

      if (raw === null || raw === undefined || raw === "") {
        diagnostics.push({ row: i + 1, reason: "missing_price" });
      } else {
        // accept "12.34" or "1234" (cents) or numbers
        const asNumber = Number(String(raw).replace(/[^0-9.\-]/g, ""));
        if (Number.isFinite(asNumber)) {
          priceNum = asNumber;
          // if looks like cents (large integer) heuristics: if >= 1000 and no decimal point, maybe cents
          if (!String(raw).includes(".") && Math.abs(asNumber) >= 1000) {
            // treat as cents
            priceNum = asNumber / 100;
          }
        } else {
          diagnostics.push({ row: i + 1, reason: "invalid_price", raw });
        }
      }

      if (priceNum !== null) {
        const priceCents = Math.round(priceNum * 100);
        const priceWithTax = Math.round(priceNum * (1 + defaultTax) * 100) / 100;
        r.price_cents = priceCents;
        r.price = priceNum;
        r.price_with_tax = priceWithTax;
      }
      out.push(r);
    }

    const outputPath = `artifacts/${ctx.runId}/price-output.json`;
    const diagPath = `artifacts/${ctx.runId}/price-diagnostics.json`;

    await uploadText(supabaseAdmin, bucket, outputPath, safeJsonStringify(out));
    await uploadText(supabaseAdmin, bucket, diagPath, safeJsonStringify({ diagnostics, count: diagnostics.length }));

    return {
      status: "succeeded",
      outputRef: `${bucket}/${outputPath}`,
      diagnostics: { count: diagnostics.length, examples: diagnostics.slice(0, 10) },
    };
  } catch (err: any) {
    return { status: "failed", error: String(err?.message ?? err) };
  }
}
