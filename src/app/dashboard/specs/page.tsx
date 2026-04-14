import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Specs",
  description: "Normalize and standardize product specifications across your catalog.",
};

export default function Page() {
  return <PageClient />;
}
