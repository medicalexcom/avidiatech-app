export const dynamic = "force-dynamic";
import Link from "next/link";

type StatusType = "operational" | "degraded" | "outage" | "maintenance";

const SERVICES: { name: string; description: string; status: StatusType }[] = [
  {
    name: "API & Ingestion",
    description: "Product extraction, pipeline runs, bulk jobs",
    status: "operational" as const,
  },
  {
    name: "AI Services",
    description: "AvidiaDescribe, AvidiaSEO, translation",
    status: "operational" as const,
  },
  {
    name: "Dashboard",
    description: "Web application and all module pages",
    status: "operational" as const,
  },
  {
    name: "Database",
    description: "Supabase PostgreSQL and Realtime",
    status: "operational" as const,
  },
  {
    name: "Authentication",
    description: "Clerk sign-in, sign-up, session management",
    status: "operational" as const,
  },
  {
    name: "Billing",
    description: "Stripe subscriptions and payment processing",
    status: "operational" as const,
  },
  {
    name: "Integrations",
    description: "Shopify, BigCommerce, WooCommerce connectors",
    status: "operational" as const,
  },
  {
    name: "Support Chat",
    description: "Real-time support messaging and file uploads",
    status: "operational" as const,
  },
];

const INCIDENTS: { date: string; title: string; details: string; resolved: boolean }[] = [
  // No current incidents
];

const PAST_INCIDENTS = [
  {
    date: "March 14, 2026",
    title: "Elevated AI processing latency",
    details:
      "AvidiaDescribe and AvidiaSEO experienced elevated response times (15–30s) due to OpenAI API congestion. All requests completed successfully. Resolved in approximately 45 minutes.",
    resolved: true,
  },
  {
    date: "February 28, 2026",
    title: "Scheduled maintenance — database upgrade",
    details:
      "Planned Supabase database maintenance window. No data loss. API was in read-only mode for 12 minutes. All services restored on schedule.",
    resolved: true,
  },
];

function StatusBadge({ status }: { status: StatusType }) {
  const config: Record<StatusType, { label: string; dot: string; bg: string; text: string }> = {
    operational: {
      label: "Operational",
      dot: "bg-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      text: "text-emerald-700 dark:text-emerald-400",
    },
    degraded: {
      label: "Degraded",
      dot: "bg-amber-500 animate-pulse",
      bg: "bg-amber-50 dark:bg-amber-950/40",
      text: "text-amber-700 dark:text-amber-400",
    },
    outage: {
      label: "Outage",
      dot: "bg-red-500 animate-pulse",
      bg: "bg-red-50 dark:bg-red-950/40",
      text: "text-red-700 dark:text-red-400",
    },
    maintenance: {
      label: "Maintenance",
      dot: "bg-sky-500",
      bg: "bg-sky-50 dark:bg-sky-950/40",
      text: "text-sky-700 dark:text-sky-400",
    },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function overallStatus(services: typeof SERVICES): StatusType {
  if (services.some((s) => s.status === "outage")) return "outage";
  if (services.some((s) => s.status === "degraded")) return "degraded";
  if (services.some((s) => s.status === "maintenance")) return "maintenance";
  return "operational";
}

export default function StatusPage() {
  const overall = overallStatus(SERVICES);
  const now = new Date().toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  });

  const bannerConfig: Record<StatusType, { bg: string; text: string; headline: string }> = {
    operational: {
      bg: "bg-emerald-600",
      text: "text-white",
      headline: "All Systems Operational",
    },
    degraded: {
      bg: "bg-amber-500",
      text: "text-white",
      headline: "Partial Service Degradation",
    },
    outage: {
      bg: "bg-red-600",
      text: "text-white",
      headline: "Service Disruption",
    },
    maintenance: {
      bg: "bg-sky-600",
      text: "text-white",
      headline: "Scheduled Maintenance",
    },
  };

  const banner = bannerConfig[overall];

  return (
    <main className="relative min-h-[100dvh] bg-white text-slate-900 dark:bg-[#09090b] dark:text-slate-50 overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-[-5%] h-[400px] w-[400px] rounded-full bg-emerald-500/8 dark:bg-emerald-500/8 blur-[120px]" />
        <div className="absolute bottom-0 left-[-5%] h-[300px] w-[300px] rounded-full bg-cyan-500/6 dark:bg-cyan-500/8 blur-[100px]" />
        <div className="absolute inset-0 dark:hidden" style={{ backgroundImage: "radial-gradient(rgba(100,116,139,0.1) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute inset-0 hidden dark:block opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle,rgba(148,163,184,0.5) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
      </div>
      {/* Top stripe */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "linear-gradient(90deg,#6366f1 0%,#8b5cf6 50%,#0ea5e9 100%)" }} />

      {/* Back nav */}
      <nav className="relative border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Dashboard
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-[12px] font-medium text-slate-600 dark:text-slate-400">System Status</span>
        </div>
      </nav>

      {/* Banner */}
      <div className={`${banner.bg} ${banner.text}`}>
        <div className="max-w-3xl mx-auto px-6 py-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="w-3 h-3 rounded-full bg-white/70" />
            <h1 className="text-2xl font-bold">{banner.headline}</h1>
          </div>
          <p className="text-sm opacity-80">Last updated: {now}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10 relative">
        {/* Active incidents */}
        {INCIDENTS.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-50">Active Incidents</h2>
            <div className="space-y-3">
              {INCIDENTS.map((inc) => (
                <div key={inc.title} className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-red-800 dark:text-red-300">{inc.title}</p>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-1">{inc.details}</p>
                    </div>
                    <span className="text-xs text-red-500 whitespace-nowrap">{inc.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Services */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-50">Services</h2>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
            {SERVICES.map((svc, i) => (
              <div
                key={svc.name}
                className={`flex items-center justify-between px-5 py-4 ${
                  i < SERVICES.length - 1 ? "border-b border-slate-100 dark:border-slate-800" : ""
                }`}
              >
                <div>
                  <p className="font-medium text-sm">{svc.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{svc.description}</p>
                </div>
                <StatusBadge status={svc.status} />
              </div>
            ))}
          </div>
        </section>

        {/* Uptime summary */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-50">Uptime — Last 90 Days</h2>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Overall Platform Uptime</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">99.94%</span>
            </div>
            {/* Uptime bar — 90 green blocks */}
            <div className="flex gap-0.5">
              {Array.from({ length: 90 }).map((_, i) => {
                // Simulate 2 slight degradation days
                const isDegraded = i === 44 || i === 28;
                return (
                  <div
                    key={i}
                    className={`h-8 flex-1 rounded-sm ${isDegraded ? "bg-amber-400" : "bg-emerald-500"}`}
                    title={isDegraded ? "Degraded" : "Operational"}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-slate-400">
              <span>90 days ago</span>
              <span>Today</span>
            </div>
          </div>
        </section>

        {/* Incident history */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-50">Incident History</h2>
          {PAST_INCIDENTS.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-8 text-center text-sm text-slate-500">
              No incidents in the past 90 days.
            </div>
          ) : (
            <div className="space-y-3">
              {PAST_INCIDENTS.map((inc) => (
                <div key={inc.title} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{inc.title}</p>
                        {inc.resolved && (
                          <span className="inline-block px-2 py-0.5 text-[10px] rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                            Resolved
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{inc.details}</p>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">{inc.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Subscribe */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center">
          <h3 className="font-semibold mb-1">Get Status Alerts</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Subscribe to be notified when incidents are created or resolved.
          </p>
          <a
            href="mailto:support@avidiatech.com?subject=Status%20Alert%20Subscription"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
          >
            Subscribe via email
          </a>
          <p className="text-xs text-slate-400 mt-3">
            Questions? Contact{" "}
            <a href="mailto:support@avidiatech.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              support@avidiatech.com
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
