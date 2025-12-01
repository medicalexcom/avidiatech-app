"use client";

import { useState } from "react";
import type { DescribeRequest, DescribeResponse } from "@/components/describe/types";

/**
 * Client hook to call /api/v1/describe
 * - handles loading/error state
 * - stores last result in sessionStorage so DescribeOutput can consume it
 */

const STORAGE_KEY = "avidia:describe:lastResult";

export default function useDescribe() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function generate(payload: DescribeRequest): Promise<DescribeResponse | null> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        const err = new Error(json?.error || `Status ${res.status}`);
        setError(err);
        setLoading(false);
        return null;
      }

      // store in sessionStorage for the output panel
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(json));
        // dispatch a storage event for other windows / listeners
        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        // ignore
      }

      setLoading(false);
      return json as DescribeResponse;
    } catch (err: any) {
      setError(err);
      setLoading(false);
      return null;
    }
  }

  return { generate, loading, error };
}
