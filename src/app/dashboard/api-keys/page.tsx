import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "API Keys",
  description: "Manage your API keys and access credentials.",
};

export default function Page() {
  return <PageClient />;
}
