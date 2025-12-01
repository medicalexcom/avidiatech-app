"use client";

/**
 * Browser page
 *
 * AvidiaBrowser is a Chrome extension that lets you extract product data
 * directly while visiting sites.  It’s designed for power users who want
 * on‑the‑fly scraping and quick export or ingestion【73005020731527†L404-L417】.
 */
export default function BrowserPage() {
  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">Browser Extension</h1>
      <p className="mb-4">
        Use the AvidiaBrowser extension to capture product data without leaving
        the page you’re browsing.  Perfect for agencies and catalog managers
        who research products online.【73005020731527†L404-L417】
      </p>
      <ul className="list-disc ml-6 space-y-2">
        <li>
          <strong>On‑page extraction:</strong> extract product details from any
          product page you visit and preview them instantly【73005020731527†L404-L417】.
        </li>
        <li>
          <strong>Send to Avidia:</strong> push the captured data into your
          AvidiaTech dashboard with a single click or download CSV/JSON for
          immediate use【73005020731527†L413-L417】.
        </li>
        <li>
          <strong>Secure and rate‑limited:</strong> authentication is built in
          and requests are rate limited to protect your account【73005020731527†L416-L418】.
        </li>
      </ul>
    </div>
  );
}
