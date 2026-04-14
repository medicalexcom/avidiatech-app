import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Docs",
  description: "AI-powered document parsing and product data extraction from any file format.",
};

export default function Page() {
  return <PageClient />;
}
