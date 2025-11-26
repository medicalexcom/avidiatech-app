"use client";

/**
 * Import page
 *
 * The Import product transforms Avidia’s structured product JSON into
 * platform-ready import files for Shopify, BigCommerce, WooCommerce and
 * other e‑commerce systems.  It provides a simple interface to download
 * CSV or JSON exports and will support direct API integrations in later
 * phases【73005020731527†L282-L301】.
 */
export default function ImportPage() {
  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">Import / Export</h1>
      <p className="mb-4">
        AvidiaImport converts your cleaned product data into the correct
        format for your e‑commerce platform. Choose the export type and
        download a ready‑to‑upload file.
      </p>
      <ul className="list-disc ml-6 space-y-2">
        <li>
          <strong>Platform exports:</strong> generate Shopify CSV, BigCommerce
          JSON, WooCommerce CSV and more【73005020731527†L282-L301】.
        </li>
        <li>
          <strong>Simple export dropdown:</strong> select the desired
          destination and download the file with one click【73005020731527†L296-L299】.
        </li>
        <li>
          <strong>Custom mapping layer:</strong> automatically map internal
          fields to each platform’s schema; advanced mappings can be configured
          via a user interface【73005020731527†L294-L301】.
        </li>
        <li>
          <strong>Future direct integrations:</strong> connect directly to
          Shopify, BigCommerce and WooCommerce APIs to push products without
          leaving the dashboard【73005020731527†L294-L301】.
        </li>
      </ul>
    </div>
  );
}
