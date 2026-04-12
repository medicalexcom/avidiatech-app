import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Audit",
  description: "Quality-check and audit your product data for completeness and accuracy.",
};

export default function Page() {
  return <PageClient />;
}
