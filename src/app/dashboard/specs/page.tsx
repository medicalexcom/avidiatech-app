"use client";

/**
 * Specs product page
 *
 * AvidiaSpecs normalizes and structures specification data across suppliers and
 * manufacturers.  It converts messy spec tables into clean key‑value pairs.
 */
export default function SpecsPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold mb-4">Specs</h1>
      <p className="mb-4">
        AvidiaSpecs normalizes and structures specification data across suppliers and
        manufacturers.
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Parses product specification tables into structured key‑value pairs</li>
        <li>Normalizes units and measurement values across suppliers</li>
        <li>Maps synonymous spec names to your preferred schema</li>
        <li>Exports structured specs as CSV, JSON, or feed formats</li>
      </ul>
    </div>
  );
}
