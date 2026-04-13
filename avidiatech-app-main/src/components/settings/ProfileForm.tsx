"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

/**
 * Premium Profile form
 * - Avatar preview + name
 * - Email read-only
 * - Language/timezone preferences
 * - Notification toggles
 * - Save with optimistic UI + toast messages
 */

type State = {
  fullName: string;
  language: string;
  timezone: string;
  notifications: boolean;
};

const TIMEZONES = ["UTC", "America/New_York", "Europe/London", "Asia/Tokyo"];
const LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
];

export default function ProfileForm() {
  const { user } = useUser();
  const [state, setState] = useState<State>({
    fullName: user?.fullName ?? "",
    language: "en",
    timezone: "UTC",
    notifications: true,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setState((s) => ({ ...s, fullName: user?.fullName ?? "" }));
  }, [user?.fullName]);

  async function onSave() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed saving");
      setMsg("Saved successfully");
      // Optionally update Clerk profile (if allowed) here
    } catch (err: any) {
      setMsg(err?.message || String(err));
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="bg-white dark:bg-slate-900 border rounded-lg p-6 shadow-sm">
        <div className="flex items-start gap-6">
          <div className="w-36 flex-shrink-0">
            <img src={(user as any)?.imageUrl ?? "/default-avatar.png"} alt="avatar" className="w-32 h-32 rounded-lg object-cover" />
            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">Pro tip: upload a clear face photo for your account</div>
          </div>

          <div className="flex-1">
            <h2 className="text-lg font-semibold">Profile</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Personalize your account and preferences</p>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium">Full name</label>
                <input value={state.fullName} onChange={(e) => setState({ ...state, fullName: e.target.value })} className="mt-1 w-full border rounded px-3 py-2 bg-white/80 dark:bg-slate-800" />
              </div>

              <div>
                <label className="block text-xs font-medium">Email</label>
                <input value={(user as any)?.primaryEmailAddress?.emailAddress ?? (user as any)?.emailAddresses?.[0]?.emailAddress ?? ""} readOnly className="mt-1 w-full border rounded px-3 py-2 bg-slate-50 dark:bg-slate-800" />
              </div>

              <div>
                <label className="block text-xs font-medium">Language</label>
                <select className="mt-1 w-full border rounded px-3 py-2 bg-white/80 dark:bg-slate-800" value={state.language} onChange={(e) => setState({ ...state, language: e.target.value })}>
                  {LANGS.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium">Time zone</label>
                <select className="mt-1 w-full border rounded px-3 py-2 bg-white/80 dark:bg-slate-800" value={state.timezone} onChange={(e) => setState({ ...state, timezone: e.target.value })}>
                  {TIMEZONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={state.notifications} onChange={(e) => setState({ ...state, notifications: e.target.checked })} />
                  <span className="text-sm">Receive product & billing notifications</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button onClick={onSave} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button onClick={() => setState({ fullName: user?.fullName ?? "", language: "en", timezone: "UTC", notifications: true })} className="px-4 py-2 border rounded">
                Reset
              </button>
              {msg && <div className="text-sm text-slate-500 dark:text-slate-400">{msg}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
