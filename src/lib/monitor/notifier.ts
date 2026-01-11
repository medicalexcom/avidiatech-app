/**
 * Monitor notifier utilities
 *
 * - Evaluates simple rules and sends notifications:
 *   - creates app notification rows (monitor_notifications)
 *   - sends webhook POSTs (optionally signed)
 *   - sends email via SendGrid (if SENDGRID_API_KEY set)
 *
 * Environment:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (used by supabaseAdmin to write notifications)
 * - SENDGRID_API_KEY (optional, for email delivery)
 * - NOTIFICATION_FROM_EMAIL (optional)
 *
 * Usage:
 * - Call processPendingEvents() periodically (in notifierWorker) to handle new events.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY ?? null;
const NOTIFICATION_FROM_EMAIL = process.env.NOTIFICATION_FROM_EMAIL ?? "no-reply@your.app";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function signPayload(payload: string, secret?: string) {
  if (!secret) return null;
  const crypto = require("crypto");
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

async function sendWebhook(url: string, payload: any, secret?: string) {
  try {
    const body = JSON.stringify(payload);
    const headers: Record<string,string> = { "Content-Type": "application/json" };
    if (secret) {
      headers["x-monitor-signature"] = signPayload(body, secret) as string;
    }
    const res = await fetch(url, { method: "POST", body, headers });
    return { ok: res.ok, status: res.status, text: await res.text().catch(() => "") };
  } catch (err:any) {
    return { ok: false, error: String(err?.message ?? err) };
  }
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!SENDGRID_API_KEY) {
    return { ok: false, error: "No SENDGRID_API_KEY configured" };
  }
  const body = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: NOTIFICATION_FROM_EMAIL },
    subject,
    content: [{ type: "text/html", value: html }],
  };
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, text: await res.text().catch(() => "") };
}

/**
 * Evaluate a rule for an event payload (simple evaluator).
 * Condition example: { "price_pct_change": 5 } => send if absolute percent change >= 5
 */
function evaluateCondition(condition: any, eventPayload: any) {
  if (!condition || Object.keys(condition).length === 0) return true;
  // price pct change rule
  if (condition.price_pct_change !== undefined) {
    const pct = Number(condition.price_pct_change);
    const diff = eventPayload?.diff?.price;
    if (!diff || diff.from == null || diff.to == null) return false;
    const from = Number(diff.from);
    const to = Number(diff.to);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return false;
    const changePct = Math.abs(((to - from) / (from || 1)) * 100);
    return changePct >= pct;
  }
  // fallback: allow
  return true;
}

/**
 * Process a single monitor_event row and apply matching rules.
 * Marks the event.processed=true after handling (successful or not).
 */
export async function processEvent(eventRow: any) {
  if (!eventRow || eventRow.processed) return { ok: false, reason: "already_processed" };

  // 1) load matching rules for the tenant (and global rules where tenant_id is null)
  const { data: rules } = await supabaseAdmin
    .from("monitor_rules")
    .select("*")
    .or(`tenant_id.eq.${eventRow.tenant_id},tenant_id.is.null`)
    .eq("enabled", true)
    .in("event_type", [eventRow.event_type, "change_detected", "any"])
    .limit(200);

  // 2) For each rule evaluate and perform actions
  const actionsResults: any[] = [];
  for (const r of rules ?? []) {
    try {
      const ok = evaluateCondition(r.condition, eventRow.payload);
      if (!ok) continue;
      const action = r.action ?? {};
      if (action.type === "webhook" && action.url) {
        // optional lookup secret from monitor_webhooks if action.webhook_id provided
        let secret: string | undefined = undefined;
        if (action.webhook_id) {
          const { data: wh } = await supabaseAdmin.from("monitor_webhooks").select("*").eq("id", action.webhook_id).limit(1).maybeSingle();
          secret = wh?.secret;
        }
        const res = await sendWebhook(action.url, { rule: r, event: eventRow }, secret);
        actionsResults.push({ rule: r.id, action: "webhook", res });
      } else if (action.type === "email" && action.to) {
        const subject = action.subject ?? `Monitor alert: ${eventRow.event_type}`;
        const html = `<pre>${JSON.stringify(eventRow.payload, null, 2)}</pre>`;
        const res = await sendEmail(action.to, subject, html);
        actionsResults.push({ rule: r.id, action: "email", res });
      } else if (action.type === "app_notification") {
        // create an app notification
        const title = action.title ?? `Monitor: ${eventRow.event_type}`;
        const body = action.body ?? JSON.stringify(eventRow.payload).slice(0, 1000);
        await supabaseAdmin.from("monitor_notifications").insert([{
          tenant_id: eventRow.tenant_id ?? null,
          watch_id: eventRow.watch_id ?? null,
          event_id: eventRow.id,
          title, body, payload: eventRow.payload
        }]);
        actionsResults.push({ rule: r.id, action: "app_notification", res: { ok: true } });
      } else {
        // unknown action: ignore
        actionsResults.push({ rule: r.id, action: "noop", res: { ok: false, reason: "unknown_action" } });
      }
    } catch (err:any) {
      actionsResults.push({ rule: r.id, error: String(err?.message ?? err) });
    }
  }

  // If no rules matched and default behavior is to create an app notification for change_detected:
  if ((rules?.length ?? 0) === 0 && eventRow.event_type === "change_detected") {
    await supabaseAdmin.from("monitor_notifications").insert([{
      tenant_id: eventRow.tenant_id ?? null,
      watch_id: eventRow.watch_id ?? null,
      event_id: eventRow.id,
      title: `Change detected`,
      body: JSON.stringify(eventRow.payload).slice(0, 1000),
      payload: eventRow.payload
    }]);
    actionsResults.push({ default_app_notification: true });
  }

  // mark event processed (so we don't re-process)
  await supabaseAdmin.from("monitor_events").update({ processed: true }).eq("id", eventRow.id);

  return { ok: true, actions: actionsResults };
}

/**
 * Poll for pending events and process them in small batches.
 */
export async function processPendingEvents(limit = 50) {
  const { data: events, error } = await supabaseAdmin
    .from("monitor_events")
    .select("*")
    .eq("processed", false)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("processPendingEvents: failed to query events", error);
    return { ok: false, error };
  }
  const out: any[] = [];
  for (const ev of events ?? []) {
    try {
      const r = await processEvent(ev);
      out.push({ id: ev.id, result: r });
    } catch (err:any) {
      console.error("processPendingEvents: error processing event", err);
    }
  }
  return { ok: true, processed: out.length, results: out };
}
