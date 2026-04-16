/**
 * /api/v1/tenant/profile/route.ts
 * 
 * API route to save a tenant's default profile selection.
 * This will update the tenant record in Supabase with the chosen profile.
 */

import { NextRequest, NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";
import { getAvailableProfiles } from "@/lib/gpt/loadPromptProfile";

interface UpdateTenantProfileRequest {
  tenantId: string;
  profileKey: string;
}

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const auth = safeGetAuth(req as any) as any;
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = auth.userId as string;
    const body = await req.json() as UpdateTenantProfileRequest;

    if (!body.tenantId || !body.profileKey) {
      return NextResponse.json(
        { error: "tenantId and profileKey are required" },
        { status: 400 }
      );
    }

    // Validate that the profile key exists
    const availableProfiles = await getAvailableProfiles();
    const profileExists = availableProfiles.some(p => p.key === body.profileKey);

    if (!profileExists) {
      return NextResponse.json(
        { error: `Profile '${body.profileKey}' not found` },
        { status: 400 }
      );
    }

    // Check if user has permission to modify this tenant
    // For now, we'll assume any authenticated user can modify their tenant
    // In production, you'd want more granular permission checking
    const tenantCheck = await supabaseServiceRole
      .from("tenants")
      .select("id, name")
      .eq("id", body.tenantId)
      .single();

    if (tenantCheck.error || !tenantCheck.data) {
      return NextResponse.json(
        { error: "Tenant not found or access denied" },
        { status: 404 }
      );
    }

    // Update tenant with new default profile
    // NOTE: This assumes a default_profile_key column exists in the tenants table
    // You may need to add this column with a migration:
    // ALTER TABLE tenants ADD COLUMN default_profile_key TEXT DEFAULT 'medicalex.bigcommerce.longform';
    const updateResult = await supabaseServiceRole
      .from("tenants")
      .update({
        default_profile_key: body.profileKey,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.tenantId);

    if (updateResult.error) {
      console.error("Failed to update tenant profile:", updateResult.error);
      
      // If the column doesn't exist yet, provide a helpful error message
      if (updateResult.error.message?.includes("default_profile_key")) {
        return NextResponse.json(
          { 
            error: "Database schema update required. Please run the tenant profile migration first.",
            details: "ALTER TABLE tenants ADD COLUMN default_profile_key TEXT DEFAULT 'medicalex.bigcommerce.longform';"
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to update tenant profile" },
        { status: 500 }
      );
    }

    // Log the profile change for audit purposes
    console.info(`Tenant ${body.tenantId} profile changed to ${body.profileKey} by user ${userId}`);

    return NextResponse.json({
      success: true,
      tenantId: body.tenantId,
      profileKey: body.profileKey,
      message: "Tenant profile updated successfully"
    });

  } catch (error: any) {
    console.error("Failed to update tenant profile:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update tenant profile" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const auth = safeGetAuth(req as any) as any;
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId query parameter is required" },
        { status: 400 }
      );
    }

    // Get current tenant profile
    const tenantResult = await supabaseServiceRole
      .from("tenants")
      .select("id, name, default_profile_key")
      .eq("id", tenantId)
      .single();

    if (tenantResult.error || !tenantResult.data) {
      return NextResponse.json(
        { error: "Tenant not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      tenantId: tenantResult.data.id,
      tenantName: tenantResult.data.name,
      profileKey: tenantResult.data.default_profile_key || "medicalex.bigcommerce.longform",
    });

  } catch (error: any) {
    console.error("Failed to get tenant profile:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to get tenant profile" },
      { status: 500 }
    );
  }
}
