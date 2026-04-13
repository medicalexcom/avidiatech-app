import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Translate",
  description: "Translate product content into any language with AI precision.",
};

export default function Page() {
  return <PageClient />;
}
