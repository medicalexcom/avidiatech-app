'use client';

export default function DescriptionFormatsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Custom Description Formats</h1>
      <p className="mb-4">Select from multiple description styles to generate product copy tailored to your marketplace or brand voice.</p>
      <ul className="list-disc ml-6 space-y-2">
        <li>Avidia Standard – optimized for search and readability across all channels.</li>
        <li>General E-commerce – a concise, neutral tone that fits most marketplaces.</li>
        <li>Shopify Conversion – conversion-focused copy for Shopify stores.</li>
        <li>Manufacturer Rep – replicates the manufacturer’s official style guidelines.</li>
      </ul>
    </div>
  );
}
