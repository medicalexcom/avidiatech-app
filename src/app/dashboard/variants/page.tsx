import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Variants",
  description: "Generate and manage product variants, bundles, and combinations.",
};

export default function Page() {
  return <PageClient />;
}
