import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Feeds",
  description: "Manage and distribute product feeds to any retail channel.",
};

export default function Page() {
  return <PageClient />;
}
