import type { Metadata } from "next";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Extract",
  description: "Extract product data from any URL — images, specs, pricing, and more.",
};

export default function Page() {
  return <PageClient />;
}
