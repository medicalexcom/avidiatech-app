import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Price",
  description: "AI-powered pricing intelligence and competitive price optimization.",
};

export default function Page() {
  return <PageClient />;
}
