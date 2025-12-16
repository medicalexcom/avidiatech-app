"use client";

import React, { useEffect, useState } from "react";

/**
 * MonitorDashboard (frequency control simplified)
 *
 * - FrequencyControl now uses a preset dropdown (1d,7d,14d,30d) and a "Custom..." option.
 *   If "Custom..." is selected, an inline numeric input appears to type days.
 * - This removes the ambiguous always-visible custom numeric field while still allowing custom values.
 * - WatchRow uses hooks safely (no hooks in loops).
 *
 * API expectations:
 * - GET /api/monitor/watches
 * - POST /api/monitor/watches
 * - PATCH /api/monitor/watches/:id
 * - POST /api/monitor/check (body: { watchId })
 * - GET /api/monitor/events
 */

/** FrequencyControl: preset dropdown + optional custom days input */
type FrequencyControlProps = {
  days: number;
  onChange: (days: number) => void;
  ariaLabel?: string;
  className?: string;
};

function FrequencyControl({ days, onChange, ariaLabel, className }: FrequencyControlProps) {
  const presets = [1, 7, 14, 30];
  // selectedPreset: number or 'custom'
  const isPreset = presets.includes(Math.max(1, Math.round(days || 14)));
  const [selected, setSelected] = useState<string>(isPreset ? String(Math.round(days || 14)) : "custom");
  const [customValue, setCustomValue] = useState<number>(isPreset ? Math.round(days || 14) : Math.max(1, Math.round(days || 14)));

  useEffect(() => {
    const p = presets.includes(Math.max(1, Math.round(days || 14)));
    setSelected(p ? String(Math.round(days || 14)) : "custom");
    setCustomValue(Math.max(1, Math.round(days || 14)));
  }, [days]);

  return (
    <div className={className ?? "flex items-center gap-2"}>
      <select
        aria-label={ariaLabel ?? "frequency-presets"}
        value={selected}
        onChange={(e) => {
          const v = e.target.value;
          setSelected(v);
          if (v === "custom") {
            // keep customValue; do not call onChange until Save is pressed
            return;
          } else {
            const n = Number(v);
            setCustomValue(n);
            onChange(n);
          }
        }}
        className="rounded border px-2 py-1 text-sm"
      >
        {presets.map((p) => (
          <option key={p} value={String(p)}>
            {p}d
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
            className="w-20 rounded border px-2 py-1 text-sm"
            title="Custom days between checks"
          />
          <span className="text-xs text-slate-500">days</span>
          <button
            onClick={() => onChange(Math.max(1, Math.round(customValue)))}
            className="ml-1 rounded border px-2 py-1 text-xs"
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
    ok: "bg-emerald-100 text-emerald-800",
    changed: "bg-amber-100 text-amber-800",
    scrape_failed: "bg-red-100 text-red-800",
    error: "bg-red-100 text-red-800",
    unknown: "bg-slate-100 text-slate-700",
  };
  const cls = map[s] ?? map.unknown;
  return <span className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{s.replace("_", " ")}</span>;
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
    <div className="p-3 border rounded-lg bg-white/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-medium text-sm">{watch.source_url}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span>{watch.last_check_at ? new Date(watch.last_check_at).toLocaleString() : "never"}</span>
              <span>·</span>
              <StatusBadge status={watch.last_status} />
              {watch.muted_until ? <span className="text-xs text-slate-400">· muted</span> : null}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500">Frequency</div>
            <FrequencyControl
              days={localDays}
              onChange={(d) => setLocalDays(d)}
              ariaLabel={`Frequency for ${watch.source_url}`}
              className="items-center"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-500">Price Δ %</div>
            <input
              type="number"
              defaultValue={watch.price_threshold_percent ?? ""}
              onBlur={(e) => onUpdate(watch.id, { price_threshold_percent: e.currentTarget.value ? Number(e.currentTarget.value) : null })}
              className="w-24 rounded border px-2 py-1 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onTriggerCheck(watch.id)}
          className="px-3 py-1 rounded border text-xs bg-white hover:bg-slate-50"
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
          className="px-3 py-1 rounded bg-amber-500 text-white text-xs"
          title="Save frequency"
        >
          {saving ? "Saving…" : "Save"}
        </button>

        <button
          onClick={() => onUpdate(watch.id, { muted_until: watch.muted_until ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })}
          className="px-3 py-1 rounded border text-xs"
          title={watch.muted_until ? "Unmute" : "Mute 24h"}
        >
          {watch.muted_until ? "Unmute" : "Mute"}
        </button>
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
      {/* Create watch row */}
      <div className="flex gap-2 items-center">
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
          <button onClick={createWatch} className="px-3 py-2 rounded bg-amber-500 text-white shadow">
            Add Watch
          </button>
          <button onClick={() => { loadWatches(); loadEvents(); }} className="px-3 py-2 rounded border">
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="col-span-2">
          <h4 className="text-sm font-semibold">Watches</h4>
          <div className="mt-2 space-y-3">
            {loading && !watches.length ? (
              <div className="text-sm text-slate-500">Loading…</div>
            ) : watches.length === 0 ? (
              <div className="text-sm text-slate-500">No watches configured yet</div>
            ) : (
              watches.map((w) => (
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
        </div>

        <div>
          <h4 className="text-sm font-semibold">Recent events</h4>
          <div className="mt-2 space-y-2">
            {loading && !events.length ? (
              <div className="text-sm text-slate-500">Loading…</div>
            ) : events.length === 0 ? (
              <div className="text-sm text-slate-500">No events</div>
            ) : (
              events.slice(0, 6).map((ev) => (
                <div key={ev.id} className="p-2 border rounded bg-slate-50">
                  <div className="text-xs text-slate-500">{ev.event_type}</div>
                  <div className="text-sm font-medium truncate">{ev.payload?.snapshot?.title ?? ev.payload?.snapshot?.url}</div>
                  <div className="text-xs text-slate-400">{new Date(ev.created_at).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
