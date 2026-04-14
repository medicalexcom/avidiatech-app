import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Monitor",
  description: "Monitor product data health, changes, and anomalies in real time.",
};

export default function Page() {
  return <PageClient />;
}
