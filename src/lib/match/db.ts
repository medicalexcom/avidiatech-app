import { supabase } from "@/src/lib/supabase";
import { MatchRow, MatchInput } from "./types";
import { v4 as uuidv4 } from "uuid";

export async function insertMatchRows(tenantId: string, jobId: string, rows: Omit<Partial<MatchRow>, "id" | "created_at" | "updated_at">[]) {
  if (!supabase) throw new Error("supabase not configured");
  const withIds = rows.map((r) => ({ id: uuidv4(), tenant_id: tenantId, job_id: jobId, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...r }));
  const { data, error } = await supabase.from("sku_url_matches").insert(withIds);
  if (error) throw error;
  return data as any;
}

export async function getRowsForJob(tenantId: string, jobId: string) {
  if (!supabase) throw new Error("supabase not configured");
  const { data, error } = await supabase.from("sku_url_matches").select("*").eq("tenant_id", tenantId).eq("job_id", jobId).order("created_at", { ascending: true });
  if (error) throw error;
  return data as any;
}

export async function updateRowsStatus(tenantId: string, ids: string[], status: "confirmed" | "rejected") {
  if (!supabase) throw new Error("supabase not configured");
  const { data, error } = await supabase.from("sku_url_matches").update({ status, updated_at: new Date().toISOString() }).in("id", ids).eq("tenant_id", tenantId);
  if (error) throw error;
  return data;
}

export async function getRowsByIds(tenantId: string, ids: string[]) {
  if (!supabase) throw new Error("supabase not configured");
  const { data, error } = await supabase.from("sku_url_matches").select("*").in("id", ids).eq("tenant_id", tenantId);
  if (error) throw error;
  return data as any[];
}
