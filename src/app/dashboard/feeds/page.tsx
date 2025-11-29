"use client";

/**
 * Feeds product page
 *
 * AvidiaFeeds consolidates and normalizes product feeds from multiple sources
 * into a unified, ready‑to‑import feed compatible with your e‑commerce
 * platform.
 */
export default function FeedsPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold mb-4">Feeds</h1>
      <p className="mb-4">
        AvidiaFeeds consolidates and normalizes product feeds from multiple sources
        into a unified feed.
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Consolidates supplier and distributor feeds into a single normalized feed</li>
        <li>Detects missing or mismatched fields and fills gaps from existing ingestions</li>
        <li>Applies your product taxonomies and category mappings</li>
        <li>Delivers ready‑to‑import feeds for Shopify, BigCommerce, and other platforms</li>
      </ul>
    </div>
  );
}
