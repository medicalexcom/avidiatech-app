import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Images",
  description: "Extract, analyze, and enrich product images at scale.",
};

export default function Page() {
  return <PageClient />;
}
