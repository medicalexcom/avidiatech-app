import React, { Suspense } from "react";
import ChooseOrganizationClient from "./ChooseOrganizationClient";

/**
 * Server page that renders the client chooser inside Suspense to satisfy
 * Next's prerender requirements.
 */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ChooseOrganizationClient />
    </Suspense>
  );
}
