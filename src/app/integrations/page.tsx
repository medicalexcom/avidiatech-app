"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ConnectorDetailsDrawer from "@/components/connectors/ConnectorDetailsDrawer";
import { useToast } from "@/components/ui/toast";

type AnyObj = Record<string, any>;

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function pillClass(variant: "connected" | "disconnected") {
  if (variant === "connected")
    return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/45 dark:text-emerald-100 dark:border-emerald-500/40";
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-200 dark:border-slate-700";
}

export default function IntegrationsPage() {
  const router = useRouter();
  const toast = useToast();

  const [orgId, setOrgId] = useState<string>("");
  const [connectors, setConnectors] = useState<any[]>([]);
  const [detailsConnectorId, setDetailsConnectorId] = useState<string>("");

  // premium classes (match Import page)
  const btnGhost =
    "h-10 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/70 px-3 text-sm text-slate-800 shadow-sm hover:bg-white " +
    "dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:bg-slate-950";
  const btnPrimary =
    "h-10 inline-flex items-center justify-center rounded-xl px-4 text-sm font-semibold text-slate-950 shadow-sm transition " +
    "bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 hover:opacity-95 hover:-translate-y-[1px] " +
    "focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:opacity-60 disabled:shadow-none";

  async function fetchOrg() {
    try {
      const res = await fetch("/api/v1/me", { credentials: "same-origin" });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok && json.org_id) {
        setOrgId(json.org_id);
        return json.org_id as string;
      }
      setOrgId("");
      return "";
    } catch {
      setOrgId("");
      return "";
    }
  }

  async function loadConnectors(org: string) {
    if (!org) {
      setConnectors([]);
      return;
    }
    try {
      const res = await fetch(`/api/v1/integrations?orgId=${encodeURIComponent(org)}`, { credentials: "same-origin" });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) setConnectors(json.integrations ?? []);
      else setConnectors([]);
    } catch {
      setConnectors([]);
    }
  }

  async function testConnector(connectorId: string) {
    try {
      const res = await fetch(`/api/v1/integrations/${encodeURIComponent(connectorId)}/test`, {
        method: "POST",
        credentials: "same-origin",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(`Test failed: ${json?.error ?? "unknown"}`);
        return;
      }
      toast.success("Connection test succeeded");
      await loadConnectors(orgId);
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    }
  }

  async function syncConnector(connectorId: string) {
    if (!orgId) {
      toast.error("Org ID missing.");
      return;
    }
    try {
      const res = await fetch(`/api/v1/integrations/${encodeURIComponent(connectorId)}/sync`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ org_id: orgId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? "Sync failed");
        return;
      }
      toast.success("Sync started");
      await loadConnectors(orgId);
      router.push("/dashboard/import");
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    }
  }

  useEffect(() => {
    (async () => {
      const o = await fetchOrg();
      if (o) await loadConnectors(o);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasConnected = useMemo(() => (connectors?.length ?? 0) > 0, [connectors]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Background (match Import page treatment) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-36 -left-28 h-72 w-72 rounded-full bg-cyan-300/22 blur-3xl dark:bg-cyan-500/14" />
        <div className="absolute -top-40 right-[-10rem] h-64 w-64 rounded-full bg-fuchsia-300/14 blur-3xl dark:bg-fuchsia-500/10" />
        <div className="absolute -bottom-52 right-[-12rem] h-80 w-80 rounded-full bg-emerald-300/16 blur-3xl dark:bg-emerald-500/10" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at top, rgba(248,250,252,0) 0%, rgba(248,250,252,0.92) 55%, rgba(248,250,252,1) 100%)",
          }}
        />
        <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.07]">
          <div
            style={{
              height: "100%",
              width: "100%",
              background:
                "linear-gradient(to right, rgba(229,231,235,1) 1px, transparent 1px), linear-gradient(to bottom, rgba(229,231,235,1) 1px, transparent 1px)",
              backgroundSize: "46px 46px",
            }}
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {/* Top bar */}
        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600 shadow-sm">
              Integrations · AvidiaTech
              {orgId ? (
                <>
                  <span className="h-3 w-px bg-slate-300/70 dark:bg-slate-700/70" />
                  <span className="font-mono text-[10px]">{String(orgId).slice(0, 8)}…</span>
                </>
              ) : null}
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              {hasConnected ? "store connected" : "no store connected"}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] shadow-sm",
              hasConnected ? pillClass("connected") : pillClass("disconnected")
            )}>
              <span className={cx("h-1.5 w-1.5 rounded-full", hasConnected ? "bg-emerald-400" : "bg-slate-400 dark:bg-slate-600")} />
              {hasConnected ? "connected" : "disconnected"}
            </span>

            <button onClick={() => loadConnectors(orgId)} className={cx(btnGhost, "h-9 px-3 text-xs")}>
              Refresh
            </button>

            <button onClick={() => router.push("/dashboard/import")} className={cx(btnGhost, "h-9 px-3 text-xs")}>
              Back to Import
            </button>
          </div>
        </section>

        {/* Premium workspace */}
        <section className="rounded-3xl border border-slate-200 bg-white/92 shadow-[0_18px_45px_rgba(148,163,184,0.18)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/55">
          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-12 lg:gap-5 lg:p-5">
            {/* LEFT: Connected stores */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Connected stores</h1>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Manage your store connectors and test connectivity.</p>
                </div>
                <button onClick={() => router.push("/dashboard/import")} className={cx(btnPrimary, "h-9 px-3 text-xs")}>
                  Go import
                </button>
              </div>

              <div className="space-y-2">
                {connectors?.length ? (
                  connectors.map((c: AnyObj) => {
                    const label = c?.name ?? c?.store_name ?? c?.provider ?? "Integration";
                    const provider = (c?.provider ?? "store").toString();
                    return (
                      <div
                        key={String(c.id)}
                        className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/35"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="truncate font-semibold">{label}</div>
                              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">({provider})</span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className={cx("inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[11px]",
                                pillClass("connected")
                              )}>
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                connected
                              </span>
                              {c?.updated_at ? (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                  updated: <span className="font-mono">{String(c.updated_at)}</span>
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
                            <button onClick={() => setDetailsConnectorId(String(c.id))} className={cx(btnGhost, "h-9 px-3 text-xs")}>
                              Manage
                            </button>
                            <button onClick={() => testConnector(String(c.id))} className={cx(btnGhost, "h-9 px-3 text-xs")}>
                              Test
                            </button>
                            <button onClick={() => syncConnector(String(c.id))} className={cx(btnPrimary, "h-9 px-3 text-xs")}>
                              Sync
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/35 dark:text-slate-300">
                    No store connected yet. Go back to Import and click <span className="font-semibold">Connect a store</span>, or add one below.
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Add integrations (premium catalog) */}
            <div className="lg:col-span-5 space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Add integrations</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Add a store connection. (If your connect flow uses a separate wizard/route, link it here.)
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* BigCommerce */}
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/35">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">BigCommerce</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        Connect your BigCommerce store for product import and sync.
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        // Keep this navigation “wired” without inventing backend: route to your existing connect flow.
                        // If you already have a connect wizard, update only this path.
                        router.push("/integrations/bigcommerce");
                      }}
                      className={cx(btnPrimary, "h-9 px-3 text-xs")}
                    >
                      Connect
                    </button>
                  </div>
                </div>

                {/* Shopify (if supported later) */}
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/35">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">Shopify</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        Connect Shopify for catalog import and ongoing sync.
                      </div>
                    </div>
                    <button
                      onClick={() => router.push("/integrations/shopify")}
                      className={cx(btnGhost, "h-9 px-3 text-xs")}
                    >
                      Configure
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/35 dark:text-slate-300">
                Tip: After connecting, return to Import to use <span className="font-semibold">Sync from store</span>.
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Existing drawer (wired “Manage”) */}
      <ConnectorDetailsDrawer
        integrationId={detailsConnectorId}
        isOpen={Boolean(detailsConnectorId)}
        onClose={() => setDetailsConnectorId("")}
      />
    </main>
  );
}
