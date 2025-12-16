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

function TinyChip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "signal";
}) {
  const tones =
    tone === "signal"
      ? "border-amber-200/60 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100"
      : tone === "success"
      ? "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100"
      : "border-slate-200/70 bg-white/70 text-slate-600 dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-300";

  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium shadow-sm backdrop-blur",
        tones
      )}
    >
      {children}
    </span>
  );
}

const inputBase =
  "w-full rounded-full border border-slate-200/80 bg-white/70 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200/60 dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-50 dark:focus:border-slate-700 dark:focus:bg-slate-950/55 dark:focus:ring-slate-700/60";

const miniInputBase =
  "rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5 text-xs text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200/60 dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-50 dark:focus:border-slate-700 dark:focus:bg-slate-950/55 dark:focus:ring-slate-700/60";

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition active:translate-y-[0.5px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950";

const btnSecondary = cx(
  btnBase,
  "border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm hover:bg-white hover:text-slate-900 dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-200 dark:hover:bg-slate-950/60 dark:hover:text-slate-50 focus-visible:ring-slate-300/70 dark:focus-visible:ring-slate-700/70"
);

const btnPrimary = cx(
  btnBase,
  "text-slate-950 shadow-[0_16px_34px_-22px_rgba(2,6,23,0.55)]",
  "bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:via-amber-500 hover:to-orange-400",
  "focus-visible:ring-amber-400/70"
);

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
        className={cx(
          "h-9 rounded-full border border-slate-200/80 bg-white/70 px-3 text-sm text-slate-900 shadow-sm outline-none transition",
          "focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200/60",
          "dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-50 dark:focus:border-slate-700 dark:focus:bg-slate-950/55 dark:focus:ring-slate-700/60"
        )}
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
            className={cx(miniInputBase, "h-9 w-24 px-3 text-sm")}
            title="Custom days between checks"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">days</span>
          <button
            onClick={() => onChange(Math.max(1, Math.round(customValue)))}
            className={btnSecondary}
            title="Apply custom frequency (days)"
          >
            Apply
          </button>
        </div>
      ) : (
        <div className="text-xs text-slate-500 dark:text-slate-400">days</div>
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

/** Compact status badge */
function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "unknown").toLowerCase();
  const map: Record<string, string> = {
    ok: "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-100",
    changed: "border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-100",
    scrape_failed: "border-red-200/70 bg-red-50 text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-100",
    error: "border-red-200/70 bg-red-50 text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-100",
    unknown:
      "border-slate-200/70 bg-slate-50 text-slate-700 dark:border-slate-700/60 dark:bg-slate-500/10 dark:text-slate-200",
  };
  const cls = map[s] ?? map.unknown;

  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize tracking-wide",
        cls
      )}
    >
      {s.replace("_", " ")}
    </span>
  );
}

/** Child component for a single watch row (hooks allowed here) */
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

  return (
    <div
      className={cx(
        "group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur",
        "dark:border-slate-800/60 dark:bg-slate-950/35"
      )}
    >
      {/* subtle accent line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-sky-400/35 via-emerald-400/25 to-amber-400/35" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                {watch.source_url}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="whitespace-nowrap">
                  {watch.last_check_at
                    ? new Date(watch.last_check_at).toLocaleString()
                    : "never"}
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <StatusBadge status={watch.last_status} />
                {watch.muted_until ? (
                  <span className="whitespace-nowrap text-slate-400 dark:text-slate-500">
                    · muted
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Frequency
                </div>
                <FrequencyControl
                  days={localDays}
                  onChange={(d) => setLocalDays(d)}
                  ariaLabel={`Frequency for ${watch.source_url}`}
                  className="items-center"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Price Δ %
                </div>
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
                  className={cx(miniInputBase, "w-28")}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
          <button
            onClick={() => onTriggerCheck(watch.id)}
            className={btnSecondary}
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
            className={cx(
              btnPrimary,
              saving && "opacity-80 cursor-not-allowed"
            )}
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
            className={btnSecondary}
            title={watch.muted_until ? "Unmute" : "Mute 24h"}
          >
            {watch.muted_until ? "Unmute" : "Mute"}
          </button>
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
  const [newFrequencyDays, setNewFrequencyDays] = useState<number>(14); // default 14 days

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
    <div className="space-y-5" id="add-watch">
      {/* Create watch row */}
      <div
        className={cx(
          "rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur",
          "dark:border-slate-800/60 dark:bg-slate-950/35"
        )}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <TinyChip tone="signal">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Create watch
              </TinyChip>
              {loading ? (
                <TinyChip>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
                  Working…
                </TinyChip>
              ) : null}
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              Add a URL, set frequency, and start tracking changes.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                loadWatches();
                loadEvents();
              }}
              className={btnSecondary}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className={inputBase}
              placeholder="https://example.com/product/..."
              aria-label="New watch URL"
            />
          </div>

          <div className="lg:col-span-3">
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200/70 bg-white/60 px-3 py-2 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/30">
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Frequency
              </div>
              <FrequencyControl
                days={newFrequencyDays}
                onChange={(d) => setNewFrequencyDays(d)}
                ariaLabel="New watch frequency (days)"
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <button onClick={createWatch} className={cx(btnPrimary, "w-full py-2")}>
              Add Watch
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable area containing Watches + Recent events */}
      <div
        style={{ maxHeight: "64vh", overflowY: "auto" }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <div className="sm:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Watches
              </h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Manage frequency, thresholds, and run checks on demand.
              </p>
            </div>
            <TinyChip tone="success">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {watches.length} total
            </TinyChip>
          </div>

          <div className="mt-3 space-y-3">
            {loading && !watches.length ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">Loading…</div>
            ) : watches.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                No watches configured yet
              </div>
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
            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Showing {WATCHES_PER_VIEW} of {watches.length} watches.{" "}
              <a className="underline underline-offset-2" href="/dashboard/monitor/all">
                View all
              </a>
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Recent events
              </h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Latest signals from your watch checks.
              </p>
            </div>
            <TinyChip>
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              {events.length} total
            </TinyChip>
          </div>

          <div className="mt-3 space-y-2">
            {loading && !events.length ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">Loading…</div>
            ) : events.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">No events</div>
            ) : (
              events.slice(0, EVENTS_PER_VIEW).map((ev) => (
                <div
                  key={ev.id}
                  className={cx(
                    "rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-sm backdrop-blur",
                    "dark:border-slate-800/60 dark:bg-slate-950/35"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      {ev.event_type}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">
                      {new Date(ev.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {ev.payload?.snapshot?.title ?? ev.payload?.snapshot?.url}
                  </div>
                </div>
              ))
            )}
          </div>

          {events.length > EVENTS_PER_VIEW ? (
            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Showing {EVENTS_PER_VIEW} of {events.length} events.{" "}
              <a className="underline underline-offset-2" href="/dashboard/monitor/events">
                View all
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
