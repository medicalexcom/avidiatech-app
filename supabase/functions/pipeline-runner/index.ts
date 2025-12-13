import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "missing_authorization" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const { pipelineRunId } = await req.json().catch(() => ({}));
    if (!pipelineRunId) {
      return new Response(JSON.stringify({ error: "missing_pipelineRunId" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Minimal status bump so you can see it moving.
    await supabase.from("pipeline_runs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", pipelineRunId);
    await supabase.from("pipeline_runs").update({ status: "succeeded", finished_at: new Date().toISOString() }).eq("id", pipelineRunId);

    return new Response(JSON.stringify({ ok: true, pipelineRunId }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "unexpected", details: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
