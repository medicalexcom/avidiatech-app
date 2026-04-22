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
import { isOrgAdmin } from "@/lib/auth/isOrgAdmin";

interface UpdateTenantProfileRequest {
  tenantId?: string;
  profileKey: string;
}

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const auth = safeGetAuth(req as any, { strict: process.env.NODE_ENV === "production" }) as any;
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = auth.userId as string;
    const body = await req.json() as UpdateTenantProfileRequest;

    const actorTenantId = ((auth.actor as any)?.tenantId as string) || null;
    const resolvedTenantId = body.tenantId || actorTenantId;

    if (!resolvedTenantId || !body.profileKey) {
      return NextResponse.json(
        { error: "tenantId (or actor tenant) and profileKey are required" },
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

    // Enforce role-based authorization for tenant writes
    const admin = await isOrgAdmin(req as Request, resolvedTenantId);
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantCheck = await supabaseServiceRole
      .from("tenants")
      .select("id, name")
      .eq("id", resolvedTenantId)
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
      })
      .eq("id", resolvedTenantId);

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
        {
          error: "Failed to update tenant profile",
          details: updateResult.error.message,
          code: updateResult.error.code ?? null,
        },
        { status: 500 }
      );
    }

    // Log the profile change for audit purposes
    console.info(`Tenant ${resolvedTenantId} profile changed to ${body.profileKey} by user ${userId}`);

    return NextResponse.json({
      success: true,
      tenantId: resolvedTenantId,
      profileKey: body.profileKey,
      message: "Tenant profile updated successfully"
    });

  } catch (error: any) {
    if (error?.code === "auth_unavailable") {
      return NextResponse.json({ error: "auth_unavailable" }, { status: 500 });
    }
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
    const auth = safeGetAuth(req as any, { strict: process.env.NODE_ENV === "production" }) as any;
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const tenantIdFromQuery = url.searchParams.get("tenantId");
    const actorTenantId = ((auth.actor as any)?.tenantId as string) || null;
    const tenantId = tenantIdFromQuery || actorTenantId;

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId query parameter is required (or actor tenant must be available)" },
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
    if (error?.code === "auth_unavailable") {
      return NextResponse.json({ error: "auth_unavailable" }, { status: 500 });
    }
    console.error("Failed to get tenant profile:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to get tenant profile" },
      { status: 500 }
    );
  }
}
