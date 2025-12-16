"use client";

import React, { useEffect, useState } from "react";

/**
 * RulesAdmin - basic CRUD for monitor_rules
 * - list rules
 * - create rule (simple JSON inputs for condition & action)
 * - edit / enable / disable / delete
 */

export default function RulesAdmin() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [newName, setNewName] = useState("");
  const [newEventType, setNewEventType] = useState("change_detected");
  const [newCondition, setNewCondition] = useState('{"price_pct_change":5}');
  const [newAction, setNewAction] = useState('{"type":"app_notification","title":"Change detected","body":"{{payload.diff}}"}');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/monitor/rules");
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) setRules(j.rules ?? []);
      else setRules([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createRule() {
    try {
      const payload = {
        name: newName || `Rule ${Date.now()}`,
        event_type: newEventType,
        condition: JSON.parse(newCondition || "{}"),
        action: JSON.parse(newAction || "{}"),
      };
      const res = await fetch("/api/monitor/rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error ?? "create failed");
      setNewName("");
      setNewCondition('{"price_pct_change":5}');
      setNewAction('{"type":"app_notification"}');
      await load();
    } catch (err:any) {
      alert(String(err?.message ?? err));
    }
  }

  async function toggleEnabled(id: string, enabled: boolean) {
    try {
      const res = await fetch(`/api/monitor/rules/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error ?? "update failed");
      await load();
    } catch (err:any) {
      alert(String(err?.message ?? err));
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete rule?")) return;
    try {
      const res = await fetch(`/api/monitor/rules/${encodeURIComponent(id)}`, { method: "DELETE" });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error ?? "delete failed");
      await load();
    } catch (err:any) {
      alert(String(err?.message ?? err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <h3 className="font-medium">Create rule</h3>
        <div className="mt-3 grid gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" className="border rounded px-2 py-1" />
          <select value={newEventType} onChange={(e) => setNewEventType(e.target.value)} className="border rounded px-2 py-1">
            <option value="change_detected">change_detected</option>
            <option value="price_change">price_change</option>
            <option value="any">any</option>
          </select>
          <label className="text-xs text-slate-500">Condition (JSON)</label>
          <textarea value={newCondition} onChange={(e) => setNewCondition(e.target.value)} rows={3} className="border rounded p-2" />
          <label className="text-xs text-slate-500">Action (JSON)</label>
          <textarea value={newAction} onChange={(e) => setNewAction(e.target.value)} rows={3} className="border rounded p-2" />
          <div>
            <button onClick={createRule} className="px-3 py-1 rounded bg-amber-500 text-white">Create</button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-medium">Existing rules</h3>
        <div className="mt-2 space-y-2">
          {loading ? <div>Loading…</div> : rules.length === 0 ? <div>No rules</div> : rules.map((r) => (
            <div key={r.id} className="p-3 border rounded flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-medium truncate">{r.name}</div>
                <div className="text-xs text-slate-500">{r.event_type} · {r.enabled ? "enabled" : "disabled"}</div>
                <div className="text-xs text-slate-400 mt-1 truncate">{JSON.stringify(r.condition)}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleEnabled(r.id, r.enabled)} className="px-2 py-1 text-xs border rounded">{r.enabled ? "Disable" : "Enable"}</button>
                <button onClick={() => remove(r.id)} className="px-2 py-1 text-xs border rounded">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
