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

function FrequencyControl({ days, onChange, ariaLabel, className }: FrequencyControlProps) {
  const presets = [1, 7, 14, 30];
  const normalized = Math.max(1, Math.round(days || 14));
  const [selected, setSelected] = useState<string>(presets.includes(normalized) ? String(normalized) : "custom");
  const [customValue, setCustomValue] = useState<number>(normalized);

  useEffect(() => {
    const p = presets.includes(Math.max(1, Math.round(days || 14)));
    setSelected(p ? String(Math.round(days || 14)) : "custom");
    setCustomValue(Math.max(1, Math.round(days || 14)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  return (
    <div className={className ?? "flex flex-wrap items-center gap-2"}>
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
          "h-9 rounded-full border border-slate-200 bg-white px-3 text-sm shadow-sm",
          "focus:outline-none focus:ring-2 focus:ring-slate-200"
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
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={1}
            step={1}
            value={customValue}
            onChange={(e) => setCustomValue(Number(e.target.value))}
            className="h-9 w-24 rounded-full border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            title="Custom days between checks"
          />
          <span className="text-xs text-slate-500">days</span>
          <button
            onClick={() => onChange(Math.max(1, Math.round(customValue)))}
            className="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold shadow-sm hover:bg-slate-50"
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
    <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize", cls)}>
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

function PrimaryButton({
  children,
  onClick,
  disabled,
  title,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx(
        "h-9 rounded-full px-3 text-xs font-semibold text-white shadow-sm",
        "bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500",
        "hover:from-indigo-400 hover:via-fuchsia-400 hover:to-rose-400",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
  title,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cx(
        "h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm",
        "hover:bg-slate-50 hover:text-slate-900",
        className
      )}
    >
      {children}
    </button>
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

  const status = String(watch?.last_status ?? "unknown").toLowerCase();
  const tone: "ok" | "warn" | "bad" | "neutral" =
    status === "ok" ? "ok" : status === "changed" ? "warn" : status.includes("error") || status.includes("fail") ? "bad" : "neutral";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* left signal rail */}
      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-indigo-500 via-fuchsia-500 to-rose-500" />

      <div className="p-4 pl-5">
        {/* TOP ROW: url + status/time */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Dot tone={tone} />
              <div className="truncate text-sm font-semibold text-slate-900">{watch.source_url}</div>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="whitespace-nowrap">
                {watch.last_check_at ? new Date(watch.last_check_at).toLocaleString() : "never"}
              </span>
              <span className="text-slate-300">·</span>
              <StatusBadge status={watch.last_status} />
              {watch.muted_until ? <span className="whitespace-nowrap text-slate-400">· muted</span> : null}
            </div>
          </div>

          {/* compact actions for medium+ to avoid crowding */}
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <GhostButton onClick={() => onTriggerCheck(watch.id)} title="Run a check now">
              Check
            </GhostButton>

            <PrimaryButton
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onSaveFreq(watch.id, localDays);
                } finally {
                  setSaving(false);
                }
              }}
              title="Save frequency"
            >
              {saving ? "Saving…" : "Save"}
            </PrimaryButton>

            <GhostButton
              onClick={() =>
                onUpdate(watch.id, {
                  muted_until: watch.muted_until ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                })
              }
              title={watch.muted_until ? "Unmute" : "Mute 24h"}
            >
              {watch.muted_until ? "Unmute" : "Mute"}
            </GhostButton>
          </div>
        </div>

        {/* BODY: dense, no overlap */}
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-center">
          {/* Frequency block */}
          <div className="lg:col-span-7">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Frequency</div>
                <FrequencyControl
                  days={localDays}
                  onChange={(d) => setLocalDays(d)}
                  ariaLabel={`Frequency for ${watch.source_url}`}
                  className="flex flex-wrap items-center gap-2"
                />
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                Tip: use longer intervals for rate-limited vendors.
              </div>
            </div>
          </div>

          {/* Threshold block */}
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Price Δ %</div>
                  <div className="mt-1 text-[11px] text-slate-500">Alert/flag only above this change.</div>
                </div>

                <input
                  type="number"
                  defaultValue={watch.price_threshold_percent ?? ""}
                  onBlur={(e) =>
                    onUpdate(watch.id, {
                      price_threshold_percent: e.currentTarget.value ? Number(e.currentTarget.value) : null,
                    })
                  }
                  className="h-9 w-28 rounded-full border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile safety row: ensures buttons never hide anything */}
        <div className="mt-3 grid grid-cols-3 gap-2 sm:hidden">
          <GhostButton onClick={() => onTriggerCheck(watch.id)} title="Run a check now" className="w-full">
            Check
          </GhostButton>
          <PrimaryButton
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSaveFreq(watch.id, localDays);
              } finally {
                setSaving(false);
              }
            }}
            title="Save frequency"
            className="w-full"
          >
            {saving ? "Saving…" : "Save"}
          </PrimaryButton>
          <GhostButton
            onClick={() =>
              onUpdate(watch.id, {
                muted_until: watch.muted_until ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              })
            }
            title={watch.muted_until ? "Unmute" : "Mute 24h"}
            className="w-full"
          >
            {watch.muted_until ? "Unmute" : "Mute"}
          </GhostButton>
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
      const url = watchId ? `/api/monitor/events?watchId=${encodeURIComponent(watchId)}` : `/api/monitor/events`;
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
    <div className="space-y-4">
      {/* Create watch row (kept simple) */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          className="border rounded px-3 py-2 flex-1"
          placeholder="https://example.com/product/..."
          aria-label="New watch URL"
        />

        <div className="flex items-center gap-2">
          <FrequencyControl days={newFrequencyDays} onChange={(d) => setNewFrequencyDays(d)} ariaLabel="New watch frequency (days)" />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={createWatch} className="px-3 py-2 rounded bg-amber-500 text-white shadow">
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
      <div style={{ maxHeight: "64vh", overflowY: "auto" }} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold">Watches</h4>
            <div className="text-xs text-slate-500">{watches.length ? `${watches.length} total` : ""}</div>
          </div>

          <div className="mt-2 space-y-3">
            {loading && !watches.length ? (
              <div className="text-sm text-slate-500">Loading…</div>
            ) : watches.length === 0 ? (
              <div className="text-sm text-slate-500">No watches configured yet</div>
            ) : (
              watches.slice(0, WATCHES_PER_VIEW).map((w) => (
                <WatchRow key={w.id} watch={w} onSaveFreq={saveFreq} onTriggerCheck={triggerCheck} onUpdate={updateWatch} />
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
            <div className="text-xs text-slate-500">{events.length ? `${events.length} total` : ""}</div>
          </div>

          {/* compact events: closer to original simplicity, but tighter + cleaner */}
          <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {loading && !events.length ? (
              <div className="p-3 text-sm text-slate-500">Loading…</div>
            ) : events.length === 0 ? (
              <div className="p-3 text-sm text-slate-500">No events</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {events.slice(0, EVENTS_PER_VIEW).map((ev) => {
                  const et = String(ev.event_type ?? "").toLowerCase();
                  const tone: "ok" | "warn" | "bad" | "neutral" =
                    et.includes("change") || et.includes("changed") ? "warn" : et.includes("fail") || et.includes("error") ? "bad" : "neutral";

                  return (
                    <div key={ev.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Dot tone={tone} />
                            <div className="truncate text-xs font-semibold text-slate-700">{ev.event_type}</div>
                          </div>
                          <div className="mt-1 truncate text-sm font-medium text-slate-900">
                            {ev.payload?.snapshot?.title ?? ev.payload?.snapshot?.url}
                          </div>
                        </div>
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
