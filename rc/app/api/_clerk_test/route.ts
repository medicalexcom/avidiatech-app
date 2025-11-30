// src/app/api/_clerk_test/route.ts
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

export async function GET(req: Request) {
  try {
    const auth = getAuth((req as any));
    return NextResponse.json({ ok: true, auth });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
