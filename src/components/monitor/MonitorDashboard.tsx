"use client";

import React, { useEffect, useState } from "react";

/**
 * MonitorDashboard (frequency control + compact watch list)
 *
 * - Preset dropdown shows numeric values only (1,7,14,30) — no duplicated 'd' suffix.
 * - If "Custom..." selected a small numeric input appears (days).
 * - Shows up to WATCHES_PER_VIEW watches and EVENTS_PER_VIEW events.
 * - Watches + Recent events are wrapped in a vertical scroll container so the panel
 *   remains compact (scrolls both lists together). Default shows 10 watches + 10 events.
 * - Includes a "View all" link suggestion for a dedicated, full list page.
 *
 * No additional files required.
 */

const WATCHES_PER_VIEW = 10;
const EVENTS_PER_VIEW = 10;

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** FrequencyControl: preset dropdown + optional custom days input */
type FrequencyControlProps = {
  days: number;
  onChange: (days: number) => void;
  ariaLabel?: string;
  className?: string;
};

function FrequencyControl({
  days,
  onChange,
  ariaLabel,
  className,
}: FrequencyControlProps) {
  const presets = [1, 7, 14, 30];
  const normalized = Math.max(1, Math.round(days || 14));
  const [selected, setSelected] = useState<string>(
    presets.includes(normalized) ? String(normalized) : "custom"
  );
  const [customValue, setCustomValue] = useState<number>(normalized);

  useEffect(() => {
    const p = presets.includes(Math.max(1, Math.round(days || 14)));
    setSelected(p ? String(Math.round(days || 14)) : "custom");
    setCustomValue(Math.max(1, Math.round(days || 14)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  return (
    <div className={className ?? "flex items-center gap-2"}>
      <select
        aria-label={ariaLabel ?? "frequency-presets"}
        value={selected}
        onChange={(e) => {
          const v = e.target.value;
          setSelected(v);
          if (v === "custom") return;
          const n = Number(v);
          setCustomValue(n);
          onChange(n);
        }}
        className="h-8 rounded-full border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
      >
        {presets.map((p) => (
          <option key={p} value={String(p)}>
            {String(p)}
          </option>
        ))}
        <option value="custom">Custom…</option>
      </select>

      {selected === "custom" ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            step={1}
            value={customValue}
            onChange={(e) => setCustomValue(Number(e.target.value))}
            className="h-8 w-20 rounded-full border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            title="Custom days between checks"
          />
          <span className="text-xs text-slate-500">days</span>
          <button
            onClick={() => onChange(Math.max(1, Math.round(customValue)))}
            className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold shadow-sm hover:bg-slate-50"
            title="Apply custom frequency (days)"
          >
            Apply
          </button>
        </div>
      ) : (
        <div className="text-xs text-slate-500">days</div>
      )}
    </div>
  );
}

/** Helper conversions */
function daysToSeconds(days: number) {
  return Math.max(1, Math.round(days * 24 * 60 * 60));
}
function secondsToDays(sec: number | null | undefined) {
  if (!sec || typeof sec !== "number") return null;
  return Math.max(1, Math.round(sec / (24 * 60 * 60)));
}

function safeHost(url?: string | null) {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/** Compact status badge */
function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "unknown").toLowerCase();
  const map: Record<string, string> = {
    ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
    changed: "border-amber-200 bg-amber-50 text-amber-700",
    scrape_failed: "border-red-200 bg-red-50 text-red-700",
    error: "border-red-200 bg-red-50 text-red-700",
    unknown: "border-slate-200 bg-slate-50 text-slate-700",
  };
  const cls = map[s] ?? map.unknown;
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize",
        cls
      )}
      title={s}
    >
      {s.replace("_", " ")}
    </span>
  );
}

function Dot({ tone }: { tone: "ok" | "warn" | "bad" | "neutral" }) {
  const cls =
    tone === "ok"
      ? "bg-emerald-500"
      : tone === "warn"
      ? "bg-amber-500"
      : tone === "bad"
      ? "bg-red-500"
      : "bg-slate-400";
  return <span className={cx("inline-block h-2 w-2 rounded-full", cls)} />;
}

const btn =
  "h-8 rounded-full px-3 text-xs font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-slate-200";
const btnGhost =
  "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900";
const btnSave =
  "bg-amber-500 text-white hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed";

/** Compact Watch card (no extra frames, no tips, no wasted height) */
function WatchRow({
  watch,
  onSaveFreq,
  onTriggerCheck,
  onUpdate,
}: {
  watch: any;
  onSaveFreq: (id: string, days: number) => Promise<void>;
  onTriggerCheck: (id: string) => Promise<void>;
  onUpdate: (id: string, patch: any) => Promise<void>;
}) {
  const freqDays = secondsToDays(watch?.frequency_seconds) ?? 14;
  const [localDays, setLocalDays] = useState<number>(freqDays);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalDays(freqDays);
  }, [freqDays]);

  const status = String(watch?.last_status ?? "unknown").toLowerCase();
  const tone: "ok" | "warn" | "bad" | "neutral" =
    status === "ok"
      ? "ok"
      : status === "changed"
      ? "warn"
      : status.includes("error") || status.includes("fail")
      ? "bad"
      : "neutral";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      {/* Header row: URL + status + last check */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Dot tone={tone} />
            <div className="truncate text-sm font-semibold text-slate-900">
              {watch.source_url}
            </div>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <StatusBadge status={watch.last_status} />
            <span className="text-slate-300">·</span>
            <span className="whitespace-nowrap">
              {watch.last_check_at
                ? new Date(watch.last_check_at).toLocaleString()
                : "never"}
            </span>
            {watch.muted_until ? (
              <>
                <span className="text-slate-300">·</span>
                <span className="whitespace-nowrap text-slate-400">muted</span>
              </>
            ) : null}
          </div>
        </div>

        {/* Buttons row (always visible, never overlaps) */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            onClick={() => onTriggerCheck(watch.id)}
            className={cx(btn, btnGhost)}
            title="Run a check now"
          >
            Check
          </button>

          <button
            onClick={async () => {
              setSaving(true);
              try {
                await onSaveFreq(watch.id, localDays);
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
            className={cx(btn, btnSave)}
            title="Save frequency"
          >
            {saving ? "Saving…" : "Save"}
          </button>

          <button
            onClick={() =>
              onUpdate(watch.id, {
                muted_until: watch.muted_until
                  ? null
                  : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              })
            }
            className={cx(btn, btnGhost)}
            title={watch.muted_until ? "Unmute" : "Mute 24h"}
          >
            {watch.muted_until ? "Unmute" : "Mute"}
          </button>
        </div>
      </div>

      {/* Controls row: tight, aligned, wraps safely */}
      <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-600">Frequency</span>
            <FrequencyControl
              days={localDays}
              onChange={(d) => setLocalDays(d)}
              ariaLabel={`Frequency for ${watch.source_url}`}
            />
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">Price Δ %</span>
            <input
              type="number"
              defaultValue={watch.price_threshold_percent ?? ""}
              onBlur={(e) =>
                onUpdate(watch.id, {
                  price_threshold_percent: e.currentTarget.value
                    ? Number(e.currentTarget.value)
                    : null,
                })
              }
              className="h-8 w-24 rounded-full border border-slate-200 bg-white px-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Main component */
export default function MonitorDashboard() {
  const [watches, setWatches] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newFrequencyDays, setNewFrequencyDays] = useState<number>(14);

  async function loadWatches() {
    setLoading(true);
    try {
      const res = await fetch("/api/monitor/watches");
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) setWatches(j.watches ?? []);
      else setWatches([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadEvents(watchId?: string | null) {
    setLoading(true);
    try {
      const url = watchId
        ? `/api/monitor/events?watchId=${encodeURIComponent(watchId)}`
        : `/api/monitor/events`;
      const res = await fetch(url);
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) setEvents(j.events ?? []);
      else setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWatches();
    loadEvents();
    const t = setInterval(() => {
      loadWatches();
      loadEvents();
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  async function createWatch() {
    if (!newUrl) {
      alert("Enter a URL to watch");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        source_url: newUrl,
        frequency_seconds: daysToSeconds(newFrequencyDays),
      };
      const res = await fetch("/api/monitor/watches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        alert("Failed to create watch: " + (j?.error ?? res.statusText));
      } else {
        setNewUrl("");
        await loadWatches();
      }
    } finally {
      setLoading(false);
    }
  }

  async function saveFreq(id: string, days: number) {
    const patch = { frequency_seconds: daysToSeconds(days) };
    const res = await fetch(`/api/monitor/watches/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok) {
      alert("Save frequency failed: " + (j?.error ?? res.statusText));
    } else {
      await loadWatches();
    }
  }

  async function updateWatch(id: string, patch: any) {
    try {
      const res = await fetch(`/api/monitor/watches/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        alert("Update failed: " + (j?.error ?? res.statusText));
      } else {
        await loadWatches();
      }
    } catch (err: any) {
      alert(String(err?.message ?? err));
    }
  }

  async function triggerCheck(watchId: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/monitor/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ watchId }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        alert("Check failed: " + (j?.error ?? res.statusText));
      } else {
        alert("Check result: " + (j?.result?.changed ? "changed" : "no_change"));
        await loadWatches();
        await loadEvents(watchId);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4" id="add-watch">
      {/* Create watch row (kept simple as you had it) */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          className="border rounded px-3 py-2 flex-1"
          placeholder="https://example.com/product/..."
          aria-label="New watch URL"
        />

        <div className="flex items-center gap-2">
          <FrequencyControl
            days={newFrequencyDays}
            onChange={(d) => setNewFrequencyDays(d)}
            ariaLabel="New watch frequency (days)"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={createWatch}
            className="px-3 py-2 rounded bg-amber-500 text-white shadow"
          >
            Add Watch
          </button>
          <button
            onClick={() => {
              loadWatches();
              loadEvents();
            }}
            className="px-3 py-2 rounded border"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Scrollable area containing Watches + Recent events */}
      <div
        style={{ maxHeight: "64vh", overflowY: "auto" }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <div className="col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold">Watches</h4>
            <div className="text-xs text-slate-500">
              {watches.length ? `${watches.length} total` : ""}
            </div>
          </div>

          <div className="mt-2 space-y-3">
            {loading && !watches.length ? (
              <div className="text-sm text-slate-500">Loading…</div>
            ) : watches.length === 0 ? (
              <div className="text-sm text-slate-500">No watches configured yet</div>
            ) : (
              watches
                .slice(0, WATCHES_PER_VIEW)
                .map((w) => (
                  <WatchRow
                    key={w.id}
                    watch={w}
                    onSaveFreq={saveFreq}
                    onTriggerCheck={triggerCheck}
                    onUpdate={updateWatch}
                  />
                ))
            )}
          </div>

          {watches.length > WATCHES_PER_VIEW ? (
            <div className="mt-3 text-xs text-slate-500">
              Showing {WATCHES_PER_VIEW} of {watches.length} watches.{" "}
              <a className="underline" href="/dashboard/monitor/all">
                View all
              </a>
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold">Recent events</h4>
            <div className="text-xs text-slate-500">
              {events.length ? `${events.length} total` : ""}
            </div>
          </div>

          {/* Compact events with LINK INFO as the main content */}
          <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {loading && !events.length ? (
              <div className="p-3 text-sm text-slate-500">Loading…</div>
            ) : events.length === 0 ? (
              <div className="p-3 text-sm text-slate-500">No events</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {events.slice(0, EVENTS_PER_VIEW).map((ev) => {
                  const url = ev.payload?.snapshot?.url ?? null;
                  const title = ev.payload?.snapshot?.title ?? url ?? "Event";
                  const host = safeHost(url);

                  const et = String(ev.event_type ?? "").toLowerCase();
                  const tone: "ok" | "warn" | "bad" | "neutral" =
                    et.includes("change") || et.includes("changed")
                      ? "warn"
                      : et.includes("fail") || et.includes("error")
                      ? "bad"
                      : "neutral";

                  return (
                    <div key={ev.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Dot tone={tone} />
                            <div className="truncate text-xs font-semibold text-slate-700">
                              {ev.event_type}
                            </div>
                            {host ? (
                              <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                                {host}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-1 truncate text-sm font-medium text-slate-900">
                            {title}
                          </div>

                          {/* URL line (the “link info” you asked for) */}
                          {url ? (
                            <div className="mt-1 truncate text-xs text-slate-500">
                              {url}
                            </div>
                          ) : null}
                        </div>

                        {/* timestamp: present but secondary */}
                        <div className="shrink-0 text-[11px] text-slate-400 whitespace-nowrap">
                          {new Date(ev.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {events.length > EVENTS_PER_VIEW ? (
            <div className="mt-3 text-xs text-slate-500">
              Showing {EVENTS_PER_VIEW} of {events.length} events.{" "}
              <a className="underline" href="/dashboard/monitor/events">
                View all
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
