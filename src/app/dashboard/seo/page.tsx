import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "SEO",
  description: "AI-powered SEO optimization for titles, meta descriptions, and product copy.",
};

export default function Page() {
  return <PageClient />;
}
