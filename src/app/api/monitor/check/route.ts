import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { runWatchOnce } from "@/lib/monitor/core";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // Require Clerk auth — adjust or remove if you have other server auth
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const watchId = body?.watchId;
    if (!watchId) return NextResponse.json({ ok: false, error: "watchId required" }, { status: 400 });

    const res = await runWatchOnce(watchId);
    return NextResponse.json({ ok: true, result: res }, { status: 200 });
  } catch (err: any) {
    console.error("monitor.check error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
