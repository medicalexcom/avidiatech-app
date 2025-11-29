"use client";

/**
 * Studio product page
 *
 * AvidiaStudio is an interactive design tool for customizing and publishing
 * product pages.  It puts you in control of content and layout.
 */
export default function StudioPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold mb-4">Studio</h1>
      <p className="mb-4">
        AvidiaStudio is an interactive design tool for customizing and publishing
        product pages.
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>An interactive studio for designing and customizing product pages</li>
        <li>Allows you to edit content, rearrange sections, and preview live updates</li>
        <li>Provides templates tailored to your brand and industry</li>
        <li>Publishes pages directly to your e‑commerce platform or CMS</li>
      </ul>
    </div>
  );
}
