"use client";

import React, { useEffect, useState } from "react";

/**
 * MonitorDashboard (fixed)
 *
 * - Fixes client runtime error by removing Hook calls inside map/loops.
 * - Extracts per-watch row into a WatchRow child component so each row may use hooks safely.
 * - Keeps FrequencyControl inline (no new files).
 *
 * Replace the existing src/components/monitor/MonitorDashboard.tsx with this file.
 */

/** FrequencyControl: presets + custom input combo (stateless-ish) */
type FrequencyControlProps = {
  days: number;
  onChange: (days: number) => void;
  ariaLabel?: string;
  className?: string;
};

function FrequencyControl({ days, onChange, ariaLabel, className }: FrequencyControlProps) {
  const presets = [1, 7, 14, 30];
  const [value, setValue] = useState<number>(Math.max(1, Math.round(days || 14)));

  // keep local value synced when parent days change
  useEffect(() => {
    setValue(Math.max(1, Math.round(days || 14)));
  }, [days]);

  return (
    <div className={className ?? "flex items-center gap-2"}>
      <label className="text-xs text-slate-500">Every</label>

      <input
        aria-label={ariaLabel ?? "frequency-days"}
        type="number"
        min={1}
        step={1}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-20 rounded border px-2 py-1 text-sm"
        title="Number of days between checks (custom)"
      />

      <span className="text-xs text-slate-500">days</span>

      <select
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="rounded border px-2 py-1 text-sm"
        aria-label="frequency-presets"
      >
        {presets.map((p) => (
          <option key={p} value={p}>
            {p}d
          </option>
        ))}
        <option value={value}>Custom</option>
      </select>

      <button
        onClick={() => onChange(Math.max(1, Math.round(value)))}
        className="ml-2 rounded border px-2 py-1 text-xs"
        title="Apply frequency"
      >
        Save
      </button>
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

/** Child component for a single watch row (safe to use hooks inside) */
function WatchRow({ watch, onSaveFreq, onTriggerCheck, onUpdate }: {
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
    <div className="p-3 border rounded bg-white/50 flex items-start justify-between">
      <div className="min-w-0">
        <div className="truncate font-medium">{watch.source_url}</div>
        <div className="text-xs text-slate-500">
          last: {watch.last_check_at ? new Date(watch.last_check_at).toLocaleString() : "never"} · {watch.last_status ?? "unknown"}
          {watch.muted_until ? ` · muted until ${new Date(watch.muted_until).toLocaleString()}` : ""}
        </div>

        <div className="mt-2 text-xs flex items-center gap-3">
          <FrequencyControl
            days={localDays}
            onChange={(d) => setLocalDays(d)}
            ariaLabel={`Frequency for ${watch.source_url}`}
            className="items-center"
          />
          <div className="flex gap-2 ml-2">
            <button
              onClick={async () => {
                setSaving(true);
                try {
                  await onSaveFreq(watch.id, localDays);
                } finally {
                  setSaving(false);
                }
              }}
              className="px-2 py-1 text-xs border rounded"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setLocalDays(freqDays)} className="px-2 py-1 text-xs border rounded">Reset</button>
          </div>
          <div className="ml-2 text-xs text-slate-500">Hint: frequency controls how often the worker will consider this watch for checking.</div>
        </div>

        <div className="mt-2 text-xs">
          <label className="text-xs text-slate-500 mr-1">Price Δ %</label>
          <input
            type="number"
            defaultValue={watch.price_threshold_percent ?? ""}
            onBlur={(e) => onUpdate(watch.id, { price_threshold_percent: e.currentTarget.value ? Number(e.currentTarget.value) : null })}
            className="w-28 rounded border px-2 py-1 text-xs"
          />
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <button onClick={() => onTriggerCheck(watch.id)} className="px-2 py-1 text-xs border rounded">Check</button>
          <button onClick={() => onUpdate(watch.id, { muted_until: watch.muted_until ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })} className="px-2 py-1 text-xs border rounded">
            {watch.muted_until ? "Unmute" : "Mute 24h"}
          </button>
        </div>
        <div className="text-xs">
          <button onClick={() => { navigator.clipboard?.writeText(watch.source_url); alert("Copied URL"); }} className="px-2 py-1 text-xs border rounded">Copy URL</button>
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
          <div className="mt-2 space-y-2">
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
