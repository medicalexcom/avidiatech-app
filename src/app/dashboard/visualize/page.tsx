import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Visualize",
  description: "Visualize your product catalog with interactive charts and graphs.",
};

export default function Page() {
  return <PageClient />;
}
