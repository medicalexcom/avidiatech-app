import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "API Explorer",
  description: "Explore and test the AvidiaTech API directly in the browser.",
};

export default function Page() {
  return <PageClient />;
}
