import type { NextApiRequest, NextApiResponse } from "next";
import { getServiceSupabaseClient } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getServiceSupabaseClient();
  const { id } = req.query as { id?: string };
  const limit = Math.min(500, parseInt(String(req.query.limit ?? "200"), 10));
  const offset = parseInt(String(req.query.offset ?? "0"), 10);

  if (!id) return res.status(400).json({ ok: false, error: "id_required" });

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("bulk_job_items")
      .select("*")
      .eq("bulk_job_id", id)
      .order("item_index", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, items: data ?? [] });
  }

  res.setHeader("Allow", "GET");
  res.status(405).end();
}
