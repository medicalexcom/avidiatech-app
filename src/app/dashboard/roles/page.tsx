import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Roles",
  description: "Manage team roles and permissions for your organization.",
};

export default function Page() {
  return <PageClient />;
}
