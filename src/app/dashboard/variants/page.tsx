"use client";

/**
 * Variants product page
 *
 * AvidiaVariants groups together different variations of the same product into a
 * single entity.  It helps merchants manage color, size, and configuration
 * options while maintaining clean catalogs.
 */
export default function VariantsPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold mb-4">Variants</h1>
      <p className="mb-4">
        AvidiaVariants groups together different variations of the same product
        into a single entity.
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Automatically identifies color, size, and other options across your catalog</li>
        <li>Unifies duplicate listings into coherent variant groups</li>
        <li>Creates canonical SKUs and variant codes for easier inventory management</li>
        <li>Feeds directly into our Extract, Describe, and Validate workflows</li>
      </ul>
    </div>
  );
}
