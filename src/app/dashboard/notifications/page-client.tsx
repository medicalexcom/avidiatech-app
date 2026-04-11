"use client";

import React, { useCallback, useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";

type Channel = "email" | "in_app" | "webhook";
type Severity = "critical" | "warning" | "info";
type DeliveryMode = "instant" | "digest_hourly" | "digest_daily";

type NotificationRule = {
  id: string;
  label: string;
  description: string;
  category: string;
  severity: Severity;
  channels: Record<Channel, boolean>;
  delivery: DeliveryMode;
};

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  severity: Severity;
  category: string;
  ts: string;
  read: boolean;
};

const INITIAL_RULES: NotificationRule[] = [
  {
    id: "quota_warning",
    label: "Quota approaching limit",
    description: "Alert when monthly ingestion quota is ≥80% used",
    category: "Quota",
    severity: "warning",
    channels: { email: true, in_app: true, webhook: false },
    delivery: "instant",
  },
  {
    id: "quota_exceeded",
    label: "Quota exceeded",
    description: "Alert when monthly quota is fully consumed and jobs are being blocked",
    category: "Quota",
    severity: "critical",
    channels: { email: true, in_app: true, webhook: false },
    delivery: "instant",
  },
  {
    id: "ingest_failed",
    label: "Ingestion failure",
    description: "A product URL failed to ingest after all retries",
    category: "Ingestion",
    severity: "critical",
    channels: { email: true, in_app: true, webhook: false },
    delivery: "instant",
  },
  {
    id: "ingest_batch_done",
    label: "Batch ingestion complete",
    description: "A bulk ingestion job finished (success or partial failure)",
    category: "Ingestion",
    severity: "info",
    channels: { email: false, in_app: true, webhook: false },
    delivery: "digest_hourly",
  },
  {
    id: "monitor_price_change",
    label: "Price change detected",
    description: "Monitor detected a price change on a watched product",
    category: "Monitor",
    severity: "warning",
    channels: { email: true, in_app: true, webhook: false },
    delivery: "instant",
  },
  {
    id: "monitor_spec_change",
    label: "Spec / description change",
    description: "Product specs or description changed since last check",
    category: "Monitor",
    severity: "info",
    channels: { email: false, in_app: true, webhook: false },
    delivery: "digest_daily",
  },
  {
    id: "audit_blocker",
    label: "Audit blocker found",
    description: "An audit run found critical issues that block publishing",
    category: "Audit",
    severity: "critical",
    channels: { email: true, in_app: true, webhook: false },
    delivery: "instant",
  },
  {
    id: "audit_warnings",
    label: "Audit warnings",
    description: "Audit flagged non-critical issues (missing images, short descriptions, etc.)",
    category: "Audit",
    severity: "warning",
    channels: { email: false, in_app: true, webhook: false },
    delivery: "digest_daily",
  },
  {
    id: "export_ready",
    label: "Export ready",
    description: "A product export or import sync job finished and is ready to review",
    category: "Import",
    severity: "info",
    channels: { email: false, in_app: true, webhook: false },
    delivery: "digest_hourly",
  },
  {
    id: "pipeline_failed",
    label: "Pipeline run failed",
    description: "A full pipeline run (any module) ended in a failed state",
    category: "Pipeline",
    severity: "critical",
    channels: { email: true, in_app: true, webhook: false },
    delivery: "instant",
  },
];

/* Notifications are fetched from /api/monitor/notifications on mount */

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-500/30 dark:text-rose-300",
  warning: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-500/30 dark:text-amber-300",
  info: "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/40 dark:border-sky-500/30 dark:text-sky-300",
};

const SEVERITY_DOT: Record<Severity, string> = {
  critical: "bg-rose-500",
  warning: "bg-amber-400",
  info: "bg-sky-500",
};

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 ${
        on ? "bg-violet-500 dark:bg-violet-400" : "bg-slate-300 dark:bg-slate-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${on ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  );
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function NotificationsPage() {
  const [rules, setRules] = useState<NotificationRule[]>(INITIAL_RULES);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"feed" | "settings">("feed");
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/monitor/notifications?limit=50")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.notifications)) {
          setNotifications(
            data.notifications.map((n: any) => ({
              id: n.id,
              title: n.title ?? n.event_type ?? "Notification",
              body: n.body ?? n.message ?? "",
              severity: (n.severity as Severity) ?? "info",
              category: n.category ?? n.event_type ?? "System",
              ts: n.created_at ?? n.ts ?? new Date().toISOString(),
              read: n.read ?? false,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  function toggleChannel(ruleId: string, channel: Channel) {
    setRules((prev) => prev.map((r) => r.id === ruleId
      ? { ...r, channels: { ...r.channels, [channel]: !r.channels[channel] } }
      : r
    ));
  }

  function setDelivery(ruleId: string, mode: DeliveryMode) {
    setRules((prev) => prev.map((r) => r.id === ruleId ? { ...r, delivery: mode } : r));
  }

  async function saveSettings() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 900));
    setSaving(false);
    showToast("Notification preferences saved");
  }

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    fetch("/api/monitor/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read: true }),
    }).catch(() => {});
  }

  function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    unreadIds.forEach((id) =>
      fetch("/api/monitor/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, read: true }),
      }).catch(() => {})
    );
    showToast("All notifications marked as read");
  }

  const unread = notifications.filter((n) => !n.read).length;

  const categories = [...new Set(rules.map((r) => r.category))];

  return (
    <PageShell glow="amber" noPad>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 shadow-lg dark:border-emerald-500/30 dark:bg-emerald-950/80 dark:text-emerald-200">
          {toast}
        </div>
      )}

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Workspace · Notifications
            </p>
            <h1 className="text-xl font-semibold sm:text-2xl">Notification Center</h1>
            <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
              Configure which pipeline events trigger alerts and how they reach you.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Email &amp; in-app active
            </span>
            {unread > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300">
                {unread} unread
              </span>
            )}
          </div>
        </header>

        {/* Stats strip */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Delivery channels", value: "Email · In-app", sub: "Webhook available in settings" },
            { label: "Active rules", value: rules.filter((r) => Object.values(r.channels).some(Boolean)).length, sub: `of ${rules.length} configured` },
            { label: "Unread alerts", value: unread, sub: `${notifications.length} total` },
            { label: "Critical rules", value: rules.filter((r) => r.severity === "critical").length, sub: "always instant delivery" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.label}</p>
              <p className="mt-1 text-xl font-semibold text-slate-800 dark:text-slate-100">{s.value}</p>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{s.sub}</p>
            </div>
          ))}
        </section>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 w-fit dark:border-slate-800 dark:bg-slate-900/60">
          {(["feed", "settings"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {tab === "feed" ? "Alert Feed" : "Settings"}
              {tab === "feed" && unread > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-bold h-4 w-4">
                  {unread}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Feed tab */}
        {activeTab === "feed" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Recent alerts</p>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="space-y-2">
              {loading && (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-violet-500" />
                  <p className="mt-3 text-sm text-slate-500">Loading notifications…</p>
                </div>
              )}
              {!loading && notifications.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-3xl">🔔</p>
                  <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">No notifications yet</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Pipeline events, monitor alerts, and quota warnings will appear here as they happen.
                  </p>
                </div>
              )}
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-colors ${
                    n.read
                      ? "border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-900/50"
                      : "border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
                  }`}
                >
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${n.read ? "bg-slate-300 dark:bg-slate-700" : SEVERITY_DOT[n.severity]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-sm font-medium ${n.read ? "text-slate-600 dark:text-slate-400" : "text-slate-800 dark:text-slate-100"}`}>
                        {n.title}
                      </p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${SEVERITY_STYLES[n.severity]}`}>
                        {n.severity}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {n.category}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{n.body}</p>
                    <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-600">{fmtDate(n.ts)}</p>
                  </div>
                  {!n.read && (
                    <span className="shrink-0 rounded-full bg-violet-500 text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center">
                      •
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings tab */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            {categories.map((cat) => (
              <div key={cat} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {/* Category header */}
                <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{cat}</p>
                </div>

                {/* Rules */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {rules.filter((r) => r.category === cat).map((rule) => (
                    <div key={rule.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{rule.label}</p>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${SEVERITY_STYLES[rule.severity]}`}>
                              {rule.severity}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{rule.description}</p>
                        </div>

                        {/* Channels */}
                        <div className="flex flex-wrap items-center gap-4 shrink-0">
                          {(["email", "in_app", "webhook"] as Channel[]).map((ch) => (
                            <label key={ch} className="flex items-center gap-1.5 cursor-pointer">
                              <Toggle
                                on={rule.channels[ch]}
                                onChange={() => toggleChannel(rule.id, ch)}
                              />
                              <span className="text-xs text-slate-600 dark:text-slate-300 capitalize">{ch === "in_app" ? "In-app" : ch === "webhook" ? "Webhook" : "Email"}</span>
                            </label>
                          ))}

                          {/* Delivery mode */}
                          <select
                            value={rule.delivery}
                            onChange={(e) => setDelivery(rule.id, e.target.value as DeliveryMode)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                          >
                            <option value="instant">Instant</option>
                            <option value="digest_hourly">Hourly digest</option>
                            <option value="digest_daily">Daily digest</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Save */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-500 disabled:opacity-60"
              >
                {saving && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
                {saving ? "Saving…" : "Save preferences"}
              </button>
              <p className="text-xs text-slate-400 dark:text-slate-600">Changes take effect immediately for all users in this workspace</p>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
