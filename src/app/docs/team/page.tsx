export const dynamic = "force-dynamic";
import Link from "next/link";
export default function DocsTeamPage() {
  const roles = [
    { role: "Owner", description: "Full access: billing, API keys, team management, all pipeline operations." },
    { role: "Admin", description: "Pipeline operations, integrations, and team management. Cannot modify billing." },
    { role: "Member", description: "View products, trigger pipeline runs, review translations. Cannot manage API keys or team." },
  ];
  return (
    <div className="max-w-prose space-y-10">
      <div className="space-y-2">
        <span className="inline-block px-2 py-0.5 text-xs rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">Account</span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Team Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Invite colleagues, assign roles, and manage team access to your AvidiaTech workspace.</p>
      </div>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">Inviting Team Members</h2>
        <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside">
          <li>Go to <Link href="/settings/organization" className="text-cyan-600 dark:text-cyan-400 hover:underline">Settings → Organization</Link>.</li>
          <li>Click <strong>Invite member</strong> and enter the email address.</li>
          <li>Select a role (Owner, Admin, or Member).</li>
          <li>The invitee receives an email and can join with an existing account or create one.</li>
        </ol>
        <p className="text-sm text-slate-500 dark:text-slate-400">All team members share the same tenant, credits, and pipeline history. Usage counts toward the workspace's plan quota regardless of which team member triggered the run.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">Roles & Permissions</h2>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          {roles.map(r => (
            <div key={r.role} className="p-4 bg-white dark:bg-slate-900">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">{r.role}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{r.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
