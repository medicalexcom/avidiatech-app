import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Notifications",
  description: "View and manage your activity notifications.",
};

export default function Page() {
  return <PageClient />;
}
