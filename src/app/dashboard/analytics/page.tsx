import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Track product data performance and catalog health metrics.",
};

export default function Page() {
  return <PageClient />;
}
