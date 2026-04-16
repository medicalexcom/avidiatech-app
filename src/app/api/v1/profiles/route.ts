/**
 * /api/v1/profiles/route.ts
 * 
 * API route to list available content generation profiles.
 * Used by the Profile Selector UI component.
 */

import { NextRequest, NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getAvailableProfiles } from "@/lib/gpt/loadPromptProfile";

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const auth = safeGetAuth(req as any) as any;
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get available profiles
    const profiles = await getAvailableProfiles();

    return NextResponse.json({
      profiles,
      count: profiles.length,
    });

  } catch (error: any) {
    console.error("Failed to list profiles:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to list profiles" },
      { status: 500 }
    );
  }
}
