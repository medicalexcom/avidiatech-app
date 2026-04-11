import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Browser",
  description: "AI-powered web browser for product research and data extraction.",
};

export default function Page() {
  return <PageClient />;
}
