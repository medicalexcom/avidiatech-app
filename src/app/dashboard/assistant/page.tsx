import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "AI Assistant",
  description: "Chat with your AI assistant to get help with product data tasks.",
};

export default function Page() {
  return <PageClient />;
}
