// Server Component wrapper — forces all /dashboard/* routes to be dynamic (no static prerendering).
// This prevents build-time failures when Clerk/Supabase env vars are not present.
export const dynamic = "force-dynamic";

export { default } from "./layout-client";
