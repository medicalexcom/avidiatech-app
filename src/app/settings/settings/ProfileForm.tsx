"use client";
import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

/**
 * ProfileForm client component
 * - shows/edits name, preferred language, notifications
 * - saves via /api/settings/profile (server route to implement separately)
 * - email shown as read-only (Clerk-managed)
 */

type FormState = {
  fullName: string;
  preferredLanguage: string;
  notificationsEnabled: boolean;
};

const LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" }
];

export default function ProfileForm() {
  const { user } = useUser();
  const [state, setState] = useState<FormState>({
    fullName: user?.fullName ?? "",
    preferredLanguage: "en",
    notificationsEnabled: true
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setState((s) => ({ ...s, fullName: user?.fullName ?? "" }));
  }, [user?.fullName]);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "save_failed");
      setMsg("Saved");
    } catch (err: any) {
      setMsg(String(err?.message || err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        <div>
          <label style={{ display: "block", fontWeight: 600 }}>Full name</label>
          <input value={state.fullName} onChange={(e) => setState({ ...state, fullName: e.target.value })} style={{ width: "100%", padding: 8, marginTop: 8 }} />

          <label style={{ display: "block", fontWeight: 600, marginTop: 12 }}>Email</label>
          <input value={user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? ""} readOnly style={{ width: "100%", padding: 8, marginTop: 8, background: "#f7f7f7" }} />

          <label style={{ display: "block", fontWeight: 600, marginTop: 12 }}>Preferred language</label>
          <select value={state.preferredLanguage} onChange={(e) => setState({ ...state, preferredLanguage: e.target.value })} style={{ width: "100%", padding: 8, marginTop: 8 }}>
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={state.notificationsEnabled} onChange={(e) => setState({ ...state, notificationsEnabled: e.target.checked })} />
              Enable notifications
            </label>
          </div>

          <div style={{ marginTop: 16 }}>
            <button onClick={save} disabled={saving} style={{ padding: "8px 12px" }}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            {msg && <span style={{ marginLeft: 12 }}>{msg}</span>}
          </div>
        </div>

        <aside style={{ padding: 12, border: "1px solid var(--border,#eee)", borderRadius: 8 }}>
          <h3>Security & account</h3>
          <p style={{ fontSize: 13 }}>Manage your authentication methods and security settings.</p>
          <div style={{ marginTop: 12 }}>
            <a href="/dashboard/settings/profile">Edit security settings</a>
          </div>
        </aside>
      </div>
    </div>
  );
}
