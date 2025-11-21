"use client";

/**
 * Images page
 *
 * The Images product extracts product images from a URL, cleans and annotates
 * them with descriptive alt text, and maps them to variant options when
 * possible.  This page outlines the key capabilities of the AvidiaImages
 * module.  Future iterations may include a fully interactive image gallery
 * and editing tools.
 */
export default function ImagesPage() {
  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">Images</h1>
      <p className="mb-4">
        AvidiaImages extracts, cleans, and annotates product images from your
        source pages. It ensures images are high quality, properly sized, and
        accompanied by useful alt text.
      </p>
      <ul className="list-disc ml-6 space-y-2">
        <li>
          <strong>Image extraction and cleaning:</strong> harvest all relevant
          product photos from the URL, filter out duplicates and low resolution
          pictures【73005020731527†L260-L280】.
        </li>
        <li>
          <strong>AI-generated alt text:</strong> automatically generate
          descriptive alt tags based on product names and SEO data【73005020731527†L263-L280】.
        </li>
        <li>
          <strong>Variant‑image mapping:</strong> assign images to variant options
          such as color or size so your store can display the right photo for
          each variant【73005020731527†L263-L280】.
        </li>
        <li>
          <strong>Image gallery UI:</strong> view and edit images in a gallery
          with thumbnails, drag‑and‑drop ordering, and alt‑text editing【73005020731527†L263-L280】.
        </li>
      </ul>
    </div>
  );
}
