"use client";

import React, { useCallback, useState } from "react";
import PageShell from "@/components/layout/PageShell";

type Role = "owner" | "admin" | "member" | "viewer";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: Role;
  joinedAt: string;
  lastActive: string;
  avatar: string;
};

const INITIAL_MEMBERS: TeamMember[] = [
  {
    id: "usr_01",
    name: "Jordan Mitchell",
    email: "jordan@company.com",
    role: "owner",
    joinedAt: "2024-01-12",
    lastActive: "2025-04-04",
    avatar: "JM",
  },
  {
    id: "usr_02",
    name: "Alex Rivera",
    email: "alex@company.com",
    role: "admin",
    joinedAt: "2024-03-05",
    lastActive: "2025-04-03",
    avatar: "AR",
  },
  {
    id: "usr_03",
    name: "Sam Chen",
    email: "sam@company.com",
    role: "member",
    joinedAt: "2024-06-18",
    lastActive: "2025-04-04",
    avatar: "SC",
  },
  {
    id: "usr_04",
    name: "Taylor Nguyen",
    email: "taylor@company.com",
    role: "member",
    joinedAt: "2024-09-22",
    lastActive: "2025-04-02",
    avatar: "TN",
  },
  {
    id: "usr_05",
    name: "Casey Park",
    email: "casey@agency.io",
    role: "viewer",
    joinedAt: "2025-01-08",
    lastActive: "2025-03-30",
    avatar: "CP",
  },
];

const ROLE_COLORS: Record<Role, string> = {
  owner: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-emerald-300",
  admin: "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/40 dark:border-sky-500/30 dark:text-sky-300",
  member: "bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300",
  viewer: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-500/30 dark:text-amber-300",
};

const ROLE_AVATAR_COLORS: Record<Role, string> = {
  owner: "bg-emerald-500",
  admin: "bg-sky-500",
  member: "bg-slate-500",
  viewer: "bg-amber-500",
};

const CAPABILITIES = [
  { label: "Manage billing & subscription", owner: true, admin: false, member: false, viewer: false },
  { label: "Invite & remove users", owner: true, admin: true, member: false, viewer: false },
  { label: "Manage API keys & webhooks", owner: true, admin: true, member: false, viewer: false },
  { label: "Configure feed connectors", owner: true, admin: true, member: false, viewer: false },
  { label: "Run Extract / SEO / Audit pipelines", owner: true, admin: true, member: true, viewer: false },
  { label: "Create & manage monitor watches", owner: true, admin: true, member: true, viewer: false },
  { label: "Push products to BigCommerce / Shopify", owner: true, admin: true, member: true, viewer: false },
  { label: "View analytics & dashboards", owner: true, admin: true, member: true, viewer: true },
  { label: "Export product data as CSV / JSON", owner: true, admin: true, member: true, viewer: true },
  { label: "View-only mode (read product data)", owner: true, admin: true, member: true, viewer: true },
];

export default function RolesPage() {
  const [members, setMembers] = useState<TeamMember[]>(INITIAL_MEMBERS);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);

  const showToast = useCallback((msg: string, tone: "success" | "error" = "success") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3500);
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      showToast("Enter a valid email address", "error");
      return;
    }
    if (members.some((m) => m.email.toLowerCase() === inviteEmail.toLowerCase())) {
      showToast("This email is already in the workspace", "error");
      return;
    }
    setInviting(true);
    await new Promise((r) => setTimeout(r, 1000));
    const initials = inviteEmail.split("@")[0].split(/[._-]/).map((p: string) => p[0]?.toUpperCase() ?? "").join("").slice(0, 2);
    setMembers((prev) => [...prev, {
      id: `usr_${Date.now()}`,
      name: inviteEmail.split("@")[0].replace(/[._-]/g, " "),
      email: inviteEmail.toLowerCase(),
      role: inviteRole,
      joinedAt: new Date().toISOString().slice(0, 10),
      lastActive: "—",
      avatar: initials || "?",
    }]);
    setInviteEmail("");
    setInviting(false);
    showToast(`Invite sent to ${inviteEmail}`);
  }

  async function changeRole(memberId: string, newRole: Role) {
    const m = members.find((m) => m.id === memberId);
    if (!m) return;
    if (m.role === "owner" && newRole !== "owner") {
      showToast("Cannot change the owner's role. Transfer ownership first.", "error");
      return;
    }
    setChangingId(memberId);
    await new Promise((r) => setTimeout(r, 600));
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
    setChangingId(null);
    showToast(`Role updated to ${newRole}`);
  }

  async function removeMember(memberId: string) {
    const m = members.find((m) => m.id === memberId);
    if (m?.role === "owner") {
      showToast("Cannot remove the workspace owner", "error");
      return;
    }
    setRemovingId(memberId);
    await new Promise((r) => setTimeout(r, 800));
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setRemovingId(null);
    showToast("Member removed from workspace");
  }

  return (
    <PageShell glow="neutral">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg ${
          toast.tone === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/80 dark:text-emerald-200"
            : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/80 dark:text-rose-200"
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="relative px-4 py-6 sm:px-6 lg:px-10 lg:py-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Workspace Settings
            </p>
            <h1 className="text-xl font-semibold sm:text-2xl">Roles &amp; Permissions</h1>
            <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
              Invite team members, assign roles, and see who can access each module.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {members.length} members
            </span>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          {/* LEFT: Member list + invite */}
          <div className="space-y-4">
            {/* Invite form */}
            <form
              onSubmit={handleInvite}
              className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Invite team member</h2>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-600"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 cursor-pointer"
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {inviting ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  ) : null}
                  {inviting ? "Inviting…" : "Invite"}
                </button>
              </div>
            </form>

            {/* Members table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Team members</p>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                    {/* Avatar */}
                    <div className={`h-8 w-8 shrink-0 rounded-full ${ROLE_AVATAR_COLORS[m.role]} flex items-center justify-center text-[11px] font-bold text-white`}>
                      {m.avatar}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate capitalize">{m.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{m.email}</p>
                    </div>

                    {/* Role badge / selector */}
                    {m.role === "owner" ? (
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${ROLE_COLORS[m.role]}`}>
                        Owner
                      </span>
                    ) : (
                      <select
                        value={m.role}
                        onChange={(e) => changeRole(m.id, e.target.value as Role)}
                        disabled={changingId === m.id}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase cursor-pointer ${ROLE_COLORS[m.role]} bg-transparent disabled:opacity-60`}
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    )}

                    {/* Last active */}
                    <span className="text-[11px] text-slate-400 dark:text-slate-600 whitespace-nowrap hidden sm:block">
                      {m.lastActive === "—" ? "Pending" : `Active ${m.lastActive}`}
                    </span>

                    {/* Remove */}
                    {m.role !== "owner" && (
                      <button
                        onClick={() => removeMember(m.id)}
                        disabled={removingId === m.id}
                        className="text-slate-400 hover:text-rose-500 disabled:opacity-40 transition-colors"
                        title="Remove member"
                      >
                        {removingId === m.id ? (
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Permission matrix + role descriptions */}
          <div className="space-y-4">
            {/* Permission matrix */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Permission matrix</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300 min-w-[160px]">Capability</th>
                      <th className="px-3 py-2 text-center font-semibold text-emerald-700 dark:text-emerald-300">Owner</th>
                      <th className="px-3 py-2 text-center font-semibold text-sky-700 dark:text-sky-300">Admin</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-600 dark:text-slate-300">Member</th>
                      <th className="px-3 py-2 text-center font-semibold text-amber-700 dark:text-amber-300">Viewer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {CAPABILITIES.map((cap, i) => (
                      <tr key={i} className={i % 2 === 1 ? "bg-slate-50/60 dark:bg-slate-950/30" : ""}>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{cap.label}</td>
                        {(["owner", "admin", "member", "viewer"] as const).map((role) => (
                          <td key={role} className="px-3 py-2 text-center">
                            {cap[role] ? (
                              <svg className="h-3.5 w-3.5 mx-auto text-emerald-500 dark:text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-700">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Role descriptions */}
            <div className="space-y-2">
              {(["owner", "admin", "member", "viewer"] as Role[]).map((role) => {
                const desc: Record<Role, string> = {
                  owner: "Full control: billing, subscriptions, workspace deletion, and API key rotation. One owner per workspace.",
                  admin: "Runs pipelines, manages feeds, invites members, and configures monitors. Cannot change billing or ownership.",
                  member: "Day-to-day product work: Extract, Describe, SEO, Import, Monitor. Cannot change workspace settings or team access.",
                  viewer: "Read-only access to products and exports. Perfect for clients, stakeholders, or external reviewers.",
                };
                return (
                  <div key={role} className={`rounded-xl border px-3 py-2.5 ${ROLE_COLORS[role]}`}>
                    <p className="font-semibold text-sm capitalize">{role}</p>
                    <p className="mt-0.5 text-[11px] opacity-80">{desc[role]}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
