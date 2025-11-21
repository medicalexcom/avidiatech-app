export default function MatchPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Match</h1>
      <p>
        Our Match module uses advanced AI and machine learning to identify and
        normalize duplicate or related product records across disparate
        sources.
      </p>
      <ul className="list-disc pl-5 space-y-2 mt-2">
        <li>
          AI‑powered entity resolution to deduplicate identical and similar
          products across suppliers, marketplaces, and internal catalogs.
        </li>
        <li>
          Fuzzy matching with customizable similarity scoring that considers
          product titles, attributes, categories, and descriptions.
        </li>
        <li>
          Cross‑language and multi‑locale matching to link products in
          different languages or regional catalogs.
        </li>
        <li>
          Attribute‑level comparison and merging to build a unified source
          of truth for product data.
        </li>
        <li>
          Rules engine for custom matching logic, synonyms, and weighting to
          adapt to your specific domain.
        </li>
        <li>
          Seamless integration with Extract, Describe, Validate, and Visualize
          for end‑to‑end data enrichment.
        </li>
      </ul>
      <p className="mt-4">
        Use Match to unify your product data landscape, drive accurate
        analytics, and power cross‑sell and upsell recommendations.
      </p>
    </div>
  );
}
