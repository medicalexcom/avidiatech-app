import { redirect } from "next/navigation";

/**
 * Legacy underscore URL — permanently redirect to canonical hyphenated route.
 */
export default function ApiKeysLegacyPage() {
  redirect("/dashboard/api-keys");
}
