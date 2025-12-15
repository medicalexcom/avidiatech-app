/**
 * Core Monitor logic
 * - fetches a URL
 * - extracts a normalized snapshot (title, price, specs table, images)
 * - computes a simple diff against last_snapshot
 * - writes a monitor_event row and updates the watch last_snapshot/last_check_at/last_status
 *
 * Uses Supabase admin (service role) to read/write DB and storage.
 *
 * Requires env:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Note: uses global fetch (Node 18+ / Vercel). Keep cheerio as a dependency.
 */

import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export type Snapshot = {
  url: string;
  title?: string | null;
  price?: number | null;
  images?: string[] | null;
  specs?: Record<string, string> | null;
  rawHtml?: string | null;
  fetched_at?: string | null;
};

function parsePrice(text: string | undefined): number | null {
  if (!text) return null;
  const cleaned = String(text).replace(/[, ]+/g, "").match(/-?\d+(\.\d+)?/);
  if (!cleaned) return null;
  const n = Number(cleaned[0]);
  if (Number.isNaN(n)) return null;
  return n;
}

function normalizeSpecs($: cheerio.Root): Record<string, string> {
  const specs: Record<string, string> = {};
  $("table").each((_, table) => {
    const rows = $(table).find("tr");
    rows.each((_, tr) => {
      const tds = $(tr).find("td, th");
      if (tds.length >= 2) {
        const k = $(tds[0]).text().trim();
        const v = $(tds[1]).text().trim();
        if (k) specs[k] = v;
      }
    });
  });
  return specs;
}

function computeDiff(oldSnap: Snapshot | null, newSnap: Snapshot) {
  const diffs: Record<string, any> = {};
  if (!oldSnap) {
    diffs._type = "initial_snapshot";
    diffs.new = newSnap;
    return diffs;
  }
  if ((oldSnap.title || "") !== (newSnap.title || "")) diffs.title = { from: oldSnap.title ?? null, to: newSnap.title ?? null };
  if ((oldSnap.price ?? null) !== (newSnap.price ?? null)) diffs.price = { from: oldSnap.price ?? null, to: newSnap.price ?? null };
  const oldSpecs = oldSnap.specs ?? {};
  const newSpecs = newSnap.specs ?? {};
  const added: Record<string,string> = {};
  const removed: Record<string,string> = {};
  const changed: Record<string,{from:string|null,to:string|null}> = {};
  for (const k of Object.keys(newSpecs)) {
    if (!(k in oldSpecs)) added[k] = newSpecs[k];
    else if ((oldSpecs[k] ?? "") !== (newSpecs[k] ?? "")) changed[k] = { from: oldSpecs[k] ?? null, to: newSpecs[k] ?? null };
  }
  for (const k of Object.keys(oldSpecs)) {
    if (!(k in newSpecs)) removed[k] = oldSpecs[k];
  }
  if (Object.keys(added).length || Object.keys(removed).length || Object.keys(changed).length) {
    diffs.specs = { added, removed, changed };
  }
  const oldImgs = new Set((oldSnap.images ?? []).map(String));
  const newImgs = new Set((newSnap.images ?? []).map(String));
  const imgsAdded = [...newImgs].filter((i) => !oldImgs.has(i));
  const imgsRemoved = [...oldImgs].filter((i) => !newImgs.has(i));
  if (imgsAdded.length || imgsRemoved.length) diffs.images = { added: imgsAdded, removed: imgsRemoved };
  return diffs;
}

export async function runWatchOnce(watchId: string) {
  const { data: watchRow, error: watchErr } = await supabaseAdmin.from("monitor_watches").select("*").eq("id", watchId).limit(1).maybeSingle();
  if (watchErr) throw new Error(`failed to load watch ${watchErr.message ?? String(watchErr)}`);
  if (!watchRow) throw new Error("watch not found");

  const url = String(watchRow.source_url);
  let snapshot: Snapshot = { url, fetched_at: new Date().toISOString() };

  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      const payload = { status: res.status, statusText: res.statusText };
      await supabaseAdmin.from("monitor_events").insert([{ watch_id: watchId, tenant_id: watchRow.tenant_id ?? null, product_id: watchRow.product_id ?? null, event_type: "scrape_failed", severity: "warning", payload }]);
      await supabaseAdmin.from("monitor_watches").update({ last_check_at: new Date().toISOString(), last_status: "scrape_failed" }).eq("id", watchId);
      return { ok: false, reason: "scrape_failed", payload };
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    snapshot.title = ($("meta[property='og:title']").attr("content") || $("title").text() || $("h1").first().text() || "").trim() || null;

    const priceSelectors = ["[itemprop=price]", ".price", ".product-price", ".price__amount", "#price", ".sale-price"];
    let priceText: string | null = null;
    for (const sel of priceSelectors) {
      const el = $(sel).first();
      if (el && el.text()) {
        priceText = el.text().trim();
        break;
      }
    }
    if (!priceText) {
      const bodyText = $("body").text();
      const m = bodyText.match(/[$]\s*\d[\d,\.]*/);
      if (m) priceText = m[0];
    }
    snapshot.price = priceText ? parsePrice(priceText) : null;

    const imgs: string[] = [];
    $("img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (src) imgs.push(String(src));
    });
    snapshot.images = imgs;

    const specs = normalizeSpecs($);
    snapshot.specs = Object.keys(specs).length ? specs : null;

    const lastSnapshot: Snapshot | null = watchRow.last_snapshot ?? null;
    const diff = computeDiff(lastSnapshot, snapshot);
    const hasChanges = Object.keys(diff).length > 0 && !(Object.keys(diff).length === 1 && diff._type === "initial_snapshot");
    const eventPayload = { diff, snapshot, url, fetched_at: snapshot.fetched_at };

    await supabaseAdmin.from("monitor_events").insert([{
      watch_id: watchId,
      tenant_id: watchRow.tenant_id ?? null,
      product_id: watchRow.product_id ?? null,
      event_type: hasChanges ? "change_detected" : "no_change",
      severity: hasChanges ? "info" : "info",
      payload: eventPayload,
    }]);

    await supabaseAdmin.from("monitor_watches").update({
      last_snapshot: snapshot,
      last_check_at: new Date().toISOString(),
      last_status: hasChanges ? "changed" : "ok",
    }).eq("id", watchId);

    return { ok: true, changed: hasChanges, diff, snapshot };
  } catch (err: any) {
    const e = String(err?.message ?? err);
    await supabaseAdmin.from("monitor_events").insert([{
      watch_id: watchId,
      tenant_id: watchRow.tenant_id ?? null,
      product_id: watchRow.product_id ?? null,
      event_type: "error",
      severity: "critical",
      payload: { error: e },
    }]);
    await supabaseAdmin.from("monitor_watches").update({ last_check_at: new Date().toISOString(), last_status: "error" }).eq("id", watchId);
    return { ok: false, error: e };
  }
}
