// TEMPORARY debug endpoint - /api/debug/envs
// Protect with DEBUG_SECRET header. This endpoint only returns presence/length info (no secret values).
// Add DEBUG_SECRET in Vercel and deploy, then call with header x-debug-secret: <DEBUG_SECRET>.

import { NextResponse, type NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const header = req.headers.get("x-debug-secret") || "";
  const expected = process.env.DEBUG_SECRET || "";
  if (!expected || header !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const present = (name: string) => {
    const v = process.env[name];
    return { present: !!v, length: v ? String(v).length : 0 };
  };

  return NextResponse.json({
    ok: true,
    env: {
      SUPABASE_URL: present("SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: present("SUPABASE_SERVICE_ROLE_KEY"),
      SUPABASE_ANON_KEY: present("SUPABASE_ANON_KEY"),
      NEXT_PUBLIC_SUPABASE_URL: present("NEXT_PUBLIC_SUPABASE_URL"),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: present("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      INGEST_SECRET: present("INGEST_SECRET"),
      APP_URL: present("APP_URL"),
      NODE_ENV: present("NODE_ENV")
    },
    note: "This endpoint shows only presence and lengths. Remove after debugging."
  });
}
