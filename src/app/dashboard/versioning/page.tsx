import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Versioning",
  description: "Track and manage version history for your product data.",
};

export default function Page() {
  return <PageClient />;
}
