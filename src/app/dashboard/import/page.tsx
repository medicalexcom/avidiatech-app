"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ImportUploaderWithPreset from "@/components/imports/ImportUploaderWithPreset";
import ConnectorManager from "@/components/integrations/ConnectorManager";
import ModuleLogsModal from "@/components/pipeline/ModuleLogsModal";
import RecentRuns from "@/components/pipeline/RecentRuns";
import { MappingPresetSelector } from "@/components/imports/MappingPresetSelector";
import ConnectorDetailsDrawer from "@/components/connectors/ConnectorDetailsDrawer";
import IntegrationStatus from "@/components/IntegrationStatus";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/* ... [the rest of your file above remains identical] ... */

/* Replace the existing loadConnectors function in your ImportPage component with this version */
async function loadConnectors() {
  if (!orgId) {
    setConnectors([]);
    return;
  }
  try {
    // Try primary integrations endpoint (supports generic integrations)
    const res = await fetch(`/api/v1/integrations?orgId=${encodeURIComponent(orgId)}`, { credentials: "same-origin" });
    let json = await res.json().catch(() => null);

    if (res.ok && (Array.isArray(json?.integrations) || Array.isArray(json))) {
      // Normal case: integrations endpoint returned data
      setConnectors(json.integrations ?? json ?? []);
      return;
    }

    // Fallback: ecommerce_connections (many ecom connectors are stored here)
    const res2 = await fetch(`/api/v1/ecommerce_connections`, { credentials: "same-origin" });
    const json2 = await res2.json().catch(() => null);
    if (res2.ok && (Array.isArray(json2?.connections) || Array.isArray(json2))) {
      // Normalize: ecommerce_connections rows may use config.store_hash etc.
      const rows = (json2.connections ?? json2 ?? []).map((r: any) => ({
        id: String(r.id),
        provider: r.platform ?? r.provider ?? "ecommerce",
        name: r.config?.store_name ?? r.name ?? r.config?.store_hash ?? r.id,
        status: r.status ?? "active",
        config: r.config ?? {},
        last_synced_at: r.updated_at ?? r.last_synced_at ?? null,
      }));
      setConnectors(rows);
      return;
    }

    // If neither returned useful data, set empty
    setConnectors([]);
  } catch (err) {
    console.error("loadConnectors error", err);
    setConnectors([]);
  }
}

/* ... [the rest of your file continues unchanged] ... */
