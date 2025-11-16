"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { fetchProducts } from "@/lib/api";

interface Product {
  _id: string;
  name?: string;
  title?: string;
  url?: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const items = await fetchProducts();
        setProducts(items);
      } catch (e: any) {
        setError(e.message || "Failed to fetch products");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      <p className="mb-6">
        Welcome! {user?.emailAddresses?.[0]?.emailAddress ?? "Loading..."}
      </p>

      {loading && <p>Loading products...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && products.length === 0 && <p>No products ingested yet.</p>}
      {products.length > 0 && (
        <table className="min-w-full bg-white border">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Name</th>
              <th className="py-2 px-4 border-b">URL</th>
              <th className="py-2 px-4 border-b">Created</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id} className="border-b">
                <td className="py-2 px-4">
                  {p.name || p.title || "Untitled"}
                </td>
                <td className="py-2 px-4">
                  {p.url ? (
                    <a
                      href={p.url}
                      className="text-blue-500 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {p.url}
                    </a>
                  ) : (
                    "N/A"
                  )}
                </td>
                <td className="py-2 px-4">
                  {new Date(p.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
