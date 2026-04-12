import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Cluster",
  description: "Group and segment your products automatically using AI clustering.",
};

export default function Page() {
  return <PageClient />;
}
