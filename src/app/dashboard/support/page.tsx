import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help and support for your AvidiaTech account.",
};

export default function Page() {
  return <PageClient />;
}
