"use client";
import React, { useEffect, useState } from "react";

/**
 * Product list / translate landing (client component for interactivity).
 * This is a simple UI to list recent extracted products and link to workspace.
 *
 * Replace / adapt data fetching to your app's data access pattern (Supabase client).
 */

export default function TranslateListPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch recent products via API route or via frontend Supabase client
    fetch("/api/translate/list")
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products || []);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main style={{ padding: 20 }}>
      <h1>Translate — Products</h1>
      {loading ? (
        <p>Loading...</p>
      ) : products.length === 0 ? (
        <p>No recent products found.</p>
      ) : (
        <ul>
          {products.map((p: any) => (
            <li key={p.id} style={{ marginBottom: 12 }}>
              <a href={`/dashboard/translate/${p.id}`}><strong>{p.source_url || p.id}</strong></a>
              <div style={{ fontSize: 12, color: "#666" }}>{p.created_at}</div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
