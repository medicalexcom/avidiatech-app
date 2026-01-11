/**
 * runWatchOnce with retry/backoff and improved request handling.
 *
 * Behavior:
 * - Tries up to maxAttempts to fetch a URL.
 * - Uses exponential backoff between attempts and updates next_check_at on failure.
 * - Adds more robust request headers (User-Agent, Accept).
 * - For final failure writes a monitor_event 'scrape_failed' and updates watch.last_error/retry_count/next_check_at.
 * - On success resets retry_count/last_error/next_check_at and continues normal diff logic.
 *
 * NOTE: For JS-heavy pages or persistent 403/429, consider a headless-browser fallback (Playwright/Puppeteer).
 */

import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";

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

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function parsePrice(text: string | undefined): number | null {
  if (!text) return null;
  const cleaned = String(text).replace(/[, ]+/g, "").match(/-?\d+(\.\d+)?/);
  if (!cleaned) return null;
  const n = Number(cleaned[0]);
  if (Number.isNaN(n)) return null;
  return n;
}

function normalizeSpecs($: CheerioAPI): Record<string, string> {
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

/**
 * runWatchOnce - resilient fetch with retries
 */
export async function runWatchOnce(watchId: string) {
  const { data: watchRow, error: watchErr } = await supabaseAdmin.from("monitor_watches").select("*").eq("id", watchId).limit(1).maybeSingle();
  if (watchErr) throw new Error(`failed to load watch ${watchErr.message ?? String(watchErr)}`);
  if (!watchRow) throw new Error("watch not found");

  const url = String(watchRow.source_url);
  let snapshot: Snapshot = { url, fetched_at: new Date().toISOString() };

  // Retry/backoff configuration
  const maxAttempts = 3;
  const baseDelayMs = 1000; // base backoff
  let attempt = 0;
  let lastError: string | null = null;
  let html: string | null = null;
  let success = false;

  const defaultHeaders = {
    // rotate / customize this header if you have a pool of values
    "User-Agent": "AvidiaMonitor/1.0 (+https://your.app)",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    // Add other headers if helpful (Referer etc.)
  };

  while (attempt < maxAttempts && !success) {
    attempt++;
    try {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const signal = controller ? controller.signal : undefined;
      // set a per-attempt timeout (fetch should be the global fetch in Node/Vercel)
      const timeoutMs = 15_000;
      if (controller) setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, { method: "GET", headers: defaultHeaders as any, signal } as any);
      // treat HTTP 2xx as success; 429/403 are retryable but require backoff
      if (res.ok) {
        html = await res.text();
        success = true;
        break;
      } else {
        // non-OK: capture status
        lastError = `HTTP ${res.status} ${res.statusText}`;
        // for 429/503/403 treat as retryable
        if ([429, 503, 403].includes(res.status)) {
          const wait = baseDelayMs * Math.pow(2, attempt - 1);
          await sleep(wait);
          continue;
        } else {
          // non-retryable HTTP error -> stop retry loop
          break;
        }
      }
    } catch (err: any) {
      // network or abort errors
      lastError = String(err?.message ?? err);
      const wait = baseDelayMs * Math.pow(2, attempt - 1);
      await sleep(wait);
      // continue to retry until attempts exhausted
    }
  }

  // If failed to fetch after retries -> write a failure event, update watch with next_check_at/backoff and return
  if (!success || !html) {
    const errorMsg = lastError ?? "unknown error";
    const nextBackoffSeconds = Math.min(60 * 60, Math.pow(2, Math.min(6, (watchRow.retry_count ?? 0))) * 60); // cap to 1h
    const nextCheck = new Date(Date.now() + nextBackoffSeconds * 1000).toISOString();

    await supabaseAdmin.from("monitor_events").insert([{
      watch_id: watchId,
      tenant_id: watchRow.tenant_id ?? null,
      product_id: watchRow.product_id ?? null,
      event_type: "scrape_failed",
      severity: "warning",
      payload: { error: errorMsg, attempts: attempt },
    }]);

    await supabaseAdmin.from("monitor_watches").update({
      retry_count: (watchRow.retry_count ?? 0) + 1,
      last_error: errorMsg,
      last_check_at: new Date().toISOString(),
      last_status: "scrape_failed",
      next_check_at: nextCheck,
    }).eq("id", watchId);

    return { ok: false, reason: "scrape_failed", error: errorMsg };
  }

  // success: parse html and continue
  try {
    const $ = cheerio.load(html) as CheerioAPI;
    snapshot.title = ($("meta[property='og:title']").attr("content") || $("title").text() || $("h1").first().text() || "").trim() || null;

    // price heuristics
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

    // update watch row: reset retry metadata on success
    await supabaseAdmin.from("monitor_watches").update({
      last_snapshot: snapshot,
      last_check_at: new Date().toISOString(),
      last_status: hasChanges ? "changed" : "ok",
      retry_count: 0,
      last_error: null,
      next_check_at: null,
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
    await supabaseAdmin.from("monitor_watches").update({ last_check_at: new Date().toISOString(), last_status: "error", last_error: e }).eq("id", watchId);
    return { ok: false, error: e };
  }
}
