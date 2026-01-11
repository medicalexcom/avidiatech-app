"use client";
import React, { useEffect, useState } from "react";

/**
 * OrganizationForm client component
 * - organization name, address, timezone
 * - simple invite user form (calls /api/organization/invite)
 * - list of members fetched from /api/organization/members
 *
 * Server endpoints not included in this scaffold.
 */

type Member = { id: string; email: string; name?: string; role?: string };

export default function OrganizationForm() {
  const [orgName, setOrgName] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [inviteEmail, setInviteEmail] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/organization/members")
      .then((r) => r.json())
      .then((d) => setMembers(d.members || []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, []);

  async function invite() {
    await fetch("/api/organization/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail })
    });
    setInviteEmail("");
    // refresh members
    const { members: m } = await (await fetch("/api/organization/members")).json();
    setMembers(m || []);
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
        <div>
          <label style={{ fontWeight: 600 }}>Organization name</label>
          <input value={orgName} onChange={(e) => setOrgName(e.target.value)} style={{ display: "block", width: "100%", padding: 8, marginTop: 8 }} />

          <label style={{ fontWeight: 600, marginTop: 12 }}>Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} style={{ display: "block", width: "100%", padding: 8, marginTop: 8 }} />

          <label style={{ fontWeight: 600, marginTop: 12 }}>Time zone</label>
          <input value={timezone} onChange={(e) => setTimezone(e.target.value)} style={{ display: "block", width: "100%", padding: 8, marginTop: 8 }} />

          <div style={{ marginTop: 16 }}>
            <button>Save Organization</button>
          </div>
        </div>

        <aside style={{ padding: 12, border: "1px solid var(--border,#eee)", borderRadius: 8 }}>
          <h3>Team</h3>
          <div style={{ marginTop: 8 }}>
            <label style={{ fontWeight: 600 }}>Invite user</label>
            <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@example.com" style={{ width: "100%", padding: 8, marginTop: 6 }} />
            <button onClick={invite} style={{ marginTop: 8 }}>
              Invite
            </button>
          </div>

          <div style={{ marginTop: 12 }}>
            <h4>Members</h4>
            {loading ? (
              <p>Loading…</p>
            ) : (
              <ul>
                {members.map((m) => (
                  <li key={m.id}>
                    {m.name ?? m.email} — <em>{m.role ?? "member"}</em>
                    <button style={{ marginLeft: 8 }}>Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
