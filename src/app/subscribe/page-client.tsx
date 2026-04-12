import { redirect } from "next/navigation";

/**
 * /subscribe — redirects immediately to the live pricing page.
 *
 * Previously showed a "Coming soon" placeholder. The pricing page at
 * /dashboard/pricing is fully functional, so we redirect there instead.
 */
export default function SubscribePage() {
  redirect("/dashboard/pricing");
}
