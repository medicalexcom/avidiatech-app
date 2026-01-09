"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

export default function IntegrationsNewPage() {
  const router = useRouter();
  const toast = useToast();
  const [platform, setPlatform] = useState<"bigcommerce" | "shopify">("bigcommerce");
  const [storeHash, setStoreHash] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(false);

  async function connectBigCommerce(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!storeHash || !accessToken) {
      toast.error("Please enter store hash and access token");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/integrations/ecommerce/bigcommerce", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeHash: storeHash.trim(), accessToken: accessToken.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || json?.message || "Connect failed");
      toast.success("Store connected");
      // go to integrations list
      router.push("/integrations");
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Add store</h1>
        <p className="text-sm text-slate-600">Connect a store so we can import products and inventory. Choose your platform and follow the instructions.</p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="p-6 border rounded-lg bg-white shadow-sm">
          <h2 className="text-lg font-medium mb-3">Choose platform</h2>
          <div className="space-y-3">
            <label className={`block p-3 rounded border cursor-pointer ${platform === "bigcommerce" ? "border-emerald-500 bg-emerald-50" : ""}`}>
              <input type="radio" name="platform" value="bigcommerce" checked={platform === "bigcommerce"} onChange={() => setPlatform("bigcommerce")} className="mr-2" />
              <strong>BigCommerce</strong>
              <div className="text-sm text-slate-500">API token (Store API) — store hash + API token</div>
            </label>

            <label className={`block p-3 rounded border cursor-pointer ${platform === "shopify" ? "border-emerald-500 bg-emerald-50" : ""}`}>
              <input type="radio" name="platform" value="shopify" checked={platform === "shopify"} onChange={() => setPlatform("shopify")} className="mr-2" />
              <strong>Shopify</strong>
              <div className="text-sm text-slate-500">Coming soon — OAuth flow</div>
            </label>
          </div>
        </section>

        <section className="p-6 border rounded-lg bg-white shadow-sm">
          <h2 className="text-lg font-medium mb-3">Connect BigCommerce</h2>
          <form onSubmit={connectBigCommerce} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Store hash</label>
              <input value={storeHash} onChange={(e) => setStoreHash(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="e.g. abcd123" />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Access token</label>
              <input value={accessToken} onChange={(e) => setAccessToken(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="BigCommerce API token" />
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-emerald-600 text-white">
                {loading ? "Connecting…" : "Connect store"}
              </button>
              <a className="text-sm text-slate-500" href="https://support.bigcommerce.com/s/article/Create-a-REST-API-Account" target="_blank" rel="noreferrer">How to get a token</a>
            </div>
          </form>

          <div className="mt-6 text-sm text-slate-500">
            <strong>Tip:</strong> After connecting, use the Integrations page to manage tokens and disconnect stores.
          </div>
        </section>
      </main>
    </div>
  );
}
