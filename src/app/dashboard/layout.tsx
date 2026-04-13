// Server Component wrapper — forces all /dashboard/* routes to be dynamic (no static prerendering).
// This prevents build-time failures when Clerk/Supabase env vars are not present.
export const dynamic = "force-dynamic";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Dashboard | AvidiaTech Product Data OS",
    template: "%s | AvidiaTech",
  },
  description:
    "AvidiaTech Product Data OS — extract, enrich, translate, and distribute product data at scale.",
  openGraph: {
    title: "AvidiaTech Product Data OS",
    description:
      "Extract, enrich, translate, and distribute product data at scale with AI-powered workflows.",
    type: "website",
  },
};

export { default } from "./layout-client";
