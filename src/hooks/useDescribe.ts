"use client";

import { useState } from "react";
import type { DescribeRequest, DescribeResponse } from "@/components/describe/types";

/**
 * Client hook to call /api/v1/describe
 * - handles loading/error state
 * - stores last result in sessionStorage so DescribeOutput can consume it
 *
 * Update:
 * - On non-OK responses, include server-provided `detail` and `debug` fields in the Error message.
 *   This is important now that Describe can return structured debug context when the model
 *   output is invalid (e.g. JSON schema / parsing issues).
 */

const STORAGE_KEY = "avidia:describe:lastResult";

function safeStringify(v: any) {
  try {
    if (typeof v === "string") return v;
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export default function useDescribe() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function generate(
    payload: DescribeRequest
  ): Promise<DescribeResponse | null> {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Some failures might not return JSON; handle defensively.
      let json: any = null;
      try {
        json = await res.json();
      } catch (e) {
        json = null;
      }

      if (!res.ok) {
        const parts: string[] = [];

        // Primary error
        parts.push(json?.error || `Status ${res.status}`);

        // Optional detail/debug from server
        if (json?.detail) parts.push(`detail=${safeStringify(json.detail)}`);
        if (json?.debug) parts.push(`debug=${safeStringify(json.debug)}`);

        // If server returned nothing JSON-like, include status text
        if (!json && res.statusText) parts.push(res.statusText);

        const err = new Error(parts.filter(Boolean).join(" | "));
        setError(err);
        setLoading(false);
        return null;
      }

      // store in sessionStorage for the output panel
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(json));
        // dispatch a storage event for other windows / listeners
        window.dispatchEvent(new Event("storage"));
      } catch {
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
