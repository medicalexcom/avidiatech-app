import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Match",
  description: "Match and deduplicate product catalog entries at scale.",
};

export default function Page() {
  return <PageClient />;
}
