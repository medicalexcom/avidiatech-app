"use client";

/**
 * Price page
 *
 * AvidiaPrice provides a pricing engine that calculates recommended selling
 * prices based on your costs, margin targets, shipping buffers and other
 * business rules.  It helps ensure consistent profitability across your
 * catalog【73005020731527†L324-L341】.
 */
export default function PricePage() {
  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">Pricing</h1>
      <p className="mb-4">
        Set optimal selling prices using AvidiaPrice. Enter your cost and
        desired margin and the engine will suggest a price along with margin
        and profit details.
      </p>
      <ul className="list-disc ml-6 space-y-2">
        <li>
          <strong>Price calculator:</strong> input cost, shipping assumptions and
          margin targets to get a suggested price and expected gross profit【73005020731527†L324-L334】.
        </li>
        <li>
          <strong>Batch pricing:</strong> apply pricing rules to a list of SKUs
          in bulk, saving time for large catalogs【73005020731527†L339-L341】.
        </li>
        <li>
          <strong>Range checks:</strong> receive warnings if suggested prices
          exceed minimum or maximum thresholds【73005020731527†L334-L341】.
        </li>
        <li>
          <strong>Export:</strong> include calculated prices in your product
          exports automatically【73005020731527†L342-L343】.
        </li>
      </ul>
    </div>
  );
}
