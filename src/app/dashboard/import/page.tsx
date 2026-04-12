import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Import",
  description: "Import and ingest product data from CSV, Excel, JSON, and any other source.",
};

export default function Page() {
  return <PageClient />;
}
