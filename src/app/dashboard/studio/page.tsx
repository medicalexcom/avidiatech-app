import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Studio",
  description: "Design and preview product content in a powerful creative studio.",
};

export default function Page() {
  return <PageClient />;
}
