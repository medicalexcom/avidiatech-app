import type { NextApiRequest, NextApiResponse } from "next";
import { getServiceSupabaseClient } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getServiceSupabaseClient();
  const { id } = req.query as { id?: string };

  if (!id) return res.status(400).json({ ok: false, error: "id_required" });

  if (req.method === "GET") {
    const { data: job } = await supabase.from("bulk_jobs").select("*").eq("id", id).maybeSingle();
    if (!job) return res.status(404).json({ ok: false, error: "not_found" });

    const { data: samples } = await supabase
      .from("bulk_job_items")
      .select("*")
      .eq("bulk_job_id", id)
      .order("item_index", { ascending: true })
      .limit(200);

    // counts
    const { count } = await supabase
      .from("bulk_job_items")
      .select("id", { count: "exact", head: true })
      .eq("bulk_job_id", id);

    return res.status(200).json({ ok: true, job, items: samples ?? [], total: count ?? 0 });
  }

  if (req.method === "POST") {
    const body = req.body ?? {};
    if (body.op === "cancel") {
      const { error: upd1 } = await supabase.from("bulk_jobs").update({ status: "cancelled" }).eq("id", id);
      const { error: upd2 } = await supabase
        .from("bulk_job_items")
        .update({ status: "cancelled", finished_at: new Date().toISOString() })
        .eq("bulk_job_id", id)
        .eq("status", "queued");
      if (upd1 || upd2) {
        return res.status(500).json({ ok: false, error: "cancel_failed", details: { upd1: upd1?.message, upd2: upd2?.message } });
      }
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ ok: false, error: "unsupported_op" });
  }

  res.setHeader("Allow", "GET,POST");
  res.status(405).end();
}
